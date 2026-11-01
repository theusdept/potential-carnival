# Security requirements

ReturnGuard must not launch publicly until these controls are implemented and tested:

1. Merchant session validation for every embedded admin route.
2. Shop scoping for every database read and write.
3. Customer order ownership verification before claim submission.
4. Rate limiting, CSRF protections and strict request validation.
5. File MIME sniffing, size limits, private storage, signed retrieval and malware screening.
6. Billing entitlement validation and atomic monthly claim quota enforcement.
7. Idempotent webhook handling and privacy data export/deletion.
8. Secret management, database backups, and dependency vulnerability scanning.
9. End-to-end tests for Shopify installation, uninstall and subscription lifecycle.

Current implementation is a development prototype, not a secure production service.
