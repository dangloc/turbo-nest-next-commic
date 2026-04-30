CREATE TABLE "reward_ad_sessions" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "smartlinkUrl" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimableAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_ad_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reward_ad_sessions_userId_startedAt_idx" ON "reward_ad_sessions"("userId", "startedAt");
CREATE INDEX "reward_ad_sessions_userId_claimedAt_idx" ON "reward_ad_sessions"("userId", "claimedAt");

ALTER TABLE "reward_ad_sessions" ADD CONSTRAINT "reward_ad_sessions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
