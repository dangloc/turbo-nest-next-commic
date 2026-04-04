# Phase 1: Schema Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Design the PostgreSQL Prisma schema so legacy WordPress data lands in normalized, queryable tables without duplication. This phase stops at schema design and tooling foundation; ETL extraction/loading and verification are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Legacy identifier strategy
- **D-01:** Keep WordPress `wp_users.ID` as the canonical `User.id` in PostgreSQL.
- **D-02:** Preserve legacy WordPress identifiers through the normalized relations instead of generating new primary keys for migrated users.

### Purchased chapter constraints
- **D-03:** Enforce `@@unique([userId, chapterId])` on purchased chapter rows to prevent duplicate purchases for the same user/chapter pair.
- **D-04:** Add a supporting lookup index for large-scale chapter history queries, using `@@index([userId, novelId])`.

### Import rerun behavior
- **D-05:** When the ETL runs again in a later phase, duplicate purchased chapter rows should be skipped so reruns stay safe and resumable.

### the agent's Discretion
- Exact Prisma package versions and script names in `apps/api/package.json`.
- Whether to keep all Prisma tooling in the API workspace or add a thin root-level convenience script.
- Whether to create any helper module around Prisma client generation in this phase, or leave runtime wiring for later.

</decisions>

<specifics>
## Specific Ideas

- Normalize the legacy WordPress surface into dedicated tables for `User`, `UserProvider`, `Wallet`, `Transaction`, `VipSubscription`, and `PurchasedChapter`.
- Preserve the WordPress phpass password hash string so existing accounts stay compatible.
- Keep Google social login IDs from `wp_social_users` attached to the migrated user record.
- Optimize for a purchased-chapter table that may eventually contain millions of rows.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` — Phase 1 goal, requirements, and success criteria.
- `.planning/REQUIREMENTS.md` — DATA-01, DATA-02, and DATA-03 acceptance criteria.

### Project constraints
- `.planning/PROJECT.md` — core value, constraints, and locked migration priorities.
- `.planning/STATE.md` — current project focus and phase direction.

### Codebase context
- `.planning/codebase/ARCHITECTURE.md` — current monorepo and Nest/Next structure.
- `.planning/codebase/STACK.md` — current technology stack and package manager.
- `.planning/codebase/STRUCTURE.md` — where API and workspace files live.
- `.planning/codebase/CONVENTIONS.md` — existing naming and config patterns.
- `apps/api/package.json` — current Nest API scripts and dependency baseline.
- `apps/api/src/main.ts` — API entry point and runtime assumptions.
- `apps/api/src/app.module.ts` — current Nest module boundary.

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/package.json`: existing Nest workspace manifest and test/build scripts.
- `apps/api/src/main.ts`: minimal Nest bootstrap pattern to preserve while adding Prisma support later.
- `apps/api/src/app.module.ts`: root Nest module that future Prisma integration can attach to.

### Established Patterns
- Workspace uses npm workspaces and Turborepo with app-scoped package manifests.
- API code follows Nest module/controller/service separation and flat ESLint config.
- Shared code uses TypeScript-first conventions and the existing source layout under `apps/api/src`.

### Integration Points
- `apps/api/package.json` for Prisma tooling and generated client commands.
- `apps/api/prisma/schema.prisma` for the normalized data model.
- Later ETL and API work will read the schema from the API workspace rather than root-level app code.

</code_context>

<deferred>
## Deferred Ideas

- ETL extraction/loading script — Phase 2.
- Migration verification checks — Phase 3.
- Runtime API endpoints for migrated records — v2 / later phases.
- Frontend redesign or reader UX changes — out of scope for this milestone.

</deferred>

---
*Phase: 01-schema-foundation*
*Context gathered: 2026-04-05*
