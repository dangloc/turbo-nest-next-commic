# Roadmap: WordPress to NestJS Migration

**Created:** 2026-04-05
**Core Value:** Preserve every financially or identity-sensitive record during the migration, with exact IDs and relationships intact.

## Milestones

- ✅ **v1.0 WordPress Migration Foundation** (shipped 2026-04-07) - archived in .planning/milestones/v1.0-ROADMAP.md
- 🚧 **v1.1 Content Migration** (in progress) - strict DB-to-DB novels and chapters migration, phases 6-8

## Phases

### 🚧 v1.1 Content Migration (Phases 6-8)

- [ ] Phase 6: Content schema and ID preservation (2 plans)
- [ ] Phase 7: DB-to-DB content import (2 plans)
- [ ] Phase 8: Content reconciliation and rerun safety (1 plan)

**Planned outcomes:**
- Phase 6 defines or extends the PostgreSQL content tables and ETL contracts so original MySQL IDs can be inserted directly.
- Phase 7 imports novels and chapters from wp_posts and preserves the wp_postmeta relationship mapping.
- Phase 8 verifies counts, relationship integrity, raw content fidelity, and rerun safety.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 6. Content schema and ID preservation | v1.1 | 0/2 | Not started | - |
| 7. DB-to-DB content import | v1.1 | 0/2 | Not started | - |
| 8. Content reconciliation and rerun safety | v1.1 | 0/1 | Not started | - |

## Next Steps

1. Run /gsd:plan-phase 6 to create the first execution plan.
2. Keep the migration DB-to-DB only; defer rich-content tooling to the CMS.

---
*Roadmap updated: 2026-04-07*
*Last updated: 2026-04-07 after v1.1 milestone start*
