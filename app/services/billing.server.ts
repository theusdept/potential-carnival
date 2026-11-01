import { isPlan, type Plan } from "../domain/claims";

type ActiveSubscription = {
  currentBillingCycle?: { startTime: string; endTime: string } | null;
  trialEndsAt?: string | null;
  items: Array<{ handle: string }>;
};
type PartnerResponse = {
  data?: { activeSubscription?: ActiveSubscription | null };
  errors?: Array<{ message: string }>;
};
const cache = new Map<string, { expires: number; value: ActiveSubscription | null }>();

export class BillingUnavailable extends Error {
  constructor(message = "Shopify subscription verification is unavailable") { super(message); }
}

export function resolvePlan(subscription: ActiveSubscription | null): Plan | null {
  if (!subscription) return null;
  for (const item of subscription.items ?? []) {
    const name = item.handle.toLowerCase();
    if (isPlan(name)) return name;
  }
  return null;
}

export function getBillingCycleStart(subscription: ActiveSubscription | null, now = new Date()): Date {
  const start = subscription?.currentBillingCycle?.startTime;
  if (start) {
    const date = new Date(start);
    if (Number.isFinite(date.getTime()) && date <= now) return date;
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function activeSubscription(shopId: string): Promise<ActiveSubscription | null> {
  if (!/^gid:\/\/shopify\/Shop\/[1-9]\d*$/.test(shopId)) throw new BillingUnavailable("Invalid Shopify shop GID");
  const { SHOPIFY_PARTNER_ORG_ID, SHOPIFY_PARTNER_API_ACCESS_TOKEN, SHOPIFY_APP_GID } = process.env;
  if (!SHOPIFY_PARTNER_ORG_ID || !SHOPIFY_PARTNER_API_ACCESS_TOKEN || !SHOPIFY_APP_GID) {
    throw new BillingUnavailable("Partner API is not configured");
  }
  const cached = cache.get(shopId);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (!/^\d+$/.test(SHOPIFY_PARTNER_ORG_ID) || !/^gid:\/\/shopify\/App\/\d+$/.test(SHOPIFY_APP_GID)) {
    throw new BillingUnavailable("Invalid Partner API configuration");
  }
  const response = await fetch(
    `https://partners.shopify.com/${SHOPIFY_PARTNER_ORG_ID}/api/2026-07/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_PARTNER_API_ACCESS_TOKEN,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        query: `query ActivePlan($appId: ID!, $shopId: ID!) {
          activeSubscription(appId: $appId, shopId: $shopId) {
            currentBillingCycle { startTime endTime }
            trialEndsAt
            items { handle }
          }
        }`,
        variables: { appId: SHOPIFY_APP_GID, shopId },
      }),
    },
  );
  if (!response.ok) throw new BillingUnavailable(`Partner API HTTP ${response.status}`);
  const body = await response.json() as PartnerResponse;
  if (body.errors?.length || !body.data || !Object.hasOwn(body.data, "activeSubscription")) {
    throw new BillingUnavailable("Partner API returned an invalid response");
  }
  const value = body.data.activeSubscription ?? null;
  cache.set(shopId, { value, expires: Date.now() + 60000 });
  return value;
}
export async function getActivePlan(shopId: string): Promise<{ plan: Plan; cycleStart: Date } | null> {
  const subscription = await activeSubscription(shopId);
  const plan = resolvePlan(subscription);
  return plan ? { plan, cycleStart: getBillingCycleStart(subscription) } : null;
}
export function planSelectionUrl(shop: string): string | null {
  const appHandle = process.env.SHOPIFY_APP_HANDLE;
  if (!appHandle || !/^[a-z0-9-]+$/.test(appHandle) ||
      !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return null;
  const store = shop.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${store}/charges/${appHandle}/pricing_plans`;
}
