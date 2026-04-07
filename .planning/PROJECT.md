# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration program for a legacy WordPress novel/webcomic platform. v1.0 established the financial and identity record foundation, and v1.1 completed strict DB-to-DB content migration for novels and chapters with rerun-safe verification.

## Core Value

Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## Current State

- v1.0 is shipped and archived.
- v1.1 is shipped and archived.
- The content ETL path now preserves exact MySQL IDs, chapter-to-novel relationships, and raw chapter content.
- Reconciliation evidence and rerun-safety checks are in place for the migration pipeline.

## Validated in v1.1

- Strict DB-to-DB content migration requirements for novels and chapters.
- Exact MySQL ID preservation for novels and chapters.
- Chapter-to-novel relationships and raw chapter content without heavy parsing.
- Reconciliation output and rerun safety for content migration.

## Out of Scope

- Heavy Word/Text parsing or content cleanup in ETL — manual CMS import will handle rich content later.
- Frontend redesign or reader UX rebuild — migration milestone is backend/data foundation only.
- Additional content types outside novels and chapters — keep scope to the current DB-to-DB contract.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve original MySQL IDs as target primary keys or stable unique IDs | Purchase history and chapter links depend on exact source identity | Good |
| Use DB-to-DB migration only, not Word/Text file parsing | Reduces ETL risk and keeps content migration deterministic | Good |
| Defer rich-content cleanup to a later CMS tool | Keeps the milestone focused on relational integrity | Good |
| Treat chapter content as raw post_content during import | Avoids accidental transformation of user-visible content | Good |
| Migrate novels before chapters during content ETL reruns | Prevents FK failures when chapters reference yet-to-exist parents | Good |

## Context

Shipped v1.1 with exact-ID content import, relation-preserving chapter loads, reconciliation reporting, and rerun safety. The active planning surface is now clear for the next milestone.

---
*Last updated: 2026-04-07 after v1.1 milestone completion*
