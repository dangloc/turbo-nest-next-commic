ALTER TABLE "ad_settings"
ADD COLUMN "rewardAdPoints" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN "rewardAdDailyLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "rewardAdViewSeconds" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "chapterGateEveryChapters" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "chapterGateWaitSeconds" INTEGER NOT NULL DEFAULT 8;

UPDATE "ad_settings"
SET
  "rewardAdPoints" = 500,
  "rewardAdDailyLimit" = 3,
  "rewardAdViewSeconds" = 30,
  "chapterGateEveryChapters" = 3,
  "chapterGateWaitSeconds" = 8
WHERE
  "rewardAdPoints" IS NULL
  OR "rewardAdDailyLimit" IS NULL
  OR "rewardAdViewSeconds" IS NULL
  OR "chapterGateEveryChapters" IS NULL
  OR "chapterGateWaitSeconds" IS NULL;
