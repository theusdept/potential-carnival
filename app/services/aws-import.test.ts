import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadEvidence, deleteEvidence, signedEvidenceUrl } from "./evidence.server";

beforeEach(() => {
  vi.stubEnv("S3_ENDPOINT", "https://s3.example.com");
  vi.stubEnv("S3_BUCKET", "test-bucket");
  vi.stubEnv("S3_REGION", "us-east-1");
  vi.stubEnv("S3_ACCESS_KEY_ID", "test-access-key");
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("S3 Signature V4 evidence storage", () => {
  it("uploads a verified image with signed request headers", async () => {
    const evidence = await uploadEvidence("demo.myshopify.com", new Uint8Array([255, 216, 255, 0]));
    expect(evidence.objectKey).toMatch(/^evidence\/[0-9a-f]{24}\/[0-9a-f-]{36}$/);
    expect(evidence.contentType).toBe("image/jpeg");
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("https://s3.example.com/test-bucket/evidence/");
    expect(options?.method).toBe("PUT");
    const headers = options?.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=test-access-key\//);
    expect(headers["X-Amz-Content-Sha256"]).toMatch(/^[0-9a-f]{64}$/);
    expect(headers["Content-Disposition"]).toBe("attachment");
  });
  it("generates a 60-second presigned download URL", async () => {
    const key = "evidence/" + "a".repeat(24) + "/01234567-89ab-4cde-8fab-0123456789ab";
    const signed = new URL(await signedEvidenceUrl(key));
    expect(signed.hostname).toBe("s3.example.com");
    expect(signed.searchParams.get("X-Amz-Expires")).toBe("60");
    expect(signed.searchParams.get("X-Amz-SignedHeaders")).toBe("host");
    expect(signed.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("signs deletion and blocks bad keys", async () => {
    const key = "evidence/" + "b".repeat(24) + "/01234567-89ab-4cde-8fab-0123456789ab";
    await deleteEvidence(key);
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("DELETE");
    await expect(deleteEvidence("../../secrets")).rejects.toThrow("Invalid evidence object key");
  });
  it("fails closed when S3 reports an authorization error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(uploadEvidence("demo.myshopify.com", new Uint8Array([255, 216, 255]))).rejects.toThrow("Storage request failed");
  });
});
