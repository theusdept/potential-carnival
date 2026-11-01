# ReturnGuard

Shopify merchant returns and warranty claims application (development).

This repository is reserved for ReturnGuard. The existing Warranty & Returns project is not modified.

## Planned architecture
- Shopify React Router embedded app and App Bridge
- Prisma + PostgreSQL for merchant-isolated claim records
- Shopify Admin GraphQL for order verification
- Shopify billing for merchant subscriptions
- Secure evidence uploads, privacy webhooks, and automated tests

## Status
Development foundation only; **not production-ready**. No Shopify installation, billing activation, or deployment has been verified.

## Next
Integrate the existing ReturnGuard foundation with the official Shopify CLI scaffold, then implement customer portal, security controls, and billing.
