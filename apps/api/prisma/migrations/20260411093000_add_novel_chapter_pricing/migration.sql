-- Add pricing configuration for novel/chapter purchase model.
-- Keep this migration replay-safe for environments that were previously synced with db push.

ALTER TABLE "novels"
  ADD COLUMN IF NOT EXISTS "defaultChapterPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "freeChapterCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "comboDiscountPct" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "chapters"
  ADD COLUMN IF NOT EXISTS "priceOverride" DECIMAL(10,2);
