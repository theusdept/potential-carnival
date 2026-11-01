import { db } from "../db.server";
export async function loader() {
  const required = ["SHOPIFY_API_KEY","SHOPIFY_API_SECRET","SHOPIFY_APP_URL","DATABASE_URL",
    "SHOPIFY_PARTNER_ORG_ID","SHOPIFY_PARTNER_API_ACCESS_TOKEN","SHOPIFY_APP_GID","SHOPIFY_APP_HANDLE",
    "S3_ENDPOINT","S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY",
    "RESEND_API_KEY","PRIVACY_FROM_EMAIL","LEGAL_OPERATOR_NAME","SUPPORT_EMAIL"];
  if (!required.every(name => process.env[name]?.trim())) {
    return Response.json({ status:"unconfigured" }, { status:503, headers:{"Cache-Control":"no-store"} });
  }
  try { await db.$queryRaw`SELECT 1`; }
  catch { return Response.json({ status:"database_unavailable" }, { status:503, headers:{"Cache-Control":"no-store"} }); }
  return Response.json({ status:"ok", service:"returnguard" }, { headers:{"Cache-Control":"no-store"} });
}
