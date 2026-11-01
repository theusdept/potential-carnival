import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { z } from "zod";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { getActivePlan } from "../services/billing.server";
import { makeClaimToken, hashClaimToken, orderGidSchema, validTransition } from "../domain/claims";

const decisionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "RESOLVED"]),
});
const orderSchema = z.object({ orderId: orderGidSchema });
type OrderQuery = {
  data?: {
    shop?: { id: string };
    order?: { id: string; name: string; createdAt: string; customer?: { id: string } | null } | null;
  };
  errors?: Array<{ message: string }>;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const claims = await db.claim.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return { claims };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const form = Object.fromEntries(await request.formData());
  if (form.intent === "invite") {
    const parsed = orderSchema.safeParse(form);
    if (!parsed.success) return Response.json({ error: "Provide a valid Shopify order GID." }, { status: 400 });
    const result = await admin.graphql(
      `query ReturnGuardOrder($id: ID!) {
        shop { id }
        order(id: $id) { id name createdAt customer { id } }
      }`,
      { variables: { id: parsed.data.orderId } },
    );
    const payload = await result.json() as OrderQuery;
    const order = payload.data?.order;
    const shopId = payload.data?.shop?.id;
    if (payload.errors?.length || !shopId) return Response.json({ error: "Unable to verify the order." }, { status: 502 });
    if (!order || !order.customer?.id) return Response.json({ error: "Order or associated customer not found." }, { status: 404 });
    const createdAt = new Date(order.createdAt);
    if (!Number.isFinite(createdAt.getTime())) return Response.json({ error: "Invalid order date." }, { status: 502 });
    let active: Awaited<ReturnType<typeof getActivePlan>>;
    try {
      active = await getActivePlan(shopId);
    } catch {
      return Response.json({ error: "Subscription verification unavailable. Try again." }, { status: 503 });
    }
    if (!active) return Response.json({ error: "Select an active ReturnGuard plan before creating invitations." }, { status: 402 });
    await db.shopSettings.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, shopId },
      update: { shopId },
    });
    const token = makeClaimToken();
    await db.claimInvite.create({
      data: {
        shop: session.shop,
        orderId: order.id,
        orderName: order.name,
        orderCreatedAt: createdAt,
        customerId: order.customer.id,
        tokenHash: hashClaimToken(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    const appUrl = process.env.SHOPIFY_APP_URL || "";
    if (!/^https:\/\//.test(appUrl)) return Response.json({ error: "Application URL is not configured for HTTPS." }, { status: 503 });
    return { link: new URL(`/claim/${token}`, appUrl).toString(), error: null };
  }
  if (form.intent === "decision") {
    const parsed = decisionSchema.safeParse(form);
    if (!parsed.success) return Response.json({ error: "Invalid decision." }, { status: 400 });
    const { id, status } = parsed.data;
    const updated = await db.$transaction(async (tx) => {
      const claim = await tx.claim.findFirst({ where: { id, shop: session.shop } });
      if (!claim || !validTransition(claim.status, status)) return false;
      const change = await tx.claim.updateMany({
        where: { id, shop: session.shop, status: claim.status },
        data: { status },
      });
      if (!change.count) return false;
      await tx.claimEvent.create({ data: { claimId: id, action: status } });
      return true;
    });
    return updated ? { success: "Claim updated.", error: null } : Response.json({ error: "Claim changed or transition is not allowed." }, { status: 409 });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}

export default function Claims() {
  const { claims } = useLoaderData<typeof loader>();
  const action = useActionData<typeof action>();
  return <s-page heading="ReturnGuard claims">
    <s-section heading="Send a secure claim invitation">
      <s-paragraph>Look up an order GID in the Shopify admin. Each generated link expires after seven days and is redeemable once. Share it only with the order customer.</s-paragraph>
      <Form method="post">
        <input type="hidden" name="intent" value="invite" />
        <label htmlFor="orderId">Order GID</label>{" "}
        <input id="orderId" name="orderId" required placeholder="gid://shopify/Order/123456789" style={{minWidth:320}} />
        <button type="submit">Generate secure link</button>
      </Form>
      {action && "link" in action && typeof action.link === "string" && <p>One-time customer link: <input readOnly aria-label="Secure customer link" value={action.link} style={{width:"90%"}} /></p>}
      {action && "error" in action && action.error && <p role="alert">{action.error}</p>}
    </s-section>
    <s-section heading="Claim review queue">
      <table>
        <thead><tr><th>Order</th><th>Type</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{claims.map((claim) => <tr key={claim.id}>
          <td>{claim.orderName || claim.orderId}</td>
          <td>{claim.type}</td><td>{claim.reason}</td><td>{claim.status}</td>
          <td>{(claim.status === "PENDING" || claim.status === "APPROVED") && <Form method="post">
            <input type="hidden" name="intent" value="decision" />
            <input type="hidden" name="id" value={claim.id} />
            {claim.status === "PENDING" && <>
              <button type="submit" name="status" value="APPROVED">Approve</button>{" "}
              <button type="submit" name="status" value="REJECTED">Reject</button>
            </>}
            {claim.status === "APPROVED" && <button type="submit" name="status" value="RESOLVED">Resolve</button>}
          </Form>}</td>
        </tr>)}</tbody>
      </table>
      {claims.length === 0 && <s-paragraph>No claims yet.</s-paragraph>}
    </s-section>
  </s-page>;
}
