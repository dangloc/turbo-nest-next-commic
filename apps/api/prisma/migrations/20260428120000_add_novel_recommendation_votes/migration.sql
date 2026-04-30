CREATE TABLE IF NOT EXISTS "novel_recommendation_votes" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "novelId" INTEGER NOT NULL,
  "voteDate" TIMESTAMP(3) NOT NULL,
  "votes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "novel_recommendation_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "novel_recommendation_votes_userId_novelId_voteDate_key"
  ON "novel_recommendation_votes" ("userId", "novelId", "voteDate");

CREATE INDEX IF NOT EXISTS "novel_recommendation_votes_userId_voteDate_idx"
  ON "novel_recommendation_votes" ("userId", "voteDate");

CREATE INDEX IF NOT EXISTS "novel_recommendation_votes_novelId_idx"
  ON "novel_recommendation_votes" ("novelId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'novel_recommendation_votes_userId_fkey'
  ) THEN
    ALTER TABLE "novel_recommendation_votes"
      ADD CONSTRAINT "novel_recommendation_votes_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'novel_recommendation_votes_novelId_fkey'
  ) THEN
    ALTER TABLE "novel_recommendation_votes"
      ADD CONSTRAINT "novel_recommendation_votes_novelId_fkey"
      FOREIGN KEY ("novelId") REFERENCES "novels"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'novel_recommendation_votes_votes_range_check'
  ) THEN
    ALTER TABLE "novel_recommendation_votes"
      ADD CONSTRAINT "novel_recommendation_votes_votes_range_check"
      CHECK ("votes" >= 1 AND "votes" <= 5);
  END IF;
END $$;
