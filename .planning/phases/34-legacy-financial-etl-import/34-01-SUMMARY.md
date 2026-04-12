# Phase 34 Plan 01 Summary: Legacy Financial ETL Import

Status: Complete
Phase: 34-legacy-financial-etl-import
Plan: 01 of 01
Wave: 1 of 1
Requirements Addressed: ETL-01, ETL-02, ETL-03

## What Was Built

Implemented a dedicated financial migration stage that uses a single `wp_usermeta` pivot query as the source of truth for balance, VIP level, and purchased chapters, then loads the data into Prisma with bulk purchase inserts.

### Task 1: Contracts and test-first behavior lock

- Added `SourceUserFinancialSnapshotRow` to `apps/api/src/etl/types.ts`.
- Added `apps/api/src/etl/__tests__/migrate-user-financials.spec.ts` covering:
  - single grouped SQL pivot extraction contract,
  - strict avoidance of deprecated `wp_users` financial fields,
  - integer parsing for balance and VIP level,
  - purchase mapping from serialized payloads into Prisma write rows.

### Task 2: Single-query extraction + serialization transformation

- Added `loadUserFinancialSnapshots()` in `apps/api/src/etl/source-mysql-loaders.ts` with one grouped query:
  - `MAX(CASE WHEN meta_key = '_user_balance' THEN meta_value END)`
  - `MAX(CASE WHEN meta_key = '_user_vip_level_id' THEN meta_value END)`
  - `MAX(CASE WHEN meta_key = '_purchased_chapters' THEN meta_value END)`
- Added `apps/api/src/etl/migrate-user-financials.ts` to:
  - parse balance/VIP values to integers,
  - decode `_purchased_chapters` via `php-serialize` backed parser,
  - normalize numeric-key object payloads,
  - map to Prisma purchase writes with deduping.
- Extended parser coverage in `apps/api/src/etl/__tests__/parse-wordpress.spec.ts` for php-serialized numeric-key purchase payloads.

### Task 3: Prisma load and ETL runner wiring

- Added `userFinancialRepo` in `apps/api/src/etl/prisma-repositories.ts`:
  - `upsertFinancialSnapshot` updates wallet balance and `User.currentVipLevelId`.
  - `createManyPurchasedChapters` bulk inserts purchase history with `skipDuplicates` support.
- Updated `apps/api/src/etl/etl-runner.ts` to execute financial snapshot migration stage and merge stats.
- Updated `apps/api/src/etl/index.ts` wiring to use:
  - `loadUserFinancialSnapshots`,
  - `userFinancialRepo`.
- Updated runner/integration tests to the new dependency contracts:
  - `apps/api/src/etl/__tests__/etl-runner.spec.ts`
  - `apps/api/src/etl/__tests__/etl-integration.spec.ts`

## Verification

Automated checks run:
- `npm test -- --runInBand src/etl/__tests__/migrate-user-financials.spec.ts src/etl/__tests__/parse-wordpress.spec.ts src/etl/__tests__/etl-runner.spec.ts src/etl/__tests__/etl-integration.spec.ts` (apps/api) -> PASS
- `npm run check-types` (apps/api) -> PASS
- `npm run prisma:validate` (apps/api) -> PASS

## Outcome

The ETL financial migration now executes the exact required flow: one grouped `wp_usermeta` pivot extraction, php-serialized purchase transformation, and Prisma-backed financial updates plus purchase history bulk loading.
