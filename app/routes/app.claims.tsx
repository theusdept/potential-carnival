import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { z } from "zod";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { getActivePlan } from "../services/billing.server";
import { makeClaimToken, hashClaimToken, orderGidSchema, validTransition, withinReturnWindow } from "../domain/claims";

const decisionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "RESOLVED"]),
});
const orderSchema = z.object({
  orderRef: z.union([orderGidSchema, z.string().regex(/^#?[1-9]\d{0,11}$/)]),
});
type Order = { id: string; name: string; createdAt: string; customer?: { id: string } | null };
type OrderQuery = {
  data?: { shop?: { id: string }; order?: Order | null; orders?: { nodes: Order[] } };
  errors?: Array<{ message: string }>;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  return { claims: await db.claim.findMany({
    where: { shop: session.shop },
    include: { evidence: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  }) };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const form = Object.fromEntries(await request.formData());
  if (form.intent === "invite") {
    const parsed = orderSchema.safeParse(form);
    if (!parsed.success) return Response.json({ error: "Enter a Shopify order number (#1001) or full order GID." }, { status: 400 });
    const appUrl = process.env.SHOPIFY_APP_URL || "";
    let origin: URL;
    try { origin = new URL(appUrl); } catch { return Response.json({ error: "The application URL is not configured." }, { status: 503 }); }
    if (origin.protocol !== "https:" || origin.username || origin.password) {
      return Response.json({ error: "A secure HTTPS application URL is required." }, { status: 503 });
    }
    const isGid = orderGidSchema.safeParse(parsed.data.orderRef).success;
    const orderNum = isGid ? "" : "#" + parsed.data.orderRef.replace(/^#/, "");
    const query = isGid
      ? "query ReturnGuardOrder($id: ID!) { shop { id } order(id: $id) { id name createdAt customer { id } } }"
      : "query ReturnGuardOrders($name: String!) { shop { id } orders(first: 10, query: $name) { nodes { id name createdAt customer { id } } } }";
    let payload: OrderQuery;
    try {
      const response = await admin.graphql(query, { variables: isGid
        ? { id: parsed.data.orderRef }
        : { name: "name:" + orderNum } });
      payload = await response.json() as OrderQuery;
    } catch {
      return Response.json({ error: "Shopify order lookup is temporarily unavailable." }, { status: 502 });
    }
    const shopId = payload.data?.shop?.id;
    const order = isGid ? payload.data?.order :
      payload.data?.orders?.nodes.find(node => node.name === orderNum);
    if (payload.errors?.length || !shopId) return Response.json({ error: "Shopify could not verify this order." }, { status: 502 });
    if (!order || !order.customer?.id) {
      return Response.json({ error: "Order or associated customer not found; check Shopify order permissions." }, { status: 404 });
    }
    const createdAt = new Date(order.createdAt);
    if (!Number.isFinite(createdAt.getTime())) return Response.json({ error: "Invalid Shopify order date." }, { status: 502 });
    let active: Awaited<ReturnType<typeof getActivePlan>>;
    try { active = await getActivePlan(shopId); }
    catch { return Response.json({ error: "Subscription verification unavailable. Try again." }, { status: 503 }); }
    if (!active) return Response.json({ error: "Choose an active ReturnGuard plan before creating invitations." }, { status: 402 });
    const settings = await db.shopSettings.findUnique({ where: { shop: session.shop } });
    if (!withinReturnWindow(createdAt, new Date(), settings?.returnWindowDays ?? 30) &&
        !withinReturnWindow(createdAt, new Date(), settings?.warrantyWindowDays ?? 365)) {
      return Response.json({ error: "This order is outside both claim windows." }, { status: 422 });
    }
    await db.shopSettings.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, shopId },
      update: { shopId },
    });
    const token = makeClaimToken();
    await db.claimInvite.create({
      data: {
        shop: session.shop, orderId: order.id, orderName: order.name,
        orderCreatedAt: createdAt, customerId: order.customer.id,
        tokenHash: hashClaimToken(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    return { link: new URL("/claim/" + token, origin).toString(), error: null };
  }
  if (form.intent === "decision") {
    const parsed = decisionSchema.safeParse(form);
    if (!parsed.success) return Response.json({ error: "Invalid decision." }, { status: 400 });
    const { id, status } = parsed.data;
    const updated = await db.$transaction(async tx => {
      const claim = await tx.claim.findFirst({ where: { id, shop: session.shop } });
      if (!claim || !validTransition(claim.status, status)) return false;
      const change = await tx.claim.updateMany({
        where: { id, shop: session.shop, status: claim.status }, data: { status },
      });
      if (!change.count) return false;
      await tx.claimEvent.create({ data: { claimId: id, action: status } });
      return true;
    });
    return updated
      ? { success: "Claim updated.", error: null }
      : Response.json({ error: "Claim changed or transition is not permitted." }, { status: 409 });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}

export default function Claims() {
  const { claims } = useLoaderData<typeof loader>();
  const actionResult = useActionData<typeof action>();
  return <s-page heading="ReturnGuard claims">
    <s-section heading="Send a secure claim invitation">
      <s-paragraph>Find a Shopify order by number and generate a seven-day, one-time claim form. Only share the link with the associated customer.</s-paragraph>
      <Form method="post">
        <input type="hidden" name="intent" value="invite" />
        <label htmlFor="orderRef">Order number or GID</label>{" "}
        <input id="orderRef" name="orderRef" required placeholder="#1001" style={{ minWidth: 240 }} />
        <button type="submit">Generate customer link</button>
      </Form>
      {actionResult && "link" in actionResult && typeof actionResult.link === "string" &&
        <p>Secure customer link: <input readOnly aria-label="Customer link" value={actionResult.link} style={{ width: "90%" }} /></p>}
      {actionResult && "error" in actionResult && typeof actionResult.error === "string" &&
        <p role="alert">{actionResult.error}</p>}
    </s-section>
    <s-section heading="Claims for review">
      <table>
        <thead><tr><th>Order</th><th>Type</th><th>Reason</th><th>Status</th><th>Evidence</th><th>Decision</th></tr></thead>
        <tbody>{claims.map(claim => <tr key={claim.id}>
          <td>{claim.orderName || claim.orderId}</td>
          <td>{claim.type}</td><td>{claim.reason}</td><td>{claim.status}</td>
          <td>{claim.evidence.map((e, i) =>
            <span key={e.id}><Link to={"/app/evidence/" + e.id} target="_blank" rel="noreferrer">Photo {i + 1}</Link>{" "}</span>)}</td>
          <td>{(claim.status === "PENDING" || claim.status === "APPROVED") &&
            <Form method="post">
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
