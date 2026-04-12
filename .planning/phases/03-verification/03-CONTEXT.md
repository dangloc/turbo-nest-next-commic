# Phase 3: Verification - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate that migration outcomes preserve financial totals and key identity mappings. The immediate first focus is wallet-balance reconciliation between WordPress source and PostgreSQL target.

</domain>

<decisions>
## Implementation Decisions

### Focus for phase kickoff
- **D-10:** Start verification with wallet total reconciliation first.
  - Execute source-vs-target wallet total checks before other verification tracks.
  - Produce machine-readable reconciliation outputs for audit repeatability.

### Workspace hygiene handling
- **D-11:** Leave residual noise and untracked scaffold files untouched for now.
  - Verification work must avoid cleanup/refactor side quests.
  - Keep Phase 3 scope strictly on reconciliation and evidence.

## Claude's Discretion

- SQL vs Prisma query style for verification scripts.
- Exact artifact formats (JSON/CSV/Markdown) as long as totals and diffs are explicit.
- Whether to include optional tolerance thresholds in report output.

</decisions>

<specifics>
## Specific Constraints

- Source wallet value comes from legacy WordPress user balance field (`wp_users.price`).
- Target wallet value comes from normalized `wallets.balance` tied to `users.id`.
- Verification output must include both global totals and user-level discrepancy rows.
- Verification should be rerunnable and deterministic.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase 3 goal and requirements.
- `.planning/REQUIREMENTS.md` — VER-01..VER-03.
- `.planning/STATE.md` — current milestone status.
- `apps/api/src/etl/source-mysql-loaders.ts` — source wallet extraction behavior.
- `apps/api/prisma/schema.prisma` — target wallet table constraints.
- `apps/api/src/etl/index.ts` — ETL command entrypoint conventions.

</canonical_refs>

<deferred>
## Deferred Ideas

- Social mapping and purchased chapter verification can follow after wallet reconciliation starts.
- Repo cleanup or scaffold normalization remains deferred per D-11.

</deferred>
