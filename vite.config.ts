import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

if (process.env.HOST && (!process.env.SHOPIFY_APP_URL || process.env.SHOPIFY_APP_URL === process.env.HOST)) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

export default defineConfig({
  plugins: [reactRouter()],
  server: { port: Number(process.env.PORT || 3000), host: "0.0.0.0" },
  build: { assetsInlineLimit: 0 },
});
