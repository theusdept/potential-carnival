import { type RouteConfig, route, layout, index } from "@react-router/dev/routes";
export default [
 index("routes/_index.tsx"),
 route("health","routes/health.ts"),
 route("robots.txt","routes/robots.txt.ts"),
 route("auth/login","routes/auth.login.tsx"),
 route("auth/*","routes/auth.$.tsx"),
 layout("routes/app.tsx",[
  route("app", "routes/app._index.tsx"),
  route("app/claims", "routes/app.claims.tsx"),
  route("app/billing", "routes/app.billing.tsx"),
 ]),
 route("webhooks/app/uninstalled","routes/webhooks.app.uninstalled.ts"),
 route("webhooks/customers/data_request","routes/webhooks.customers.data_request.ts"),
 route("webhooks/customers/redact","routes/webhooks.customers.redact.ts"),
 route("webhooks/shop/redact","routes/webhooks.shop.redact.ts"),
] satisfies RouteConfig;
