# ReturnGuard — Shopify returns, damage and warranty claims

ReturnGuard is a multi-merchant Shopify embedded app built with React Router, TypeScript, Prisma and PostgreSQL. It provides merchant-verified customer claim invitations, a one-use customer claim form, optional photo evidence, policy controls, a merchant review queue, Shopify App Pricing verification and Shopify privacy webhook handlers.

**Deployment stage:** CI-verified source code, pending Shopify public app registration and live integration tests. Do not advertise it as live or enable paid merchant installs until all external launch gates pass.

## Included
- Shopify OAuth and embedded merchant admin shell, authenticated by Shopify's React Router framework.
- Shopify Admin GraphQL order lookup by order number or global ID, with server-side verification.
- 256-bit random customer invitation token. Only its SHA-256 digest is stored; 7-day expiry and atomic one-use redemption.
- Customer return, damage or warranty claim form with a 2,000-character reason and optional 5 MB JPEG/PNG/WebP attachment.
- S3-compatible private evidence storage with SigV4 authentication, virtual-hosted or path-style URLs and 60-second authenticated download links.
- Merchant-specific claims, approve/reject/resolve transitions and audit events.
- Return and warranty eligibility windows under merchant control.
- Shopify App Pricing Partner API subscription verification; starter / growth / pro plan limits enforced by transactional monthly counters.
- Mandatory Shopify customer data request, customer redaction and shop redaction endpoints, plus uninstall cleanup.
- Public privacy and terms pages and an HTTPS/dependency readiness endpoint.
- Unit, PostgreSQL integration and storage-signature tests in GitHub Actions.

## Subscription plan handles

Configure these **exact** Shopify App Pricing subscription handles in your public Shopify app:

| Handle | Monthly USD | Claims per subscription cycle |
| --- | ---: | ---: |
| `starter` | 19 | 50 |
| `growth` | 49 | 250 |
| `pro` | 99 | 1000 |

Shopify collects payments; the app confirms entitlements via Partner API. No custom checkout, Stripe billing or direct card collection is implemented. Do not create paid plans until the test store validates installation, cancellation and upgrades.

## Development

Requirements: Node.js >=22.12, PostgreSQL, Shopify CLI and a Shopify development app.

```sh
npm install --legacy-peer-deps
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm test
npm run typecheck
npm run build
npm run dev
```

Populate `.env` locally and **never commit it**. Build and CI use placeholder app credentials but runtime Shopify APIs require real credentials.

## Production configuration

Set secrets in Railway, not GitHub:

- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SHOPIFY_APP_HANDLE`
- `SHOPIFY_APP_GID`, `SHOPIFY_PARTNER_ORG_ID` (numeric Partner Dashboard **Partner ID**), `SHOPIFY_PARTNER_API_ACCESS_TOKEN`
- `DATABASE_URL`, `SCOPES=read_orders`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION=auto`, `S3_URL_STYLE=virtual`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `RESEND_API_KEY`, `PRIVACY_FROM_EMAIL`, `LEGAL_OPERATOR_NAME`, `SUPPORT_EMAIL`

Shopify's public app needs appropriate protected customer-data permission for access to order/customer IDs. An additional scope and Shopify approval may be required if warranty claims span orders older than the default order-access window.

## Source and infrastructure

- Source: https://github.com/theusdept/potential-carnival
- CI: https://github.com/theusdept/potential-carnival/actions
- Railway project: `returnguard`, in `theusdept's Projects`.
- Staging app, PostgreSQL and private evidence bucket are **staged only**. No deployed merchant-facing service yet.

## Release gates

See [Deployment](docs/DEPLOYMENT.md) and [Launch checklist](docs/LAUNCH_CHECKLIST.md). External dependencies include creation of the Shopify public app, its pricing plans, Partner API access token, live service credentials, verified support/operator contact details, authenticated development-store smoke tests, Shopify privacy webhook tests, Shopify security review and App Store submission. A green CI build alone is not a Shopify launch.
