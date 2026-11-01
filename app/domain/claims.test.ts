import { describe,expect,it } from "vitest";
import { canCreateClaim,withinReturnWindow,claimReasonSchema } from "./claims";
describe("ReturnGuard domain",()=>{
 it("enforces subscription claim quotas",()=>{expect(canCreateClaim("STARTER",49)).toBe(true);expect(canCreateClaim("STARTER",50)).toBe(false);expect(canCreateClaim("PRO",-1)).toBe(false)});
 it("rejects future and expired orders",()=>{const now=new Date("2026-11-01T00:00:00Z");expect(withinReturnWindow(new Date("2026-10-20T00:00:00Z"),now,30)).toBe(true);expect(withinReturnWindow(new Date("2026-09-01T00:00:00Z"),now,30)).toBe(false);expect(withinReturnWindow(new Date("2026-11-02T00:00:00Z"),now,30)).toBe(false)});
 it("validates reason length",()=>{expect(claimReasonSchema.safeParse("damaged box").success).toBe(true);expect(claimReasonSchema.safeParse("bad").success).toBe(false)});
});
