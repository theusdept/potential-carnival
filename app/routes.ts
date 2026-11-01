import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("health", "routes/health.ts"),
  route("robots.txt", "routes/robots.txt.ts"),
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/*", "routes/auth.$.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("claims", "routes/app.claims.tsx"),
    route("billing", "routes/app.billing.tsx"),
  ]),
  route("webhooks/app/uninstalled", "routes/webhooks.app.uninstalled.ts"),
  route("webhooks/customers/data_request", "routes/webhooks.customers.data_request.ts"),
  route("webhooks/customers/redact", "routes/webhooks.customers.redact.ts"),
  route("webhooks/shop/redact", "routes/webhooks.shop.redact.ts"),
] satisfies RouteConfig;
