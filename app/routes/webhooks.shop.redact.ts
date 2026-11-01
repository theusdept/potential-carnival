import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { eraseShop } from "../services/privacy.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop } = await authenticate.webhook(request);
  await eraseShop(shop);
  return new Response(null, { status: 200 });
}
