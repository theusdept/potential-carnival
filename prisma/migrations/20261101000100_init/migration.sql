CREATE TYPE "ClaimType" AS ENUM ('RETURN', 'WARRANTY', 'DAMAGE');
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESOLVED');
CREATE TABLE "Session" (
"id" TEXT NOT NULL, "shop" TEXT NOT NULL, "state" TEXT NOT NULL,
"isOnline" BOOLEAN NOT NULL DEFAULT false, "scope" TEXT, "expires" TIMESTAMP(3),
"accessToken" TEXT NOT NULL, "userId" BIGINT, "firstName" TEXT, "lastName" TEXT, "email" TEXT,
"accountOwner" BOOLEAN NOT NULL DEFAULT false, "locale" TEXT, "collaborator" BOOLEAN DEFAULT false,
"emailVerified" BOOLEAN DEFAULT false, "refreshToken" TEXT, "refreshTokenExpires" TIMESTAMP(3),
CONSTRAINT "Session_pkey" PRIMARY KEY("id")
);
CREATE TABLE "ClaimInvite" (
"id" TEXT NOT NULL, "shop" TEXT NOT NULL, "orderId" TEXT NOT NULL, "orderName" TEXT,
"customerId" TEXT, "orderCreatedAt" TIMESTAMP(3) NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
"usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "ClaimInvite_pkey" PRIMARY KEY("id")
);
CREATE TABLE "Claim" (
"id" TEXT NOT NULL, "shop" TEXT NOT NULL, "orderId" TEXT NOT NULL, "orderName" TEXT,
"customerId" TEXT, "type" "ClaimType" NOT NULL, "reason" VARCHAR(2000) NOT NULL,
"status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
"inviteId" TEXT, CONSTRAINT "Claim_pkey" PRIMARY KEY("id")
);
CREATE TABLE "ClaimEvent" (
"id" TEXT NOT NULL, "claimId" TEXT NOT NULL, "action" TEXT NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "ClaimEvent_pkey" PRIMARY KEY("id")
);
CREATE TABLE "Evidence" (
"id" TEXT NOT NULL, "claimId" TEXT NOT NULL, "objectKey" TEXT NOT NULL,
"contentType" TEXT NOT NULL, "bytes" INTEGER NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "Evidence_pkey" PRIMARY KEY("id")
);
CREATE TABLE "ShopSettings" (
"shop" TEXT NOT NULL, "shopId" TEXT, "returnWindowDays" INTEGER NOT NULL DEFAULT 30,
"warrantyWindowDays" INTEGER NOT NULL DEFAULT 365, "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "ShopSettings_pkey" PRIMARY KEY("shop")
);
CREATE TABLE "PrivacyRequest" (
"id" TEXT NOT NULL, "shop" TEXT NOT NULL, "topic" TEXT NOT NULL, "customerId" TEXT,
"status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"processedAt" TIMESTAMP(3), "error" TEXT, CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY("id")
);
CREATE TABLE "ShopUsage" (
"shop" TEXT NOT NULL, "windowStart" TIMESTAMP(3) NOT NULL, "count" INTEGER NOT NULL DEFAULT 0,
CONSTRAINT "ShopUsage_pkey" PRIMARY KEY("shop","windowStart")
);
CREATE INDEX "Session_shop_idx" ON "Session"("shop");
CREATE UNIQUE INDEX "Claim_inviteId_key" ON "Claim"("inviteId");
CREATE INDEX "Claim_shop_status_createdAt_idx" ON "Claim"("shop","status","createdAt");
CREATE INDEX "Claim_shop_orderId_idx" ON "Claim"("shop","orderId");
CREATE INDEX "Claim_shop_customerId_idx" ON "Claim"("shop","customerId");
CREATE INDEX "ClaimEvent_claimId_createdAt_idx" ON "ClaimEvent"("claimId","createdAt");
CREATE UNIQUE INDEX "ClaimInvite_tokenHash_key" ON "ClaimInvite"("tokenHash");
CREATE INDEX "ClaimInvite_shop_orderId_idx" ON "ClaimInvite"("shop","orderId");
CREATE INDEX "ClaimInvite_expiresAt_idx" ON "ClaimInvite"("expiresAt");
CREATE UNIQUE INDEX "Evidence_objectKey_key" ON "Evidence"("objectKey");
CREATE INDEX "Evidence_claimId_idx" ON "Evidence"("claimId");
CREATE INDEX "PrivacyRequest_shop_status_idx" ON "PrivacyRequest"("shop","status");
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "ClaimInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClaimEvent" ADD CONSTRAINT "ClaimEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
