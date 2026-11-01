import { z } from "zod";
export const claimTypeSchema = z.enum(["RETURN","WARRANTY","DAMAGE"]);
export const claimDecisionSchema = z.enum(["APPROVED","REJECTED","RESOLVED"]);
export const claimReasonSchema = z.string().trim().min(10).max(2000);
export const planLimits = {STARTER:50,GROWTH:250,PRO:1000} as const;
export type Plan = keyof typeof planLimits;
export function canCreateClaim(plan:Plan,monthlyCount:number){return Number.isSafeInteger(monthlyCount)&&monthlyCount>=0&&monthlyCount<planLimits[plan]}
export function withinReturnWindow(orderDate:Date,now:Date,days:number){if(!Number.isInteger(days)||days<0||days>365)return false;const age=now.getTime()-orderDate.getTime();return Number.isFinite(age)&&age>=0&&age<=days*86400000;}
