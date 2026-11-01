import { describe, expect, it } from "vitest";
describe("S3 runtime dependency", () => {
  it("loads the AWS SDK from the Node.js runtime", async () => {
    const sdk = await import("@aws-sdk/client-s3");
    expect(typeof sdk.S3Client).toBe("function");
    expect(typeof sdk.PutObjectCommand).toBe("function");
    const presigner = await import("@aws-sdk/s3-request-presigner");
    expect(typeof presigner.getSignedUrl).toBe("function");
  });
});
