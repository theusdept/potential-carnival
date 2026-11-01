import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { eraseCustomer, parseCustomerPayload } from "../services/privacy.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop, payload } = await authenticate.webhook(request);
  const customer = parseCustomerPayload(payload);
  if (!customer) return new Response("Invalid customer payload", { status: 422 });
  await eraseCustomer(shop, customer.customerId);
  return new Response(null, { status: 200 });
}
