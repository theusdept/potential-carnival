import { Link } from "react-router";
export function meta() { return [{title:"ReturnGuard | Returns, Damage & Warranty Claims for Shopify"}]; }
export default function Index() { return <main style={{maxWidth:960,margin:"32px auto",padding:24,fontFamily:"system-ui",lineHeight:1.5}}>
  <header><strong>ReturnGuard</strong><nav aria-label="Public navigation" style={{float:"right"}}>
    <Link to="/auth/login">Merchant sign in</Link></nav></header>
  <section style={{padding:"64px 0 32px"}}><h1 style={{fontSize:"clamp(32px,5vw,58px)",marginBottom:12}}>Take control of returns and warranty claims.</h1>
    <p style={{fontSize:20,maxWidth:660}}>Give customers a secure claim form and your support team one place to review requests, photos, and decisions.</p>
    <Link to="/auth/login">Open merchant installation</Link></section>
  <section><h2>Built for Shopify merchants</h2>
    <p><strong>Verified orders.</strong> Generate a one-time customer claim link after validating an order in Shopify.</p>
    <p><strong>Evidence collection.</strong> Attach optional photos stored privately, with short-lived authenticated access.</p>
    <p><strong>Policy controls.</strong> Set claim windows for returns, damaged items and warranty requests.</p>
    <p><strong>Merchant review.</strong> Approve, reject and resolve claims, with status changes recorded.</p>
    <p><strong>Shopify App Pricing.</strong> Subscription plans and payment approval are handled by Shopify.</p>
  </section>
  <section><h2>Monthly plans</h2><p>Starter: $19 / 50 claims. Growth: $49 / 250 claims. Pro: $99 / 1,000 claims.</p><p>Plans become available after the Shopify public app is approved and configured.</p></section>
  <footer><Link to="/privacy">Privacy policy</Link>{" | "}<Link to="/terms">Terms of service</Link></footer>
</main>; }
