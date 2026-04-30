DO $$
BEGIN
  CREATE TYPE "TermSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "author_profiles"
ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT,
ADD COLUMN IF NOT EXISTS "telegramUrl" TEXT,
ADD COLUMN IF NOT EXISTS "otherPlatformName" TEXT,
ADD COLUMN IF NOT EXISTS "otherPlatformUrl" TEXT;

CREATE TABLE IF NOT EXISTS "term_submissions" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "taxonomy" TEXT NOT NULL,
  "status" "TermSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "reviewedByUserId" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "term_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "term_submissions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "term_submissions_userId_createdAt_idx"
  ON "term_submissions"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "term_submissions_status_taxonomy_createdAt_idx"
  ON "term_submissions"("status", "taxonomy", "createdAt");

CREATE INDEX IF NOT EXISTS "term_submissions_slug_taxonomy_idx"
  ON "term_submissions"("slug", "taxonomy");

CREATE UNIQUE INDEX IF NOT EXISTS "term_submissions_pending_slug_taxonomy_key"
  ON "term_submissions"("slug", "taxonomy")
  WHERE "status" = 'PENDING';
