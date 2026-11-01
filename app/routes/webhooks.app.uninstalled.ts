import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { eraseShop } from "../services/privacy.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop, topic } = await authenticate.webhook(request);
  if (topic !== "APP_UNINSTALLED") return new Response("Unexpected topic", { status: 400 });
  await eraseShop(shop);
  return new Response(null, { status: 200 });
}
