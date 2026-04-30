-- Phase 12: Platform Ecosystem Foundation (Schema Expansion)
-- Additive, replay-safe migration intended for controlled execution.

BEGIN;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthorApprovalStatus') THEN
    CREATE TYPE "AuthorApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WithdrawalStatus') THEN
    CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BannerPosition') THEN
    CREATE TYPE "BannerPosition" AS ENUM ('HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'READER_INLINE', 'SIDEBAR');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MissionType') THEN
    CREATE TYPE "MissionType" AS ENUM ('DAILY', 'WEEKLY', 'ONE_TIME', 'REFERRAL', 'READING', 'SOCIAL');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MissionLogStatus') THEN
    CREATE TYPE "MissionLogStatus" AS ENUM ('PENDING', 'COMPLETED', 'CLAIMED', 'FAILED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PointTransactionType') THEN
    CREATE TYPE "PointTransactionType" AS ENUM ('EARN', 'SPEND', 'ADJUSTMENT', 'EXPIRE', 'BONUS');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'NOVEL_UPDATE', 'COMMENT_REPLY', 'COMMENT_REACTION', 'MISSION', 'REWARD');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommentReactionType') THEN
    CREATE TYPE "CommentReactionType" AS ENUM ('LIKE', 'HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY');
  END IF;
END
$$;

-- Existing table upgrades (additive)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "currentVipLevelId" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users" ("referralCode");
CREATE INDEX IF NOT EXISTS "users_currentVipLevelId_idx" ON "users" ("currentVipLevelId");
CREATE INDEX IF NOT EXISTS "users_referredById_idx" ON "users" ("referredById");

ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "depositedBalance" DECIMAL(20,2) NOT NULL DEFAULT 0;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "earnedBalance" DECIMAL(20,2) NOT NULL DEFAULT 0;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "totalDeposited" DECIMAL(20,2) NOT NULL DEFAULT 0;

-- Safe wallet split backfill from legacy balance.
UPDATE "wallets"
SET
  "depositedBalance" = "balance",
  "earnedBalance" = 0,
  "totalDeposited" = "balance"
WHERE
  "depositedBalance" = 0
  AND "earnedBalance" = 0
  AND "totalDeposited" = 0;

ALTER TABLE "novels" ADD COLUMN IF NOT EXISTS "viewCount" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "viewCount" BIGINT NOT NULL DEFAULT 0;

