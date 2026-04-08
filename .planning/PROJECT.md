# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration program for a legacy WordPress novel/webcomic platform. v1.0 established the financial and identity record foundation, v1.1 completed strict content migration, and v1.2 completed the User-Generated Content (UGC) foundation by linking novels to uploaders.

## Core Value

Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## Current State

- v1.0 is shipped and archived.
- v1.1 is shipped and archived.
- v1.2 is shipped and archived.
- Novel ownership now links each novel to a User uploader, and the legacy novel set is backfilled to Admin user ID 1.
- Reconciliation, schema validation, and UAT evidence are complete for the UGC ownership foundation.

## Validated in v1.2

- Uploader ownership relation from User to Novel.
- Required `uploaderId` on Novel with default 1.
- Safe migration and verification for the existing 176 novels.

## Validated in v1.1

- Strict DB-to-DB content migration requirements for novels and chapters.
- Exact MySQL ID preservation for novels and chapters.
- Chapter-to-novel relationships and raw chapter content without heavy parsing.
- Reconciliation output and rerun safety for content migration.

## Out of Scope

- Heavy Word/Text parsing or content cleanup in ETL - manual CMS import will handle rich content later.
- Frontend redesign or reader UX rebuild - migration milestones remain backend/data first.
- Additional content types outside novels and chapters for this milestone.
- Full user submission UI/workflow in v1.2 (this milestone only prepares ownership schema).

## Context

The migration now preserves content, ownership, and verification coverage end to end. The dataset already includes 176 migrated novels and the schema can safely assign future unowned novels to the Admin account until a real UGC submission flow is built.

## Constraints

- **Data integrity**: Existing novel IDs and chapter relationships must remain unchanged.
- **Migration safety**: Existing novels must be assigned to Admin user ID 1 without manual row-by-row scripts.
- **Compatibility**: Prisma schema and generated migration must apply cleanly to current PostgreSQL state.
- **Scope**: v1.2 phase 9 establishes ownership foundation only; no full UGC submission product yet.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve original MySQL IDs as target primary keys or stable unique IDs | Purchase history and chapter links depend on exact source identity | Good |
| Use DB-to-DB migration only, not Word/Text file parsing | Reduces ETL risk and keeps content migration deterministic | Good |
| Defer rich-content cleanup to a later CMS tool | Keeps the milestone focused on relational integrity | Good |
| Treat chapter content as raw post_content during import | Avoids accidental transformation of user-visible content | Good |
| Migrate novels before chapters during content ETL reruns | Prevents FK failures when chapters reference yet-to-exist parents | Good |
| Default `Novel.uploaderId` to Admin user ID 1 in v1.2 | Safely backfills existing 176 novels and future unassigned inserts | Good |

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
*Last updated: 2026-04-08 after v1.2 milestone completion*
