# Phase 2: ETL Migration - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement a one-time ETL script that extracts WordPress MySQL data, transforms it into normalized PostgreSQL records, and loads it safely into the schema designed in Phase 1. This phase covers extraction, transformation, and load logic; verification and cutover signoff are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Mapping failure strategy
- **D-06:** Use two-phase mapping with quarantine.
  - Phase 1: Migrate clean records with strict validation (required fields must exist and deserialize).
  - Phase 2: Audit and manually remediate quarantined records, then re-run.
  - Rationale: Balances data integrity (catches issues early) with operational flexibility (manual fixes don't block migration).

### Serialization parse failure strategy
- **D-07:** Parse or skip user entirely.
  - If `vip_package` or `_purchased_chapters` cannot be unserialized from `wp_usermeta`, skip that user record and log as ERROR.
  - Do not create lossy defaults or incomplete records.
  - Post-migration, manually audit skipped users and decide on remediation or acceptance.
  - Rationale: Guarantees no silent data loss or false negatives (user appears to have no VIP when unclear).

### Purchased chapter batching strategy
- **D-08:** Per-user streaming with small per-user chunks.
  - For each user: extract all their chapters, write in chunks of 1,000, then move to next user.
  - Memory footprint stays constant (one user's chapters + chunk buffer in RAM).
  - Resume-friendly: if user 50 fails, restart from user 51 without risk of duplicate chapters.
  - Rationale: Better resumability than global chunking; safer than per-row inserts for million-row datasets.

### Rerun idempotence strategy
- **D-09:** Stop-the-world upsert-based idempotence.
  - Use upsert semantics on all inserts: User.id (WP ID), UserProvider (provider + providerId), Wallet (userId), VipSubscription (userId), Transaction (userId + transactionDate + type, or hash), PurchasedChapter (userId + chapterId).
  - On rerun: same user ID hits UPDATE (or matched UPSERT); same provider re-matched; same purchase skipped.
  - Rationale: Simple, deterministic retry behavior; acceptable for one-time migration (we control rerun conditions).

## Claude's Discretion

- Transaction grouping and error handling around failed rows (which to rollback, which to continue).
- Connection retry strategy and timeout settings for MySQL/PostgreSQL.
- Exact logging format, quarantine storage, and CLI output structure.
- Whether to include dry-run mode or just full migration mode.

</decisions>

<specifics>
## Specific Constraints

- Extract from WordPress MySQL: `wp_users`, `wp_social_users`, `tb_transactions`, and serialized data in `wp_usermeta` (keys: `vip_package`, `_purchased_chapters`).
- Transform: Deserialize vip_package and purchases; map WP roles to Prisma Role enum; convert wallet balance; normalize transaction types.
- Load: Write to PostgreSQL via Prisma client; use `createMany()` + chunking for chapters; respect uniqueness and cascade constraints.
- Preserve: WordPress user IDs, password hashes, social provider IDs, transaction timestamps/amounts, VIP expiry dates.
- Safety: Skip unparseable users (D-07); quarantine bad mapping data (D-06); stream chapters per-user (D-08); upsert on rerun (D-09).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 2 goal, requirements (MIG-01..06), and success criteria.
- `.planning/REQUIREMENTS.md` — MIG-01 through MIG-06 acceptance criteria and traceability.

### Project constraints and prior decisions
- `.planning/PROJECT.md` — core value, constraints, and locked migration priorities.
- `.planning/STATE.md` — current project focus and phase direction.
- `.planning/phases/01-schema-foundation/01-CONTEXT.md` — Phase 1 schema decisions (D-01..05).

### Codebase and integration context
- `.planning/codebase/ARCHITECTURE.md` — current monorepo and Nest structure.
- `.planning/codebase/STRUCTURE.md` — where API files live and how to add new modules.
- `.planning/codebase/CONVENTIONS.md` — naming and code patterns for this repo.
- `apps/api/package.json` — current Nest API scripts, Prisma tooling, and dependency versions.
- `apps/api/prisma/schema.prisma` — target schema from Phase 1 with all models and constraints.
- `apps/api/src/app.module.ts` — root Nest module where ETL may attach or be invoked.

### Source system details
- Obtain WordPress database credentials (host, user, password, dbname) from environment or secrets manager.
- Ensure access to: `wp_users`, `wp_social_users`, `tb_transactions`, `wp_usermeta` tables with serialized values.

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/app.module.ts`: Nest module that can register an ETL service or command.
- `apps/api/package.json`: existing Prisma client and scripts; ETL script can be added as a new npm script.
- `apps/api/prisma/schema.prisma`: target schema with all models, uniqueness, and cascade rules already defined.

### Established Patterns
- Nest services follow constructor dependency injection.
- Prisma client is instantiated once and reused.
- npm scripts in `apps/api/` are invoked via turbo or direct npm run.
- TypeScript strict mode and ESLint rules enforced across app.

### Integration Points
- ETL entry point: `apps/api/src/etl/etl.service.ts` (or similar) + CLI command or control endpoint.
- Configuration: `.env` or `.env.local` for MySQL source credentials, PostgreSQL target URL (already required).
- Logging: Structured logs (stdout) for migration progress, quarantine list, error summary.
- Output: Quarantine file (JSON) with list of skipped users and reasons, for Phase 2 remediation.

</code_context>

<deferred>
## Deferred Ideas

- Continuous bi-directional sync between WordPress and PostgreSQL — not needed for one-time migration.
- Password rehashing or transition off WP phpass — preserving hashes is required for compatibility.
- Post-migration cutover script or blast email to users — handled in Phase 3 verification or later release.
- ETL dashboard or real-time progress UI — logging to stdout sufficient for first run.

</deferred>

---
*Phase: 02-etl-migration*
*Context gathered: 2026-04-05*
*Decisions locked: D-06, D-07, D-08, D-09*
