import { useLoaderData } from "react-router";
export function loader() { return { company: process.env.LEGAL_OPERATOR_NAME || "ReturnGuard (operator not configured)", email: process.env.SUPPORT_EMAIL || "Support contact pending configuration" }; }
export function meta() { return [{ title: "Privacy Policy | ReturnGuard" }]; }
export default function Privacy() {
  const { company, email } = useLoaderData<typeof loader>();
  return <main style={{maxWidth:800,margin:"40px auto",padding:24,fontFamily:"system-ui",lineHeight:1.6}}>
    <h1>ReturnGuard Privacy Policy</h1>
    <p>Last updated November 1, 2026. Operator: {company}. Contact: {email}.</p>
    <h2>What we collect</h2>
    <p>When a merchant installs ReturnGuard, we process Shopify shop identifiers, session credentials needed for secure access, app subscriptions, claim policy settings, claim data and actions taken by merchant staff. When a customer submits a claim, we process order identifiers, customer identifiers associated with the order, reasons for return or warranty requests, and optional photographs uploaded to support the request.</p>
    <h2>Why we process data</h2>
    <p>We use this information only to validate claims, manage merchant subscriptions and entitlements, let merchants review requests and evidence, prevent abuse, provide support and comply with legal requests. We do not use claim evidence for advertising or sell customer data.</p>
    <h2>Who receives information</h2>
    <p>Information is made available to the Shopify merchant operating the store. Hosting and storage infrastructure and email delivery providers process information on our behalf. Subscription and billing details are processed by Shopify under its agreements. We limit provider access to operational needs.</p>
    <h2>Security and retention</h2>
    <p>We authenticate Shopify admin and webhook requests and use private evidence storage with time-limited download links. Claim links are unique and expire after seven days or one submission. Uploaded files are restricted to supported image formats and size limits. We retain data while necessary to operate the merchant account or meet legal obligations and delete Shopify-related records after uninstallation and verified erasure requests, subject to legally required exceptions. Backups may be retained under infrastructure recovery procedures for a limited period.</p>
    <h2>Customer and merchant rights</h2>
    <p>Customers should contact the merchant who sold the product about a claim or to request access, correction or deletion of their information. Merchants can use Shopify privacy procedures or contact ReturnGuard support. Applicable privacy law may provide additional rights and exceptions.</p>
    <h2>Cross-border processing and updates</h2>
    <p>Service providers may process data in jurisdictions different from yours. We apply contractual and technical safeguards as appropriate. We may update this notice as the service changes; material updates will be published here.</p>
  </main>;
}
