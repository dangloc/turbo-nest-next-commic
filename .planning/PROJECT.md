# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration program for a legacy WordPress novel/webcomic platform. v1.0 established the financial and identity record foundation; v1.1 now shifts to a strict DB-to-DB content migration for novels and chapters so purchase history and chapter relationships stay intact.

## Core Value

Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## Current Milestone: v1.1 Content Migration

**Goal:** Move novels and chapters directly from WordPress MySQL to PostgreSQL without parsing rich content, while preserving source IDs and parent relationships exactly.

**Target features:**
- Import novels from wp_posts where post_type = truyen_chu.
- Import chapters from wp_posts where post_type = chuong_truyen, including raw post_content.
- Preserve chapter-to-novel linkage from wp_postmeta where meta_key = chuong_with_truyen.
- Force original MySQL IDs into target PostgreSQL rows and make the import rerunnable.

## Requirements

### Validated

- ✓ Data model normalization and legacy identity preservation — v1.0
- ✓ ETL extraction, transformation, and loading with resumable semantics — v1.0
- ✓ Post-migration verification for critical parity checks — v1.0

### Active

- [ ] Define strict DB-to-DB content migration requirements for novels and chapters.
- [ ] Preserve exact MySQL IDs when inserting novels and chapters into PostgreSQL.
- [ ] Preserve chapter-to-novel relationships and raw chapter content without heavy Word/Text parsing.
- [ ] Add reconciliation and rerun safety for content migration outputs.

### Out of Scope

- Heavy Word/Text parsing or content cleanup in ETL — manual CMS import will handle rich content later.
- Frontend redesign or reader UX rebuild — this milestone is backend data migration only.
- Additional content types outside novels and chapters — keep scope to the current DB-to-DB contract.

## Context

v1.0 completed with a monorepo structure (apps/api, apps/web, packages/*) and ETL implementation centered in apps/api/src/etl. The API package already exposes the migration entrypoint, source MySQL loaders, idempotence helpers, and reconciliation scaffolding that can be extended for content migration.

## Constraints

- **Data integrity:** Original MySQL IDs must be inserted into PostgreSQL so relationship integrity remains exact.
- **Scope:** DB-to-DB only; no heavy document parsing or rich-content transformation in this milestone.
- **Compatibility:** The migration must remain rerunnable without duplicating novels or chapters.
- **Performance:** The pipeline must stay safe for large content volumes and avoid loading unnecessary file-based content.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve original MySQL IDs as target primary keys or stable unique IDs | Purchase history and chapter links depend on exact source identity | Pending |
| Use DB-to-DB migration only, not Word/Text file parsing | Reduces ETL risk and keeps content migration deterministic | Good |
| Defer rich-content cleanup to a later CMS tool | Keeps the milestone focused on relational integrity | Good |
| Treat chapter content as raw post_content during import | Avoids accidental transformation of user-visible content | Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via /gsd-transition):
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. What This Is still accurate? Update if it drifted.

**After each milestone** (via /gsd-complete-milestone):
1. Full review of all sections.
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-04-07 after v1.1 milestone start*
