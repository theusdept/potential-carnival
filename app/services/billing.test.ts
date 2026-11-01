import { describe, expect, it } from "vitest";
import { resolvePlan, getBillingCycleStart, planSelectionUrl } from "./billing.server";

describe("Shopify App Pricing", () => {
  it("maps verified partner subscription handles", () => {
    expect(resolvePlan({items:[{handle:"starter"}]})).toBe("starter");
    expect(resolvePlan({items:[{handle:"Pro"}]})).toBe("pro");
    expect(resolvePlan({items:[{handle:"unrecognized"}]})).toBeNull();
    expect(resolvePlan(null)).toBeNull();
  });
  it("uses the verified cycle start", () => {
    const now=new Date("2026-11-15T00:00:00Z");
    const result=getBillingCycleStart({items:[{handle:"growth"}],currentBillingCycle:{startTime:"2026-11-02T00:00:00Z",endTime:"2026-12-02T00:00:00Z"}},now);
    expect(result.toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(getBillingCycleStart(null,now).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
  it("never forms an unsafe billing redirect", () => {
    const old=process.env.SHOPIFY_APP_HANDLE;
    process.env.SHOPIFY_APP_HANDLE="returnguard";
    expect(planSelectionUrl("example.myshopify.com")).toBe("https://admin.shopify.com/store/example/charges/returnguard/pricing_plans");
    expect(planSelectionUrl("example.myshopify.com.evil.com")).toBeNull();
    if(old===undefined) delete process.env.SHOPIFY_APP_HANDLE; else process.env.SHOPIFY_APP_HANDLE=old;
  });
});