-- New tables
CREATE TABLE IF NOT EXISTS "vip_levels" (
  "id" INTEGER PRIMARY KEY,
  "name" TEXT NOT NULL,
  "vndValue" INTEGER NOT NULL,
  "kimTe" INTEGER NOT NULL,
  "colorCode" TEXT,
  "iconUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "vip_levels_vndValue_idx" ON "vip_levels" ("vndValue");

CREATE TABLE IF NOT EXISTS "author_profiles" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE,
  "penName" TEXT NOT NULL,
  "bankAccountName" TEXT,
  "bankAccountNumber" TEXT,
  "bankName" TEXT,
  "bankBranch" TEXT,
  "approvalStatus" "AuthorApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "approvedAt" TIMESTAMP(3),
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "author_profiles_approvalStatus_idx" ON "author_profiles" ("approvalStatus");

CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
  "id" SERIAL PRIMARY KEY,
  "authorProfileId" INTEGER NOT NULL,
  "amount" DECIMAL(20,2) NOT NULL,
  "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "withdrawal_requests_authorProfileId_status_idx" ON "withdrawal_requests" ("authorProfileId", "status");

CREATE TABLE IF NOT EXISTS "banners" (
  "id" SERIAL PRIMARY KEY,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT,
  "position" "BannerPosition" NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "banners_position_isActive_idx" ON "banners" ("position", "isActive");

CREATE TABLE IF NOT EXISTS "missions" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "points" INTEGER NOT NULL,
  "type" "MissionType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "missions_type_isActive_idx" ON "missions" ("type", "isActive");

CREATE TABLE IF NOT EXISTS "user_mission_logs" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "missionId" INTEGER NOT NULL,
  "status" "MissionLogStatus" NOT NULL DEFAULT 'PENDING',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "user_mission_logs_userId_missionId_status_idx" ON "user_mission_logs" ("userId", "missionId", "status");

CREATE TABLE IF NOT EXISTS "point_transactions" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER,
  "type" "PointTransactionType" NOT NULL,
  "reason" TEXT,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "point_transactions_userId_createdAt_idx" ON "point_transactions" ("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "reading_history" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "novelId" INTEGER NOT NULL,
  "chapterId" INTEGER,
  "progressPercent" INTEGER NOT NULL DEFAULT 0,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "reading_history_userId_novelId_chapterId_key" ON "reading_history" ("userId", "novelId", "chapterId");
CREATE INDEX IF NOT EXISTS "reading_history_userId_lastReadAt_idx" ON "reading_history" ("userId", "lastReadAt");

CREATE TABLE IF NOT EXISTS "bookmarks" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "novelId" INTEGER NOT NULL,
  "chapterId" INTEGER,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "bookmarks_userId_novelId_chapterId_key" ON "bookmarks" ("userId", "novelId", "chapterId");
CREATE INDEX IF NOT EXISTS "bookmarks_userId_createdAt_idx" ON "bookmarks" ("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "novelId" INTEGER NOT NULL,
  "rating" INTEGER NOT NULL,
  "content" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_userId_novelId_key" ON "reviews" ("userId", "novelId");
CREATE INDEX IF NOT EXISTS "reviews_novelId_rating_idx" ON "reviews" ("novelId", "rating");

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx" ON "notifications" ("userId", "isRead", "createdAt");

CREATE TABLE IF NOT EXISTS "comments" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "novelId" INTEGER,
  "chapterId" INTEGER,
  "parentId" INTEGER,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "comments_novelId_createdAt_idx" ON "comments" ("novelId", "createdAt");
CREATE INDEX IF NOT EXISTS "comments_chapterId_createdAt_idx" ON "comments" ("chapterId", "createdAt");
CREATE INDEX IF NOT EXISTS "comments_parentId_idx" ON "comments" ("parentId");

CREATE TABLE IF NOT EXISTS "comment_reactions" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "commentId" INTEGER NOT NULL,
  "type" "CommentReactionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "comment_reactions_userId_commentId_key" ON "comment_reactions" ("userId", "commentId");
CREATE INDEX IF NOT EXISTS "comment_reactions_commentId_type_idx" ON "comment_reactions" ("commentId", "type");

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_currentVipLevelId_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_currentVipLevelId_fkey"
      FOREIGN KEY ("currentVipLevelId") REFERENCES "vip_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_referredById_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey"
      FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'author_profiles_userId_fkey') THEN
    ALTER TABLE "author_profiles" ADD CONSTRAINT "author_profiles_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawal_requests_authorProfileId_fkey') THEN
    ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_authorProfileId_fkey"
      FOREIGN KEY ("authorProfileId") REFERENCES "author_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_mission_logs_userId_fkey') THEN
    ALTER TABLE "user_mission_logs" ADD CONSTRAINT "user_mission_logs_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_mission_logs_missionId_fkey') THEN
    ALTER TABLE "user_mission_logs" ADD CONSTRAINT "user_mission_logs_missionId_fkey"
      FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'point_transactions_userId_fkey') THEN
    ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reading_history_userId_fkey') THEN
    ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reading_history_novelId_fkey') THEN
    ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_novelId_fkey"
      FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reading_history_chapterId_fkey') THEN
    ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_userId_fkey') THEN
    ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_novelId_fkey') THEN
    ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_novelId_fkey"
      FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_chapterId_fkey') THEN
    ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_userId_fkey') THEN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_novelId_fkey') THEN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_novelId_fkey"
      FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_userId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_userId_fkey') THEN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_novelId_fkey') THEN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_novelId_fkey"
      FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_chapterId_fkey') THEN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_parentId_fkey') THEN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_reactions_userId_fkey') THEN
    ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_reactions_commentId_fkey') THEN
    ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_commentId_fkey"
      FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Data integrity checks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_rating_range_check') THEN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range_check"
      CHECK ("rating" >= 1 AND "rating" <= 5);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'banners_date_window_check') THEN
    ALTER TABLE "banners" ADD CONSTRAINT "banners_date_window_check"
      CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" >= "startsAt");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_target_scope_check') THEN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_target_scope_check"
      CHECK ("novelId" IS NOT NULL OR "chapterId" IS NOT NULL);
  END IF;
END
$$;

COMMIT;
