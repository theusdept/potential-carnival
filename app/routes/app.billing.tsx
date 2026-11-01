import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getActivePlan, planSelectionUrl } from "../services/billing.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  let state: "active" | "inactive" | "unavailable" = "unavailable";
  let plan: string | null = null;
  try {
    const response = await admin.graphql("{ shop { id } }");
    const payload = await response.json() as { data?: { shop?: { id?: string } } };
    if (payload.data?.shop?.id) {
      const active = await getActivePlan(payload.data.shop.id);
      state = active ? "active" : "inactive";
      plan = active?.plan || null;
    }
  } catch { state = "unavailable"; }
  return { state, plan, canChoose: !!planSelectionUrl(session.shop) };
}
export async function action({ request }: ActionFunctionArgs) {
  const { redirect, session } = await authenticate.admin(request);
  const destination = planSelectionUrl(session.shop);
  if (!destination) throw new Response("Shopify App Pricing is not configured", { status: 503 });
  return redirect(destination, { target: "_top" });
}
export default function Billing() {
  const { state, plan, canChoose } = useLoaderData<typeof loader>();
  return <s-page heading="ReturnGuard subscription">
    <s-section>
      <s-paragraph>Subscription verification: {state === "active" ? `Active — ${plan}` : state === "inactive" ? "No active plan" : "Not available"}</s-paragraph>
      <s-paragraph>Monthly plans: Starter $19 (50 claims), Growth $49 (250 claims), Pro $99 (1000 claims). Pricing and billing are managed directly by Shopify.</s-paragraph>
      {canChoose && <Form method="post"><button type="submit">Choose or manage a plan in Shopify</button></Form>}
      {!canChoose && <s-paragraph>Pricing becomes available after the public app's Shopify handle and plans are configured.</s-paragraph>}
    </s-section>
  </s-page>;
}
