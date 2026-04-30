ALTER TABLE "novels" ADD COLUMN IF NOT EXISTS "uploaderId" INTEGER;

ALTER TABLE "novels" ALTER COLUMN "uploaderId" SET DEFAULT 1;

UPDATE "novels"
SET "uploaderId" = 1
WHERE "uploaderId" IS NULL;

ALTER TABLE "novels" ALTER COLUMN "uploaderId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "novels_uploaderId_idx" ON "novels"("uploaderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'novels_uploaderId_fkey'
  ) THEN
    ALTER TABLE "novels"
      ADD CONSTRAINT "novels_uploaderId_fkey"
      FOREIGN KEY ("uploaderId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
