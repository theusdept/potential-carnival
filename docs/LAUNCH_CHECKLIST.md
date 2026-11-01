# ReturnGuard release gates

## Engineering
- [x] React Router and Prisma foundation committed
- [x] Server-verified Shopify order lookup and secure one-use claim invitations implemented
- [x] Return/damage/warranty submission and merchant decisions implemented
- [x] Plan quotas, policy windows and evidence storage code implemented
- [x] Shopify pricing verification and managed plan selection code implemented
- [x] Mandatory privacy and uninstall webhook handlers implemented
- [x] PostgreSQL migration and automated CI (schema, typecheck, tests, build) passed on repair branch
- [ ] CI green after final branch merge and production startup smoke test
- [ ] Live S3 upload/download/delete integration test with bucket credentials
- [ ] Shopify OAuth, protected customer data access, order lookup and invitation tested on dev store
- [ ] App Pricing active subscription/upgrade/cancel tested on dev store
- [ ] Verified webhook HMAC, data export and redaction tested against Shopify
- [ ] Load/rate limiting, application log monitoring and recovery strategy reviewed
- [ ] Merchant usability, accessibility and production security review completed

## Required external services
- [ ] Public Shopify Dev app registered and configuration deployed
- [ ] Shopify managed plans and Partner API client configured
- [ ] Railway staging changes committed only after credentials and approval
- [ ] Verified email sender and legal operator/support contact configured
- [ ] Private S3 bucket connection tested with correct URL addressing style
- [ ] Shopify App Store listing and protected customer data review submitted and approved

Do not claim production readiness or accept merchant payments until the unchecked gates pass.
