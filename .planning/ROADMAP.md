# Roadmap: WordPress to NestJS Migration

**Created:** 2026-04-05
**Core Value:** Preserve every financially or identity-sensitive record during the migration, with exact IDs and relationships intact.

## Milestones

- [x] v1.0 WordPress Migration Foundation (shipped 2026-04-07) - archived in .planning/milestones/v1.0-ROADMAP.md
- [x] v1.1 Content Migration (shipped 2026-04-07) - archived in .planning/milestones/v1.1-ROADMAP.md
- [~] v1.2 User-Generated Content (UGC) Foundation (in progress) - uploader ownership schema groundwork

## Phases

### [~] v1.2 User-Generated Content (UGC) Foundation (Phase 9)

- [x] Phase 9: Novel uploader ownership schema + migration rollout (1 plan)

**Plans:** 1 plan
Plans:
- [x] 09-01-PLAN.md - Add User->Novel ownership relation, default uploader assignment, and apply Prisma migration.

**Planned outcomes:**
- Prisma schema links each novel to an uploader user.
- Existing 176 novels backfill to uploader ID 1 through schema default.
- Migration applies cleanly and remains compatible with current ETL/content flows.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 9. UGC ownership foundation | v1.2 | 1/1 | Complete | 2026-04-08 |

## Next Steps

1. Run /gsd:verify-work 9 to validate phase-level UAT evidence.
2. Decide whether to close out v1.2 now or extend with additional UGC phases.

---
*Roadmap updated: 2026-04-08*
*Last updated: 2026-04-08 after Phase 9 execution*
