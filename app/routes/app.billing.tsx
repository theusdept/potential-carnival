import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
export async function loader({ request }: LoaderFunctionArgs) { await authenticate.admin(request); return null; }
export default function Billing() {
  return <s-page heading="Subscription"><s-section>
    <s-paragraph>ReturnGuard uses Shopify App Pricing. Choose and manage plans in Shopify when the public app is configured.</s-paragraph>
    <s-paragraph>Plans: Starter $19/month, Growth $49/month, Pro $99/month. No charges are initiated by this page.</s-paragraph>
  </s-section></s-page>;
}
