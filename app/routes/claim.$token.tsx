import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { db } from "../db.server";
import {
  claimSubmissionSchema, hashClaimToken, planLimits, withinReturnWindow,
  MAX_EVIDENCE_BYTES,
} from "../domain/claims";
import { getActivePlan } from "../services/billing.server";
import { uploadEvidence, deleteEvidence } from "../services/evidence.server";

const maxBodyBytes = MAX_EVIDENCE_BYTES + 96 * 1024;
const genericFailure = "This secure claim link is invalid, expired, or already used.";
class ClaimSubmissionError extends Error {}

async function boundedFormData(request: Request) {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > maxBodyBytes) throw new ClaimSubmissionError("The upload is too large.");
  if (!request.body) throw new ClaimSubmissionError("Missing request body.");
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBodyBytes) throw new ClaimSubmissionError("The upload is too large.");
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, { method: "POST", headers, body: bytes }).formData();
}

export async function loader({ params }: LoaderFunctionArgs) {
  const token = params.token ?? "";
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new Response(genericFailure, { status: 410 });
  const invite = await db.claimInvite.findUnique({
    where: { tokenHash: hashClaimToken(token) },
  });
  if (!invite || invite.usedAt || invite.expiresAt <= new Date()) {
    throw new Response(genericFailure, { status: 410 });
  }
  return { orderName: invite.orderName || "your order", expires: invite.expiresAt.toISOString() };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const token = params.token ?? "";
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return Response.json({ error: genericFailure }, { status: 410 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(process.env.SHOPIFY_APP_URL || "https://example.com").origin) {
    return Response.json({ error: "Cross-origin submission blocked." }, { status: 403 });
  }
  const invite = await db.claimInvite.findUnique({
    where: { tokenHash: hashClaimToken(token) },
  });
  const now = new Date();
  if (!invite || invite.usedAt || invite.expiresAt <= now) return Response.json({ error: genericFailure }, { status: 410 });

  let form: FormData;
  try { form = await boundedFormData(request); }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid upload." }, { status: 413 });
  }
  const submitted = claimSubmissionSchema.safeParse({
    type: form.get("type"),
    reason: form.get("reason"),
  });
  if (!submitted.success) return Response.json({ error: "Select a type and enter a reason of 10–2000 characters." }, { status: 400 });

  const settings = await db.shopSettings.findUnique({ where: { shop: invite.shop } });
  const windowDays = submitted.data.type === "WARRANTY"
    ? (settings?.warrantyWindowDays ?? 365)
    : (settings?.returnWindowDays ?? 30);
  if (!withinReturnWindow(invite.orderCreatedAt, now, windowDays)) {
    return Response.json({ error: "This order is outside the store's claim window." }, { status: 422 });
  }
  if (!settings?.shopId) return Response.json({ error: "The store is not configured for claims." }, { status: 503 });

  let active: Awaited<ReturnType<typeof getActivePlan>>;
  try { active = await getActivePlan(settings.shopId); }
  catch { return Response.json({ error: "Subscription verification is temporarily unavailable." }, { status: 503 }); }
  if (!active) return Response.json({ error: "The store's ReturnGuard subscription is inactive." }, { status: 403 });

  let evidence: Awaited<ReturnType<typeof uploadEvidence>> | null = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_EVIDENCE_BYTES) return Response.json({ error: "Photos must be 5 MB or smaller." }, { status: 413 });
    try { evidence = await uploadEvidence(invite.shop, new Uint8Array(await photo.arrayBuffer())); }
    catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Could not attach photo." }, { status: 503 });
    }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.shopUsage.upsert({
        where: { shop_windowStart: { shop: invite.shop, windowStart: active.cycleStart } },
        create: { shop: invite.shop, windowStart: active.cycleStart, count: 0 },
        update: {},
      });
      const quota = await tx.shopUsage.updateMany({
        where: { shop: invite.shop, windowStart: active.cycleStart, count: { lt: planLimits[active.plan] } },
        data: { count: { increment: 1 } },
      });
      if (quota.count !== 1) throw new ClaimSubmissionError("The store has reached its plan's claim limit.");
      const consumed = await tx.claimInvite.updateMany({
        where: { id: invite.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw new ClaimSubmissionError(genericFailure);
      const claim = await tx.claim.create({
        data: {
          shop: invite.shop, orderId: invite.orderId, orderName: invite.orderName,
          customerId: invite.customerId, inviteId: invite.id,
          type: submitted.data.type, reason: submitted.data.reason,
        },
      });
      await tx.claimEvent.create({ data: { claimId: claim.id, action: "SUBMITTED" } });
      if (evidence) await tx.evidence.create({
        data: { claimId: claim.id, ...evidence },
      });
    });
  } catch (error) {
    if (evidence) await deleteEvidence(evidence.objectKey).catch(console.error);
    return Response.json({
      error: error instanceof ClaimSubmissionError ? error.message : "Could not submit claim. Please retry.",
    }, { status: 409 });
  }
  return { success: true };
}

export const headers: HeadersFunction = () => ({
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
});

export default function ClaimPage() {
  const data = useLoaderData<typeof loader>();
  const actionResult = useActionData<typeof action>();
  return <main style={{maxWidth:720,margin:"40px auto",padding:24,fontFamily:"system-ui"}}>
    <h1>ReturnGuard claim request</h1>
    <p>Order: {data.orderName}</p>
    {"success" in (actionResult ?? {}) && actionResult?.success ? <p role="status">Your claim has been submitted for merchant review.</p> :
      <Form method="post" encType="multipart/form-data">
        <p><label htmlFor="type">Claim type</label>{" "}
          <select name="type" id="type" required>
            <option value="RETURN">Return</option><option value="DAMAGE">Damaged item</option>
            <option value="WARRANTY">Warranty issue</option>
          </select></p>
        <p><label htmlFor="reason">Reason</label><br/>
          <textarea id="reason" name="reason" minLength={10} maxLength={2000} required rows={5} style={{width:"100%"}} /></p>
        <p><label htmlFor="photo">Optional evidence photo (JPEG/PNG/WebP, maximum 5 MB)</label><br/>
          <input id="photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></p>
        <button type="submit">Submit claim</button>
        {actionResult && "error" in actionResult && typeof actionResult.error === "string" && <p role="alert">{actionResult.error}</p>}
      </Form>}
  </main>;
}
