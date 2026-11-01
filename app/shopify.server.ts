import "@shopify/shopify-app-react-router/adapters/node";
import { shopifyApp, AppDistribution } from "@shopify/shopify-app-react-router/server";
import { ApiVersion } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { db } from "./db.server";
const shopify = shopifyApp({
 apiKey: process.env.SHOPIFY_API_KEY!,
 apiSecretKey: process.env.SHOPIFY_API_SECRET!,
 apiVersion: ApiVersion.October26,
 appUrl: process.env.SHOPIFY_APP_URL!,
 scopes: (process.env.SCOPES ?? "read_orders").split(","),
 authPathPrefix: "/auth",
 sessionStorage: new PrismaSessionStorage(db),
 distribution: AppDistribution.AppStore,
 future: { unstable_newEmbeddedAuthStrategy: true },
});
export const authenticate = shopify.authenticate;
export const registerWebhooks = shopify.registerWebhooks;
export default shopify;
