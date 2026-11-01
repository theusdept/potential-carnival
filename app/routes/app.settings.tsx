import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { z } from "zod";
import { db } from "../db.server";
import { authenticate } from "../shopify.server";

const input = z.object({
  returnWindowDays: z.coerce.number().int().min(1).max(365),
  warrantyWindowDays: z.coerce.number().int().min(1).max(3650),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const settings = await db.shopSettings.findUnique({ where: { shop: session.shop } });
  return { returnWindowDays: settings?.returnWindowDays ?? 30, warrantyWindowDays: settings?.warrantyWindowDays ?? 365 };
}
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const parsed = input.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return { error: "Return window must be 1–365 days and warranty window 1–3650 days." };
  await db.shopSettings.upsert({
    where: { shop: session.shop },
    create: { shop: session.shop, ...parsed.data },
    update: parsed.data,
  });
  return { success: true };
}
export default function Settings() {
  const values = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <s-page heading="ReturnGuard policy settings">
    <s-section heading="Claim eligibility windows">
      <s-paragraph>Configure the maximum number of days since the Shopify order date when customers can request a claim. These are store policies; statutory consumer rights still apply.</s-paragraph>
      <Form method="post">
        <p><label htmlFor="returnWindowDays">Returns and damage (days)</label>{" "}
          <input id="returnWindowDays" type="number" min="1" max="365" name="returnWindowDays" defaultValue={values.returnWindowDays} required /></p>
        <p><label htmlFor="warrantyWindowDays">Warranty (days)</label>{" "}
          <input id="warrantyWindowDays" type="number" min="1" max="3650" name="warrantyWindowDays" defaultValue={values.warrantyWindowDays} required /></p>
        <button type="submit">Save policy</button>
      </Form>
      {result && "success" in result && result.success && <s-paragraph>Policy saved.</s-paragraph>}
      {result && "error" in result && typeof result.error === "string" && <p role="alert">{result.error}</p>}
    </s-section>
  </s-page>;
}
