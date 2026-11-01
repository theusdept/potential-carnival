import { randomUUID } from "node:crypto";
import { describe, expect, it, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { makeClaimToken, hashClaimToken } from "./claims";

const db = new PrismaClient();
const shop = `returnguard-ci-${randomUUID()}.myshopify.com`;

afterAll(async () => {
  await db.claim.deleteMany({ where: { shop } });
  await db.claimInvite.deleteMany({ where: { shop } });
  await db.shopUsage.deleteMany({ where: { shop } });
  await db.$disconnect();
});

describe("PostgreSQL claim isolation and one-use invitations", () => {
  it("isolates merchant claim queries by shop", async () => {
    const otherShop = `another-${randomUUID()}.myshopify.com`;
    const claim = await db.claim.create({
      data: { shop, orderId: "gid://shopify/Order/1", type: "DAMAGE", reason: "Item arrived in poor condition" },
    });
    expect((await db.claim.findMany({ where: { shop: otherShop } })).some(c => c.id === claim.id)).toBe(false);
    expect((await db.claim.findMany({ where: { shop } })).some(c => c.id === claim.id)).toBe(true);
  });

  it("stores only token hashes and prevents double redemption", async () => {
    const token = makeClaimToken();
    const invite = await db.claimInvite.create({
      data: { shop, orderId: "gid://shopify/Order/2", orderCreatedAt: new Date(),
        tokenHash: hashClaimToken(token), expiresAt: new Date(Date.now() + 86400000) },
    });
    expect(invite.tokenHash).not.toBe(token);
    const first = await db.claimInvite.updateMany({ where: {
      id: invite.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    const second = await db.claimInvite.updateMany({ where: {
      id: invite.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    expect(first.count).toBe(1);
    expect(second.count).toBe(0);
  });

  it("enforces claim quotas with an atomic conditional update", async () => {
    const windowStart = new Date("2026-11-01T00:00:00.000Z");
    await db.shopUsage.upsert({ where: { shop_windowStart: { shop, windowStart } },
      create: { shop, windowStart, count: 49 }, update: { count: 49 } });
    const initial = await db.shopUsage.updateMany({
      where: { shop, windowStart, count: { lt: 50 } }, data: { count: { increment: 1 } },
    });
    const blocked = await db.shopUsage.updateMany({
      where: { shop, windowStart, count: { lt: 50 } }, data: { count: { increment: 1 } },
    });
    expect(initial.count).toBe(1);
    expect(blocked.count).toBe(0);
    expect((await db.shopUsage.findUnique({ where: { shop_windowStart: { shop, windowStart } } }))?.count).toBe(50);
  });

  it("cascades claim events when a claim is deleted", async () => {
    const claim = await db.claim.create({
      data: { shop, orderId: "gid://shopify/Order/3", type: "RETURN", reason: "Incorrect size received",
        events: { create: [{ action: "SUBMITTED" }] } },
    });
    const id = claim.id;
    expect(await db.claimEvent.count({ where: { claimId: id } })).toBe(1);
    await db.claim.delete({ where: { id } });
    expect(await db.claimEvent.count({ where: { claimId: id } })).toBe(0);
  });
});
