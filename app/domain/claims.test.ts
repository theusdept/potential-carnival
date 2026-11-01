import { describe, expect, it } from "vitest";
import {
  canCreateClaim, withinReturnWindow, claimReasonSchema, claimSubmissionSchema,
  makeClaimToken, hashClaimToken, validTransition, orderGidSchema,
  detectPhotoType, MAX_EVIDENCE_BYTES, isPlan,
} from "./claims";

describe("claim business rules", () => {
  it("enforces monthly plan limits", () => {
    expect(canCreateClaim("starter", 49)).toBe(true);
    expect(canCreateClaim("starter", 50)).toBe(false);
    expect(canCreateClaim("pro", 999)).toBe(true);
    expect(canCreateClaim("pro", -1)).toBe(false);
    expect(isPlan("growth")).toBe(true);
    expect(isPlan("hacked")).toBe(false);
  });
  it("rejects expired and future orders", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    expect(withinReturnWindow(new Date("2026-10-20"), now, 30)).toBe(true);
    expect(withinReturnWindow(new Date("2026-09-01"), now, 30)).toBe(false);
    expect(withinReturnWindow(new Date("2026-11-02"), now, 30)).toBe(false);
  });
  it("checks claim reason and claim type", () => {
    expect(claimReasonSchema.safeParse("Damaged packaging").success).toBe(true);
    expect(claimReasonSchema.safeParse("bad").success).toBe(false);
    expect(claimSubmissionSchema.safeParse({type:"WARRANTY",reason:"Defective item received"}).success).toBe(true);
    expect(claimSubmissionSchema.safeParse({type:"INVALID",reason:"Defective item received"}).success).toBe(false);
  });
  it("requires Shopify order global IDs", () => {
    expect(orderGidSchema.safeParse("gid://shopify/Order/123").success).toBe(true);
    expect(orderGidSchema.safeParse("gid://shopify/Shop/123").success).toBe(false);
  });
  it("generates unpredictable tokens and stores only a digest", () => {
    const a=makeClaimToken(),b=makeClaimToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(hashClaimToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashClaimToken(a)).not.toContain(a);
  });
  it("prevents illegal status transitions", () => {
    expect(validTransition("PENDING","APPROVED")).toBe(true);
    expect(validTransition("APPROVED","RESOLVED")).toBe(true);
    expect(validTransition("REJECTED","APPROVED")).toBe(false);
    expect(validTransition("PENDING","RESOLVED")).toBe(false);
  });
  it("accepts only supported image signatures", () => {
    expect(detectPhotoType(new Uint8Array([255,216,255,0]))).toBe("image/jpeg");
    expect(detectPhotoType(new Uint8Array([137,80,78,71,13,10,26,10]))).toBe("image/png");
    expect(detectPhotoType(new TextEncoder().encode("RIFF1234WEBP"))).toBe("image/webp");
    expect(detectPhotoType(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(MAX_EVIDENCE_BYTES).toBe(5242880);
  });
});
