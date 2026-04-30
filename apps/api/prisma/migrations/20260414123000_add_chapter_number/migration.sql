ALTER TABLE "chapters"
ADD COLUMN IF NOT EXISTS "chapterNumber" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "chapters_novelId_chapterNumber_idx"
ON "chapters"("novelId", "chapterNumber");
