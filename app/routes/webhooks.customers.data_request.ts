import { randomUUID } from "node:crypto";
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  completePrivacyRequest, deliverDataExport, exportCustomerData,
  parseCustomerPayload, recordPrivacyRequest, shopContactEmail,
} from "../services/privacy.server";

export async function action({ request }: ActionFunctionArgs) {
  const { shop, payload } = await authenticate.webhook(request);
  const customer = parseCustomerPayload(payload);
  if (!customer) return new Response("Missing customer ID", { status: 422 });
  const id = request.headers.get("x-shopify-webhook-id") || randomUUID();
  const done = await recordPrivacyRequest(id, shop, "customers/data_request", customer.customerId);
  if (!done) {
    const data = await exportCustomerData(shop, customer.customerId);
    await deliverDataExport(await shopContactEmail(shop), data);
    await completePrivacyRequest(id);
  }
  return new Response(null, { status: 200 });
}
