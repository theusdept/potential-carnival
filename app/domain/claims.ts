import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";

export const claimTypeSchema = z.enum(["RETURN", "WARRANTY", "DAMAGE"]);
export const claimDecisionSchema = z.enum(["APPROVED", "REJECTED", "RESOLVED"]);
export const claimReasonSchema = z.string().trim().min(10).max(2000);
export const claimSubmissionSchema = z.object({
  type: claimTypeSchema,
  reason: claimReasonSchema,
});
export const planLimits = { starter: 50, growth: 250, pro: 1000, test: 50 } as const;
export type Plan = keyof typeof planLimits;
export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(planLimits, value);
}
export function canCreateClaim(plan: Plan, monthlyCount: number) {
  return Number.isSafeInteger(monthlyCount) && monthlyCount >= 0 && monthlyCount < planLimits[plan];
}
export function withinReturnWindow(orderDate: Date, now: Date, days: number) {
  if (!Number.isInteger(days) || days < 0 || days > 3650) return false;
  const age = now.getTime() - orderDate.getTime();
  return Number.isFinite(age) && age >= 0 && age <= days * 86400000;
}
export const orderGidSchema = z.string().regex(/^gid:\/\/shopify\/Order\/[1-9]\d*$/);
export function makeClaimToken() { return randomBytes(32).toString("base64url"); }
export function hashClaimToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
const transitions: Record<string, readonly string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["RESOLVED"],
  REJECTED: [],
  RESOLVED: [],
};
export function validTransition(from: string, to: string) {
  return (transitions[from] ?? []).includes(to);
}
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
export function detectPhotoType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  return null;
}
