import { useLoaderData } from "react-router";
export function loader() { return { company: process.env.LEGAL_OPERATOR_NAME || "ReturnGuard (operator not configured)", email: process.env.SUPPORT_EMAIL || "Support contact pending configuration" }; }
export function meta() { return [{ title: "Terms of Service | ReturnGuard" }]; }
export default function Terms() {
  const { company, email } = useLoaderData<typeof loader>();
  return <main style={{maxWidth:800,margin:"40px auto",padding:24,fontFamily:"system-ui",lineHeight:1.6}}>
    <h1>ReturnGuard Terms of Service</h1>
    <p>Last updated November 1, 2026. Service operator: {company}. Contact: {email}.</p>
    <h2>Service</h2>
    <p>ReturnGuard provides Shopify merchants with software for collecting, reviewing and managing requests for returns, damage reports and warranty issues. ReturnGuard does not independently authorize a refund, process a payment to a customer or make a legal determination of warranty coverage.</p>
    <h2>Merchant responsibilities</h2>
    <p>Merchants are responsible for their store policies, compliance with applicable consumer law, customer communications and carrying out approved refunds or returns. Merchants must provide customers accurate claim invitations and avoid uploading unlawful or sensitive material unrelated to an order.</p>
    <h2>Billing</h2>
    <p>Merchant subscriptions are billed by Shopify on the plan chosen in Shopify App Pricing. Prices, renewal and cancellation terms appear before approval in Shopify. Uninstalling the app and changing plans are subject to Shopify billing rules. All applicable statutory refund rights remain intact.</p>
    <h2>Availability and limitations</h2>
    <p>The service may depend on Shopify, network services and storage providers. We may suspend service for security, fraud or maintenance. To the extent permitted by law, the service is provided without warranties of uninterrupted availability, and neither this software nor its automated eligibility checks replace legal advice.</p>
    <h2>Data</h2>
    <p>We process information according to our Privacy Policy and the merchant's instructions where applicable. Merchants must have an appropriate legal basis for processing customer data and distributing secure claim invitations.</p>
    <h2>Changes and contact</h2>
    <p>Material changes will be published with an updated date. Contact {email} for support or legal notices.</p>
  </main>;
}
