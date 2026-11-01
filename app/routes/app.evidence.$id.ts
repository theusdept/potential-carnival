import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { signedEvidenceUrl } from "../services/evidence.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  if (!params.id) throw new Response("Missing evidence ID", { status: 400 });
  const record = await db.evidence.findFirst({
    where: { id: params.id, claim: { shop: session.shop } },
  });
  if (!record) throw new Response("Evidence not found", { status: 404 });
  const url = await signedEvidenceUrl(record.objectKey);
  return Response.redirect(url, 302);
}
