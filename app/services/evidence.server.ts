import { createHash, createHmac, randomUUID } from "node:crypto";
import { detectPhotoType, MAX_EVIDENCE_BYTES } from "../domain/claims";

export class EvidenceUnavailable extends Error {
  constructor(message = "Evidence storage is unavailable") { super(message); }
}
type Config = { endpoint: URL; bucket: string; region: string; style: "path" | "virtual"; key: string; secret: string };

function config(): Config {
  const { S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_URL_STYLE, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new EvidenceUnavailable("Private evidence storage is not configured");
  }
  let endpoint: URL;
  try { endpoint = new URL(S3_ENDPOINT); }
  catch { throw new EvidenceUnavailable("Invalid storage endpoint"); }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
    endpoint.search || endpoint.hash || !/^\/?$/.test(endpoint.pathname) ||
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(S3_BUCKET)) {
    throw new EvidenceUnavailable("Invalid storage endpoint or bucket");
  }
  const style = S3_URL_STYLE || "virtual";
  if (style !== "path" && style !== "virtual") throw new EvidenceUnavailable("Invalid storage URL style");
  return { endpoint, bucket: S3_BUCKET, region: S3_REGION || "auto", style, key: S3_ACCESS_KEY_ID, secret: S3_SECRET_ACCESS_KEY };
}
function hashHex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function mac(key: Buffer | string, message: string): Buffer {
  return createHmac("sha256", key).update(message).digest();
}
function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]|\.\d{3}/g, "");
}
function signingKey(secret: string, date: string, region: string): Buffer {
  return mac(mac(mac(mac("AWS4" + secret, date), region), "s3"), "aws4_request");
}
function escapeRfc3986(part: string) {
  return encodeURIComponent(part).replace(/[!'()*]/g, ch => "%" + ch.charCodeAt(0).toString(16).toUpperCase());
}
function resourceUrl(cfg: Config, key: string): URL {
  if (!/^evidence\/[a-f0-9]{24}\/[0-9a-f-]{36}$/.test(key)) {
    throw new EvidenceUnavailable("Invalid evidence object key");
  }
  if (cfg.style === "path") return new URL("/" + escapeRfc3986(cfg.bucket) + "/" + key, cfg.endpoint);
  const result = new URL("/" + key, cfg.endpoint);
  result.hostname = cfg.bucket + "." + result.hostname;
  return result;
}
function requestAuthorization(cfg: Config, method: "PUT" | "DELETE", url: URL, payload: Uint8Array, now = new Date()) {
  const amzDate = stamp(now);
  const date = amzDate.slice(0, 8);
  const payloadHash = hashHex(payload);
  const scope = date + "/" + cfg.region + "/s3/aws4_request";
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const headers = "host:" + url.host + "\nx-amz-content-sha256:" + payloadHash +
    "\nx-amz-date:" + amzDate + "\n";
  const canonical = [method, url.pathname, "", headers, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, hashHex(canonical)].join("\n");
  const signature = createHmac("sha256", signingKey(cfg.secret, date, cfg.region)).update(stringToSign).digest("hex");
  return {
    "X-Amz-Date": amzDate,
    "X-Amz-Content-Sha256": payloadHash,
    Authorization: "AWS4-HMAC-SHA256 Credential=" + cfg.key + "/" + scope + ", SignedHeaders=" +
      signedHeaders + ", Signature=" + signature,
  };
}
function signedGetUrl(cfg: Config, url: URL, now = new Date()) {
  const amzDate = stamp(now);
  const date = amzDate.slice(0, 8);
  const scope = date + "/" + cfg.region + "/s3/aws4_request";
  const params: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", cfg.key + "/" + scope],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", "60"],
    ["X-Amz-SignedHeaders", "host"],
    ["response-content-disposition", "attachment"],
  ];
  const canonicalQuery = params.map(([key, value]) =>
    escapeRfc3986(key) + "=" + escapeRfc3986(value)).sort().join("&");
  const canonical = ["GET", url.pathname, canonicalQuery, "host:" + url.host + "\n", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, hashHex(canonical)].join("\n");
  const signature = createHmac("sha256", signingKey(cfg.secret, date, cfg.region)).update(stringToSign).digest("hex");
  url.search = canonicalQuery + "&X-Amz-Signature=" + signature;
  return url.toString();
}
async function perform(method: "PUT" | "DELETE", url: URL, cfg: Config, bytes: Uint8Array = new Uint8Array(), contentType?: string) {
  const response = await fetch(url, {
    method,
    headers: {
      ...requestAuthorization(cfg, method, url, bytes),
      ...(contentType ? { "Content-Type": contentType, "Content-Disposition": "attachment" } : {}),
    },
    ...(method === "PUT" ? { body: Buffer.from(bytes) } : {}),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new EvidenceUnavailable("Storage request failed");
}
export function validateEvidence(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" {
  if (!bytes.length || bytes.length > MAX_EVIDENCE_BYTES) throw new EvidenceUnavailable("Photo must be 5 MB or smaller");
  const type = detectPhotoType(bytes);
  if (!type) throw new EvidenceUnavailable("Only PNG, JPEG or WebP images are accepted");
  return type;
}
export async function uploadEvidence(shop: string, bytes: Uint8Array) {
  const contentType = validateEvidence(bytes);
  const cfg = config();
  const prefix = hashHex(shop).slice(0, 24);
  const objectKey = "evidence/" + prefix + "/" + randomUUID();
  await perform("PUT", resourceUrl(cfg, objectKey), cfg, bytes, contentType);
  return { objectKey, contentType, bytes: bytes.length };
}
export async function signedEvidenceUrl(key: string) {
  const cfg = config();
  return signedGetUrl(cfg, resourceUrl(cfg, key));
}
export async function deleteEvidence(key: string) {
  const cfg = config();
  await perform("DELETE", resourceUrl(cfg, key), cfg);
}
