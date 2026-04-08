# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration program for a legacy WordPress novel/webcomic platform. v1.0 established the financial and identity record foundation, v1.1 completed strict content migration, v1.2 completed the UGC foundation by linking novels to uploaders, and v1.3 begins taxonomy and tag migration for novel classification.

## Core Value

Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## Current Milestone: v1.3 Taxonomy & Tags Migration

**Goal:** Migrate WordPress categories, tags, and custom taxonomies into PostgreSQL and map them to existing novels.

**Target features:**
- Add a taxonomy/term model to store WordPress term name, slug, and taxonomy type.
- Establish many-to-many relationships between Novel and Term.
- Preserve original WordPress term IDs and reconstruct novel-term links for the existing 176 novels.
- Generate and apply the PostgreSQL migration for taxonomy support.

## Requirements

### Validated

- [x] Data model normalization and legacy identity preservation - v1.0
- [x] ETL extraction, transformation, and loading with resumable semantics - v1.0
- [x] Post-migration verification for critical parity checks - v1.0
- [x] Strict DB-to-DB content migration with exact IDs and raw content fidelity - v1.1
- [x] Content reconciliation and rerun safety verification - v1.1
- [x] Uploader ownership relation from User to Novel - v1.2
- [x] Required `uploaderId` on Novel with default 1 - v1.2
- [x] Safe migration and verification for the existing 176 novels - v1.2

### Active

- [ ] Add a taxonomy/term model that preserves WordPress term name, slug, and taxonomy type.
- [ ] Map novels to terms using a many-to-many relationship that preserves WordPress term IDs.
- [ ] Apply and verify Prisma migration for taxonomy support without breaking existing novel data.

### Out of Scope

- Full taxonomy editing UI or admin dashboard - this milestone only prepares the relational model and migration.
- Taxonomy normalization beyond preserving the WordPress source shape - keep the migration deterministic.
- Novel search/filter UX changes - this milestone is backend schema and ETL only.
- Content rewriting based on taxonomy labels - taxonomy should be preserved, not transformed.

## Context

The database already contains 176 migrated novels and the UGC ownership link established in v1.2. WordPress categories, tags, and custom taxonomies are represented by `wp_terms`, `wp_term_taxonomy`, and `wp_term_relationships`, and the new milestone must preserve source term IDs and reconstruct novel-term links cleanly.

## Constraints

- **Data integrity**: Existing novel IDs, chapter relationships, and uploader ownership must remain unchanged.
- **Migration safety**: Existing taxonomy terms and relationships must preserve original WordPress term IDs where possible.
- **Compatibility**: Prisma schema and generated migration must apply cleanly to current PostgreSQL state.
- **Scope**: v1.3 phase 10 establishes taxonomy storage and novel-term mapping only; no user-facing taxonomy management yet.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve original MySQL IDs as target primary keys or stable unique IDs | Purchase history and chapter links depend on exact source identity | Good |
| Use DB-to-DB migration only, not Word/Text file parsing | Reduces ETL risk and keeps content migration deterministic | Good |
| Defer rich-content cleanup to a later CMS tool | Keeps the milestone focused on relational integrity | Good |
| Treat chapter content as raw post_content during import | Avoids accidental transformation of user-visible content | Good |
| Migrate novels before chapters during content ETL reruns | Prevents FK failures when chapters reference yet-to-exist parents | Good |
| Default `Novel.uploaderId` to Admin user ID 1 in v1.2 | Safely backfills existing 176 novels and future unassigned inserts | Good |
| Preserve WordPress term IDs in the taxonomy model for easy mapping | Keeps ETL joins deterministic across wp_terms, wp_term_taxonomy, and wp_term_relationships | Pending |

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
*Last updated: 2026-04-08 after v1.3 milestone start*
