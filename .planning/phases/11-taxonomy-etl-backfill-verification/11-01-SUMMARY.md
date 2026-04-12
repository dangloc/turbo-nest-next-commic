# Phase 11 Plan 1 Summary

Phase: 11-taxonomy-etl-backfill-verification  
Plan: 01  
Status: Complete  
Completed: 2026-04-08

## Scope Completed

Implemented taxonomy ETL extraction, taxonomy write wiring into the main ETL runner, and reconciliation verification tooling with rerun-safety reporting.

### Files

- apps/api/src/etl/types.ts
- apps/api/src/etl/source-mysql-loaders.ts
- apps/api/src/etl/prisma-repositories.ts
- apps/api/src/etl/etl-runner.ts
- apps/api/src/etl/index.ts
- apps/api/src/etl/config.ts
- apps/api/src/etl/taxonomy-reconciliation-report.ts
- apps/api/src/etl/verify-taxonomy-reconciliation.ts
- apps/api/src/etl/__tests__/content-source-loaders.spec.ts
- apps/api/src/etl/__tests__/etl-runner.spec.ts
- apps/api/src/etl/__tests__/etl-integration.spec.ts
- apps/api/src/etl/__tests__/taxonomy-reconciliation-report.spec.ts
- apps/api/src/etl/__tests__/verify-taxonomy-reconciliation.spec.ts
- apps/api/package.json

## Implementation

- Added taxonomy source contracts:
  - `SourceTermRow`
  - `SourceTermRelationshipRow`
- Added taxonomy source loaders:
  - `loadTerms()` from `wp_terms` + `wp_term_taxonomy`
  - `loadTermRelationships()` from `wp_term_relationships` + `wp_term_taxonomy`
- Extended ETL repositories:
  - `termRepo.upsert()` for deterministic term persistence by source `term_id`
  - `novelTermRepo.createMany()` for `_NovelToTerm` writes using `ON CONFLICT DO NOTHING` when `skipDuplicates` is enabled
- Extended ETL runner dependencies and orchestration:
  - loads terms and term relationships with the existing parallel load stage
  - writes terms and novel-term links after novels are loaded
  - filters links to known loaded novels/terms before join writes
- Wired taxonomy dependencies in CLI bootstrap (`index.ts`) so migrate runs include taxonomy stage
- Added taxonomy reconciliation module:
  - deterministic mismatch builder for term/link parity
  - rerun-safety report builder (`terms`/`links` deltas + duplicate growth flags)
  - persisted report writer + human summary formatter
- Added taxonomy verification CLI:
  - reads source term/link snapshots
  - reads target terms and `_NovelToTerm` links
  - supports optional rerun check via `ETL_VERIFY_RERUN=true`
  - writes `apps/api/tmp/taxonomy-reconciliation.json`
- Added npm script:
  - `etl:verify:taxonomy`

## Verification

Executed and passed:

- `npm test --workspace=api -- --runInBand src/etl/__tests__/content-source-loaders.spec.ts --detectOpenHandles=false`
- `npm test --workspace=api -- --runInBand src/etl/__tests__/etl-runner.spec.ts`
- `npm test --workspace=api -- --runInBand src/etl/__tests__/taxonomy-reconciliation-report.spec.ts src/etl/__tests__/verify-taxonomy-reconciliation.spec.ts`
- `npm run check-types --workspace=api`

## Requirement Coverage

- TAX-04: Complete (taxonomy source extraction and relationship reconstruction implemented)
- TAX-05: Complete (taxonomy stage integrated without regressing existing ETL stages)
- TAX-06: Complete (join writes and rerun verification report duplicate-safe semantics)

## Outcome

Phase 11 plan 01 is complete. Taxonomy ETL backfill and audit tooling are now wired for migration and verification workflows.
