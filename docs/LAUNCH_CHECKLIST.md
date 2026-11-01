# ReturnGuard launch gates

- [ ] Confirm compatible Shopify React Router dependency versions and build
- [ ] Create Shopify Partner app and configure OAuth callback URLs
- [ ] Implement customer-facing verified claim intake (do not expose unauthenticated order lookup)
- [ ] Implement secure object storage for claim evidence with malware/file validation
- [ ] Enforce per-shop billing entitlement and claim quotas server-side
- [ ] Register mandatory Shopify privacy and uninstall webhooks and verify HMAC
- [ ] Implement real customer data export/redaction workflows (current placeholders are not compliant)
- [ ] Add Shopify app configuration, scopes, and session migration
- [ ] Add migrations, unit and integration tests, CI, error monitoring
- [ ] Test on a Shopify development store
- [ ] Set production secrets and deploy to Railway
- [ ] Complete privacy policy, support channel, and Shopify App Store review

Do not enable public installs or live billing before these gates are complete.
