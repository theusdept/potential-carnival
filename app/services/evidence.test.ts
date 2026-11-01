import { describe, expect, it } from "vitest";
import { validateEvidence } from "./evidence.server";
describe("evidence validation", () => {
  it("rejects malformed uploads", () => {
    expect(() => validateEvidence(new Uint8Array([60,115,118,103,62]))).toThrow();
  });
  it("accepts supported signatures", () => {
    expect(validateEvidence(new Uint8Array([255,216,255,10]))).toBe("image/jpeg");
  });
});
