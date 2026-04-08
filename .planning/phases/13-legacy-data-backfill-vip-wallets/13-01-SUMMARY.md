---
phase: 13-legacy-data-backfill-vip-wallets
plan: 01
subsystem: etl
tags: [vip, wallet, backfill, reconciliation]
requires: [12-01]
provides: [vip-level-loader, vip-level-upsert, wallet-backfill-baseline, vip-wallet-reconciliation]
affects: [apps/api/src/etl]
tech-stack:
  added: []
  patterns:
    - idempotent upsert by source ID
    - rerun-safe wallet baseline backfill
    - source-target parity verification
key-files:
  created:
    - apps/api/src/etl/verify-wallet-reconciliation.ts
    - apps/api/src/etl/__tests__/verify-wallet-reconciliation.spec.ts
  modified:
    - apps/api/src/etl/types.ts
    - apps/api/src/etl/source-mysql-loaders.ts
    - apps/api/src/etl/prisma-repositories.ts
    - apps/api/src/etl/etl-runner.ts
    - apps/api/src/etl/index.ts
    - apps/api/src/etl/__tests__/content-source-loaders.spec.ts
    - apps/api/src/etl/__tests__/etl-runner.spec.ts
    - apps/api/src/etl/__tests__/etl-integration.spec.ts
key-decisions:
  - Use `VipLevel.id` as preserved migration key from `wp_vip_levels.id`
  - Backfill `Wallet.depositedBalance` and `Wallet.totalDeposited` only when both are zero
  - Extend verification report with VIP parity and wallet split aggregate deltas
requirements-completed: [ECO-16, ECO-17]
duration: 0h 0m
completed: 2026-04-08
---

# Phase 13 Plan 01 Summary

Implemented legacy VIP and wallet backfill flow with rerun-safe semantics and verification evidence.

## Task Results

- Task 1: Added `SourceVipLevelRow` contract and `loadVipLevels()` source loader with normalization/filtering checks.
- Task 2: Added `vipLevelRepo.upsert` and `walletBackfillRepo.backfillFromLegacyBalance`, then wired both into ETL execution and CLI dependencies.
- Task 3: Extended reconciliation command to output VIP parity and wallet baseline decomposition integrity (`depositedBalance`/`totalDeposited`) with mismatch details.

## Verification

- `npm test --workspace=api -- --runInBand src/etl/__tests__/content-source-loaders.spec.ts`
- `npm test --workspace=api -- --runInBand src/etl/__tests__/etl-runner.spec.ts src/etl/__tests__/etl-integration.spec.ts`
- `npm test --workspace=api -- --runInBand src/etl/__tests__/verify-wallet-reconciliation.spec.ts`
- `npm run check-types --workspace=api`

## Commits (apps/api)

- `e6e3210` feat(13-01): add legacy vip level source loader contracts
- `08ecbde` feat(13-01): wire idempotent vip and wallet backfill stages
- `5c41340` feat(13-01): extend vip and wallet reconciliation reporting

## Self-Check: PASSED

Phase complete, ready for verification.
