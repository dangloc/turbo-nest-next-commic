# Phase 33 Plan 01 Summary: Deterministic Cross-Device Progression Merge

Status: Complete
Phase: 33-cross-device-progression-continuity-and-conflict-safety
Plan: 01 of 02
Wave: 1 of 2
Requirements Addressed: SYNC-03, SYNC-04

## What Was Built

Implemented deterministic progression merge contracts and service behavior for chapter-open sync, including explicit conflict-policy metadata in API responses.

### Task 1: Sync contract extensions

- Updated backend sync contracts in apps/api/src/reader/types.ts:
  - Added ReaderSyncPolicy union with deterministic outcomes.
  - Extended ReaderChapterOpenInput with clientUpdatedAt.
  - Extended ReaderChapterOpenResult with:
    - effectiveProgressPercent
    - serverAcceptedProgress
    - conflictDetected
    - appliedPolicy
    - clientUpdatedAt
    - serverLastReadAt
- Updated request DTO shape in apps/api/src/reader/reader-personal.controller.ts to accept clientUpdatedAt.

### Task 2: Deterministic merge policy in service

- Reworked chapter-open progression sync in apps/api/src/reader/reader.service.ts:
  - First-open creates reading history and records first-open-create policy.
  - Existing history now compares clientUpdatedAt with server lastReadAt.
  - Stale/older client updates are rejected deterministically with last-write-keep-server metadata.
  - Newer client updates are accepted with last-write-accept-client metadata.
- Preserved idempotent view-count behavior so only first-open increments chapter and novel views.

### Task 3: Merge-policy test coverage

- Updated tests in apps/api/src/reader/__tests__/reader-progression-sync.spec.ts:
  - Added stale update rejection scenario.
  - Added newer update acceptance scenario.
  - Asserted metadata fields for deterministic conflict tracing.

## Verification

Automated checks run:
- npm test -- --runInBand src/reader/__tests__/reader-progression-sync.spec.ts src/reader/__tests__/reader-personal.spec.ts (apps/api) -> PASS
- npm run check-types (apps/api) -> PASS

## Outcome

Backend progression sync now applies deterministic timestamp-based merge behavior and returns explicit policy metadata that frontend clients can use for conflict-safe UX.