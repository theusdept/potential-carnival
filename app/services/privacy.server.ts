import { z } from "zod";
import { db } from "../db.server";
import { deleteEvidence } from "./evidence.server";

const payloadSchema = z.object({
  customer: z.object({
    id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
    email: z.email().optional().nullable(),
  }).optional(),
});
export function parseCustomerPayload(payload: unknown) {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.customer) return null;
  const id = String(parsed.data.customer.id);
  return { customerId: `gid://shopify/Customer/${id}`, email: parsed.data.customer.email ?? null };
}

async function deleteObjects(keys: string[]) {
  for (const key of keys) await deleteEvidence(key);
}

export async function eraseCustomer(shop: string, customerId: string) {
  const claims = await db.claim.findMany({
    where: { shop, customerId },
    include: { evidence: true },
  });
  await deleteObjects(claims.flatMap(c => c.evidence.map(e => e.objectKey)));
  await db.$transaction(async tx => {
    await tx.claim.deleteMany({ where: { shop, customerId } });
    await tx.claimInvite.deleteMany({ where: { shop, customerId } });
  });
}

export async function eraseShop(shop: string) {
  const evidence = await db.evidence.findMany({ where: { claim: { shop } } });
  await deleteObjects(evidence.map(e => e.objectKey));
  await db.$transaction(async tx => {
    await tx.claim.deleteMany({ where: { shop } });
    await tx.claimInvite.deleteMany({ where: { shop } });
    await tx.session.deleteMany({ where: { shop } });
    await tx.shopSettings.deleteMany({ where: { shop } });
    await tx.shopUsage.deleteMany({ where: { shop } });
    await tx.privacyRequest.deleteMany({ where: { shop } });
  });
}

export async function exportCustomerData(shop: string, customerId: string) {
  const claims = await db.claim.findMany({
    where: { shop, customerId },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      evidence: { select: { id: true, contentType: true, bytes: true, createdAt: true } },
    },
  });
  return {
    generatedAt: new Date().toISOString(),
    shop,
    customerId,
    claims: claims.map(c => ({
      id: c.id, orderId: c.orderId, type: c.type, reason: c.reason,
      status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt,
      events: c.events.map(e => ({ action: e.action, createdAt: e.createdAt })),
      evidence: c.evidence,
    })),
  };
}

export async function shopContactEmail(shop: string) {
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) throw new Error("Invalid shop domain");
  const session = await db.session.findFirst({ where: { shop, isOnline: false } });
  if (!session) throw new Error("Store no longer has an offline session");
  const response = await fetch(`https://${shop}/admin/api/2026-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": session.accessToken,
    },
    body: JSON.stringify({ query: "{ shop { email } }" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Could not retrieve merchant contact email");
  const data = await response.json() as {
    data?: { shop?: { email?: string } };
    errors?: Array<{ message: string }>;
  };
  const email = data.data?.shop?.email;
  if (data.errors?.length || !email || !z.email().safeParse(email).success) {
    throw new Error("Merchant contact email is unavailable");
  }
  return email;
}

export async function deliverDataExport(email: string, exportData: unknown) {
  const token = process.env.RESEND_API_KEY;
  const from = process.env.PRIVACY_FROM_EMAIL;
  if (!token || !from) throw new Error("Privacy export email provider is not configured");
  const json = JSON.stringify(exportData, null, 2);
  if (json.length > 1024 * 1024) throw new Error("Privacy export exceeds email attachment limit");
  const attachment = Buffer.from(json).toString("base64");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      from, to: [email], subject: "Your ReturnGuard data export",
      text: "Attached is your requested ReturnGuard claim history. This export contains personal information; store it securely.",
      attachments: [{ filename: "returnguard-data.json", content: attachment }],
    }),
  });
  if (!response.ok) throw new Error(`Privacy export email failed: HTTP ${response.status}`);
}

export async function recordPrivacyRequest(id: string, shop: string, topic: string, customerId?: string) {
  const request = await db.privacyRequest.upsert({
    where: { id },
    create: { id, shop, topic, customerId },
    update: {},
  });
  return request.status === "DONE";
}
export async function completePrivacyRequest(id: string) {
  await db.privacyRequest.update({ where: { id }, data: { status: "DONE", processedAt: new Date(), error: null } });
}
