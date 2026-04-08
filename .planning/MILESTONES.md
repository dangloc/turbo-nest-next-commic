# Project Milestones: WordPress to NestJS Migration

## v1.5 Auth Verification & CMS Import Foundation (Shipped: 2026-04-08)

**Phases completed:** 2 phases, 2 plans, 6 tasks

**Key accomplishments:**

- Google OAuth strategy with legacy account linking (provider ID -> email fallback).
- Role-based access control shipped with @Roles() + RolesGuard on sensitive routes.
- Prisma Role enum expanded to include AUTHOR for persisted authorization semantics.
- Admin CMS import endpoint shipped (/admin/import) with ADMIN-only enforcement.
- TXT/DOCX parser supports Chapter/Chương markers and deterministic chapter splitting.
- Milestone closed with 23/23 API test suites and 103/103 tests passing.

---

## v1.0 WordPress Migration Foundation (Shipped: 2026-04-07)

**Delivered:** Complete migration foundation from WordPress/MySQL to NestJS/PostgreSQL with end-to-end reconciliation coverage and audit evidence closure.

**Phases completed:** 5 phases, 9 plans total

**Key accomplishments:**

- Normalized Prisma schema shipped with legacy ID/password compatibility preserved.
- ETL pipeline implemented for users, providers, wallets, VIP metadata, transactions, and purchased chapters.
- Purchased chapter migration runs in chunked batches to stay safe at large scale.
- Wallet parity verification passed with zero delta.
- Purchased chapter reconciliation passed with zero delta and zero decode failures.
- Google social mapping verification passed with full parity, and the audit evidence was backfilled to keep the milestone auditable end to end.

**Stats:**

- 65 files changed
- 2546 lines of TypeScript in workspace
- 5 phases, 9 plans, 21 planned tasks
- 3 days from initial commit to milestone ship (2026-04-04 -> 2026-04-07)

**Git range:** 776f182 -> 4433d53

**What's next:** Define v1.1 runtime API and migration-admin feature scope.

## v1.1 Content Migration (Shipped: 2026-04-07)

**Delivered:** Strict DB-to-DB content migration for novels and chapters with exact IDs, raw content fidelity, reconciliation evidence, and rerun safety.

**Phases completed:** 3 phases, 5 plans total

**Key accomplishments:**

- Strict content schema and ETL contracts preserved original MySQL IDs for novels and chapters.
- WordPress loaders and Prisma repositories wired DB-to-DB content import into the ETL runner.
- Content migration orchestration imported novels before chapters and preserved parent novel relationships.
- Reconciliation tooling reported source and target counts, relationship integrity, and raw content mismatch totals.
- Rerun-enabled verification passed with duplicate growth false/false, proving idempotent content migration behavior.

**Stats:**

- 16 files changed in the milestone closeout range
- 2106 insertions, 22 deletions
- Same-day ship on 2026-04-07 (2026-04-07 21:48:59 +0700 -> 2026-04-07 23:45:36 +0700)

**Git range:** fac59e9 -> f23f0d7

**What's next:** Define the next milestone with /gsd:new-milestone.

## v1.2 User-Generated Content (UGC) Foundation (Shipped: 2026-04-08)

**Delivered:** Linked novels to uploader users with a safe default assignment so existing migrated novels resolve to Admin user ID 1.

**Phases completed:** 1 phase, 1 plan total

**Key accomplishments:**

- Added uploader ownership semantics to the content model without disturbing existing novel IDs.
- Applied an idempotent migration that backfilled legacy novels to uploader ID 1.
- Verified schema, API type-checking, and reconciliation tests still pass after the ownership change.
- Completed UAT with 4/4 checks passing.

**Stats:**

- 7 files changed in the milestone closeout range
- 319 insertions, 26 deletions
- Same-day ship on 2026-04-08 (2026-04-08 09:45:11 +0700 -> 2026-04-08 10:46:56 +0700)

**Git range:** 883c522 -> 56380f0

**What's next:** Define the next milestone with /gsd:new-milestone.
