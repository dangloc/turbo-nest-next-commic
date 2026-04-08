# Roadmap: WordPress to NestJS Migration

**Created:** 2026-04-05
**Core Value:** Preserve every financially or identity-sensitive record during the migration, with exact IDs and relationships intact.

## Milestones

- [x] v1.0 WordPress Migration Foundation (shipped 2026-04-07) - archived in .planning/milestones/v1.0-ROADMAP.md
- [x] v1.1 Content Migration (shipped 2026-04-07) - archived in .planning/milestones/v1.1-ROADMAP.md
- [x] v1.2 User-Generated Content (UGC) Foundation (shipped 2026-04-08) - archived in .planning/milestones/v1.2-ROADMAP.md
- [~] v1.3 Taxonomy & Tags Migration (in progress) - taxonomy schema and novel mapping

## Phases

### [~] v1.3 Taxonomy & Tags Migration (Phase 10)

- [ ] Phase 10: Taxonomy schema + WordPress term migration and novel-term mapping (1 plan)

**Plans:** 1 plan
Plans:
- [ ] 10-01-PLAN.md - Add taxonomy storage, preserve WordPress term IDs, and migrate novel-term relationships.

**Planned outcomes:**
- Taxonomy/term records are stored in PostgreSQL with preserved source IDs, name, slug, and taxonomy type.
- Novels are linked to terms through a many-to-many relationship reconstructed from wp_term_relationships.
- Migration applies cleanly and remains compatible with current content and uploader ownership data.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 10. Taxonomy schema and novel-term mapping | v1.3 | 0/1 | Planned | - |

## Next Steps

1. Execute /gsd:execute-phase 10 to implement taxonomy schema and migration.
2. Verify taxonomy backfill against the 176 migrated novels.

---
*Roadmap updated: 2026-04-08*
*Last updated: 2026-04-08 after v1.3 milestone planning*
