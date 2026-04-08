# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration program for a legacy WordPress novel/webcomic platform. v1.0 established the financial and identity record foundation, v1.1 completed strict content migration, and v1.2 starts the User-Generated Content (UGC) foundation by linking novels to uploaders.

## Core Value

Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## Current Milestone: v1.2 User-Generated Content (UGC) Foundation

**Goal:** Link existing novels to an uploader User so future user-submitted novels can build on a stable ownership model.

**Target features:**
- Add a User -> Novel one-to-many relationship in Prisma.
- Add `uploaderId Int @default(1)` on Novel to safely backfill existing migrated rows.
- Generate and apply Prisma migration for PostgreSQL.
- Keep migration rerunnable and safe for existing 176 novels.

## Requirements

### Validated

- [x] Data model normalization and legacy identity preservation - v1.0
- [x] ETL extraction, transformation, and loading with resumable semantics - v1.0
- [x] Post-migration verification for critical parity checks - v1.0
- [x] Strict DB-to-DB content migration with exact IDs and raw content fidelity - v1.1
- [x] Content reconciliation and rerun safety verification - v1.1

### Active

- [ ] Add uploader ownership link from Novel to User for UGC foundation.
- [ ] Backfill existing novels safely with default uploader assignment.
- [ ] Apply and verify Prisma migration in PostgreSQL.

### Out of Scope

- Heavy Word/Text parsing or content cleanup in ETL - manual CMS import will handle rich content later.
- Frontend redesign or reader UX rebuild - migration milestones remain backend/data first.
- Additional content types outside novels and chapters for this milestone.
- Full user submission UI/workflow in v1.2 (this milestone only prepares ownership schema).

## Context

v1.0 and v1.1 are archived and tagged. The dataset already includes 176 migrated novels and large chapter volume, so v1.2 must introduce uploader ownership without risky backfill scripts. Using `@default(1)` on `Novel.uploaderId` allows schema-level safety for both existing and future unassigned records.

## Constraints

- **Data integrity**: Existing novel IDs and chapter relationships must remain unchanged.
- **Migration safety**: Existing novels must be assigned to Admin user ID 1 without manual row-by-row scripts.
- **Compatibility**: Prisma schema and generated migration must apply cleanly to current PostgreSQL state.
- **Scope**: v1.2 phase 9 only establishes ownership foundation; no full UGC submission product yet.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve original MySQL IDs as target primary keys or stable unique IDs | Purchase history and chapter links depend on exact source identity | Good |
| Use DB-to-DB migration only, not Word/Text file parsing | Reduces ETL risk and keeps content migration deterministic | Good |
| Defer rich-content cleanup to a later CMS tool | Keeps the milestone focused on relational integrity | Good |
| Treat chapter content as raw post_content during import | Avoids accidental transformation of user-visible content | Good |
| Migrate novels before chapters during content ETL reruns | Prevents FK failures when chapters reference yet-to-exist parents | Good |
| Default `Novel.uploaderId` to Admin user ID 1 in v1.2 | Safely backfills existing 176 novels and future unassigned inserts | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. What This Is still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after v1.2 milestone start*
