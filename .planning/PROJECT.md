# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration foundation for a legacy WordPress novel/webcomic platform, including verified transfer of financial and identity-critical records.

## Core Value

Preserve every financially or identity-sensitive record during the migration, with a repeatable ETL process and verifiable totals.

## Current State

- v1.0 shipped with schema foundation, ETL migration flow, and verification commands.
- Verification parity achieved for:
  - Wallet totals
  - Purchased chapter decoded totals
  - Google social mapping identities
- Operational outputs are available as JSON reconciliation artifacts under `apps/api/tmp`.

## Requirements

### Validated

- Data model normalization and legacy identity preservation (DATA-01 to DATA-03).
- ETL extraction/transformation/loading with resumable semantics (MIG-01 to MIG-06).
- Post-migration verification for critical parity checks (VER-01 to VER-03).

### Active

- [ ] Define runtime API and admin tooling requirements for v1.1.
- [ ] Add milestone-level audit discipline (`/gsd:audit-milestone`) before future closeouts.
- [ ] Backfill missing per-plan phase summaries for stronger historical traceability.

### Out of Scope

- Frontend redesign and reader UX rebuild.
- Continuous bi-directional WordPress synchronization.
- Password rehashing away from WP phpass in migration milestone.

## Next Milestone Goals

1. Expose migration-backed runtime API surfaces for core user/profile/purchase retrieval.
2. Add migration observability/admin tooling for replay diagnostics and operational safety.
3. Harden delivery workflow with mandatory milestone audit before archive.

## Context

v1.0 completed with a monorepo structure (`apps/api`, `apps/web`, `packages/*`) and ETL implementation centered in `apps/api/src/etl`. The project is now ready to shift from migration foundation into runtime product/API capabilities.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Preserve WordPress user IDs and password hashes during migration | Maintains identity continuity and compatibility | Good |
| Use normalized Prisma models over serialized WordPress data blobs | Improves integrity and queryability | Good |
| Prioritize wallet verification before other parity checks | De-risks financial correctness first | Good |
| Defer workspace scaffold cleanup while finishing verification | Maintains execution focus during closeout | Revisit |

## Constraints

- Data integrity remains the top priority for all post-migration work.
- Compatibility with legacy identity assumptions must remain explicit during transition.
- Large historical data volumes require chunked, memory-safe handling.

---
*Last updated: 2026-04-07 after v1.0 milestone completion*
