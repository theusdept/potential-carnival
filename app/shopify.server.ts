import "@shopify/shopify-app-react-router/adapters/node";
import { ApiVersion, AppDistribution, shopifyApp } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { db } from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October26,
  appUrl: process.env.SHOPIFY_APP_URL || "https://example.com",
  scopes: (process.env.SCOPES || "read_orders").split(","),
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(db),
  distribution: AppDistribution.AppStore,
  future: { expiringOfflineAccessTokens: true },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const login = shopify.login;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
