UPDATE "ad_settings"
SET
  "adminRoleDashboardModules" = '["overview","users","novels","wallets"]'::jsonb,
  "authorRoleDashboardModules" = '["novels","terms","earnings"]'::jsonb
WHERE
  "id" = 1
  AND (
    "adminRoleDashboardModules" IS NULL
    OR "authorRoleDashboardModules" IS NULL
  );
