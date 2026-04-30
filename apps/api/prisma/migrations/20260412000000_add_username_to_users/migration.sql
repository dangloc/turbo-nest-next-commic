-- Add username support for local auth registration and login.
-- Replay-safe for environments already synchronized with prior migrations.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "username" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key"
  ON "users" ("username");
