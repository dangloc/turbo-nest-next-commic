# Roadmap: WordPress to NestJS Migration

**Created:** 2026-04-05
**Core Value:** Preserve every financially or identity-sensitive record during the migration, with exact IDs and relationships intact.

## Milestones

- [x] v1.0 WordPress Migration Foundation (shipped 2026-04-07) - archived in .planning/milestones/v1.0-ROADMAP.md
- [x] v1.1 Content Migration (shipped 2026-04-07) - archived in .planning/milestones/v1.1-ROADMAP.md
- [x] v1.2 User-Generated Content (UGC) Foundation (shipped 2026-04-08) - archived in .planning/milestones/v1.2-ROADMAP.md
- [~] v1.3 Taxonomy & Tags Migration (in progress) - taxonomy schema and novel mapping

## Phases

### [x] v1.3 Taxonomy & Tags Migration (Phase 10)

- [x] Phase 10: Taxonomy schema + WordPress term migration and novel-term mapping (1 plan)

**Plans:** 1 plan
Plans:
- [x] 10-01-PLAN.md - Add taxonomy storage, preserve WordPress term IDs, and migrate novel-term relationships.

**Planned outcomes:**
- Taxonomy/term records are stored in PostgreSQL with preserved source IDs, name, slug, and taxonomy type.
- Novels are linked to terms through a many-to-many relationship reconstructed from wp_term_relationships.
- Migration applies cleanly and remains compatible with current content and uploader ownership data.

### [x] v1.3 Taxonomy ETL Backfill & Verification (Phase 11)

- [x] Phase 11: Extract taxonomy source data, backfill terms/links, and verify reconciliation (1 plan)

**Plans:** 1 plan
Plans:
- [x] 11-01-PLAN.md - Extract wp_terms/wp_term_taxonomy/wp_term_relationships, backfill Term and _NovelToTerm, verify idempotence and link counts.

**Planned outcomes:**
- Taxonomy source rows are extracted from WordPress and loaded into PostgreSQL terms with preserved IDs.
- Novel-term links are reconstructed into the implicit `_NovelToTerm` join table.
- ETL reruns remain duplicate-safe and reconciliation reports validate source/target parity.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 10. Taxonomy schema and novel-term mapping | v1.3 | 1/1 | Complete | 2026-04-08 |
| 11. Taxonomy ETL backfill and verification | v1.3 | 1/1 | Complete | 2026-04-08 |

## Next Steps

1. Run `npm run etl:migrate` locally for live taxonomy backfill.
2. Run `npm run etl:verify:taxonomy` locally to complete final UAT verification.

---
*Roadmap updated: 2026-04-08*
*Last updated: 2026-04-08 after Phase 11 completion*
