CREATE TABLE IF NOT EXISTS "terms" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "taxonomy" TEXT NOT NULL,
  CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "_NovelToTerm" (
  "A" INTEGER NOT NULL,
  "B" INTEGER NOT NULL,
  CONSTRAINT "_NovelToTerm_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX IF NOT EXISTS "terms_taxonomy_idx" ON "terms"("taxonomy");
CREATE INDEX IF NOT EXISTS "terms_slug_taxonomy_idx" ON "terms"("slug", "taxonomy");
CREATE INDEX IF NOT EXISTS "_NovelToTerm_B_index" ON "_NovelToTerm"("B");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'terms_slug_taxonomy_key'
  ) THEN
    ALTER TABLE "terms"
      ADD CONSTRAINT "terms_slug_taxonomy_key" UNIQUE ("slug", "taxonomy");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_NovelToTerm_A_fkey'
  ) THEN
    ALTER TABLE "_NovelToTerm"
      ADD CONSTRAINT "_NovelToTerm_A_fkey"
      FOREIGN KEY ("A") REFERENCES "novels"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_NovelToTerm_B_fkey'
  ) THEN
    ALTER TABLE "_NovelToTerm"
      ADD CONSTRAINT "_NovelToTerm_B_fkey"
      FOREIGN KEY ("B") REFERENCES "terms"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
