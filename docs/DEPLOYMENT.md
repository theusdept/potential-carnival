# Deployment runbook

This repository is not ready for live merchant installs. Do not deploy publicly until all launch gates in docs/LAUNCH_CHECKLIST.md pass.

## Shopify
1. Create a Shopify Partner app, configure the application URL and OAuth redirect URLs.
2. Copy shopify.app.toml.example to shopify.app.toml and replace placeholders.
3. Review requested scopes and deploy app configuration using Shopify CLI.
4. Implement and validate all privacy webhook behavior before App Store submission.

## Railway
1. Create a PostgreSQL database and app service from this GitHub repository.
2. Supply DATABASE_URL, SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL and SCOPES as secrets.
3. Set public domain and verify health endpoint, OAuth, webhook signatures, and database migrations.
4. Keep merchant billing disabled until tested on a Shopify development store.

## Acceptance
- CI build, typecheck, unit tests pass.
- Test install and uninstall pass.
- Merchant isolation and customer verification security tests pass.
- Customer portal, evidence storage and billing work end-to-end.
- Privacy export/deletion requests are handled and audited.
