# ReturnGuard deployment runbook

## Verified source
GitHub CI runs PostgreSQL 16, schema validation, Prisma migration deployment, TypeScript, unit/integration tests and React Router production build. The successful branch build is not an installation test.

## 1 — Shopify Dev Dashboard
Create a **public** ReturnGuard app, and select the appropriate distribution route. Obtain its Client ID and Client Secret in the Dev Dashboard. Do not paste the Client Secret into a chat; put it directly into Railway deployment variables.
Set Shopify App Pricing handles **starter / growth / pro** with monthly charges $19/$49/$99 and managed quotas 50/250/1000.
Create a Partner API client with **Manage apps** permission. The env variable called SHOPIFY_PARTNER_ORG_ID is the numeric **Partner ID in the Partners Dashboard URL**, not the Dev Dashboard organization ID.
Request protected customer data access for order/customer IDs. Consider read_all_orders approval if supporting warranty claims older than 60 days.

## 2 — Shopify configuration
Copy `shopify.app.toml.example` to `shopify.app.toml`. Set `client_id`, `application_url`, `handle`, scopes, redirect URLs and all webhook URIs matching your HTTPS domain. Run Shopify CLI app config link and deploy while authenticated to the correct Dev Dashboard account.
Privacy webhooks must be signed and return 401 when HMAC is invalid.

## 3 — Railway
Private project `returnguard` has staging changes for a Postgres template, a private bucket and `returnguard-web` from `theusdept/potential-carnival` branch `main`.
The changes are STAGED, not deployed. Set these missing deployment variables: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL, SHOPIFY_APP_GID, SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_API_ACCESS_TOKEN, RESEND_API_KEY, PRIVACY_FROM_EMAIL, LEGAL_OPERATOR_NAME and SUPPORT_EMAIL.
Use references for DATABASE_URL and bucket credentials. Do not put them in the repository. Configure the endpoint URL style from the bucket's Credentials tab. The app requires `/health` to return HTTP 200 to be considered ready.
After credentials are configured and Shopify app URL points at the Railway HTTPS domain, commit the staged Railway infrastructure changes. Doing so starts the database, bucket and app deployment and may incur Railway charges.

## 4 — Development-store acceptance test
Use a development store owned or authorized by you:
1. Install the public app and complete Shopify embedded OAuth.
2. Confirm app opens via the Shopify admin and customer-data permissions permit order lookup.
3. Configure a no-charge test plan in the Shopify Dev Dashboard. Confirm Partner API returns a live test entitlement.
4. Generate an invitation for a real test order by `#order-number`. Verify it expires and is redeemable once.
5. Submit return/damage/warranty claims with and without evidence. Verify private S3 writes and 60-second downloads.
6. Approve, reject and resolve claims; confirm action log and per-shop isolation.
7. Verify quota enforcement at each plan boundary and after plan changes.
8. Trigger invalid-HMAC and valid Shopify compliance webhooks, customer data export and redact, shop redact and uninstall cleanup. Verify email delivery to the merchant from a verified sender.
9. Verify incorrect origins, invalid tokens, oversized uploads, missing plans and failed storage operations fail closed.
10. Recheck `/health`, CI, logs, dependency vulnerabilities and backup/restore procedures.

## 5 — App Store release
Ensure public Privacy/Terms identify the legal operator and a working support email, set required emergency developer contact, complete Shopify Protected Customer Data review and submit listing/assets for Shopify App Store review. Only enable paid marketing and live merchants after approval.
