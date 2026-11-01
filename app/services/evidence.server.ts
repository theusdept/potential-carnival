import { randomUUID, createHash } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { detectPhotoType, MAX_EVIDENCE_BYTES } from "../domain/claims";

export class EvidenceUnavailable extends Error {
  constructor(message = "Evidence storage is not configured") { super(message); }
}
function config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) throw new EvidenceUnavailable();
  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, bucket };
}
export function validateEvidence(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" {
  if (!bytes.length || bytes.length > MAX_EVIDENCE_BYTES) throw new EvidenceUnavailable("Photo must be 5 MB or smaller");
  const kind = detectPhotoType(bytes);
  if (!kind) throw new EvidenceUnavailable("Only PNG, JPEG and WebP photos are accepted");
  return kind;
}
export async function uploadEvidence(shop: string, bytes: Uint8Array) {
  const contentType = validateEvidence(bytes);
  const { client, bucket } = config();
  const prefix = createHash("sha256").update(shop).digest("hex").slice(0, 24);
  const key = `evidence/${prefix}/${randomUUID()}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    ContentDisposition: "attachment",
    ServerSideEncryption: "AES256",
  }));
  return { objectKey: key, contentType, bytes: bytes.length };
}
export async function signedEvidenceUrl(key: string) {
  if (!/^evidence\/[a-f0-9]{24}\/[0-9a-f-]{36}$/.test(key)) throw new EvidenceUnavailable("Invalid evidence key");
  const { client, bucket } = config();
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: bucket, Key: key, ResponseContentDisposition: "attachment",
  }), { expiresIn: 60 });
}
export async function deleteEvidence(key: string) {
  const { client, bucket } = config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
