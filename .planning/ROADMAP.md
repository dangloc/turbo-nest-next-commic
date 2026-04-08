# Roadmap: WordPress to NestJS Migration

**Created:** 2026-04-05
**Core Value:** Preserve every financially or identity-sensitive record during the migration, with exact IDs and relationships intact.

## Milestones

- [x] v1.0 WordPress Migration Foundation (shipped 2026-04-07) - archived in .planning/milestones/v1.0-ROADMAP.md
- [x] v1.1 Content Migration (shipped 2026-04-07) - archived in .planning/milestones/v1.1-ROADMAP.md
- [x] v1.2 User-Generated Content (UGC) Foundation (shipped 2026-04-08) - archived in .planning/milestones/v1.2-ROADMAP.md
- [~] v1.3 Taxonomy & Tags Migration (in progress) - awaiting final local UAT verification
- [~] v1.4 Platform Ecosystem Foundation (Schema Expansion) - schema complete, moving to legacy data backfill

## Phases

### [x] v1.3 Taxonomy & Tags Migration (Phase 10)

- [x] Phase 10: Taxonomy schema + WordPress term migration and novel-term mapping (1 plan)

**Plans:** 1 plan
Plans:
- [x] 10-01-PLAN.md - Add taxonomy storage, preserve WordPress term IDs, and migrate novel-term relationships.

### [x] v1.3 Taxonomy ETL Backfill & Verification (Phase 11)

- [x] Phase 11: Extract taxonomy source data, backfill terms/links, and verify reconciliation (1 plan)

**Plans:** 1 plan
Plans:
- [x] 11-01-PLAN.md - Extract wp_terms/wp_term_taxonomy/wp_term_relationships, backfill Term and _NovelToTerm, verify idempotence and link counts.

### [x] v1.4 Platform Ecosystem Foundation (Phase 12)

- [x] Phase 12: Prisma schema expansion for VIP, author center, banner, gamification, and advanced social/reader UX foundations (1 plan)

**Goal:** Expand schema safely for platform ecosystem features while preserving backward compatibility and migration safety.

**Plans:** 1 plan
Plans:
- [x] 12-01-PLAN.md - Add new Prisma models/enums and non-breaking column upgrades for Wallet, User, Novel, Chapter, and social relations.

**Completed outcomes:**
- VIP tier hierarchy is modeled with source-preserved IDs and user linkage.
- Author monetization and withdrawal flows are represented with auditable status enums.
- Banner and mission systems are schema-ready for future admin/product integration.
- Reader UX/social primitives (reviews, history, bookmarks, notifications, nested comments, reactions) are established with referential integrity and dedupe constraints.
- View counters on novels/chapters are additive and safe for large increments.

### [x] v1.4 Legacy Data Backfill (VIP & Wallets) (Phase 13)

- [x] Phase 13: Backfill VIP levels and execute wallet split migration from legacy balances (1 plan)

**Goal:** Migrate historical VIP tier and wallet financial data into the new v1.4 schema with deterministic, rerunnable semantics.

**Plans:** 1 plan
Plans:
- [x] 13-01-PLAN.md - Load wp_vip_levels into VipLevel and backfill Wallet deposited/earned/total fields safely.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 10. Taxonomy schema and novel-term mapping | v1.3 | 1/1 | Complete | 2026-04-08 |
| 11. Taxonomy ETL backfill and verification | v1.3 | 1/1 | Complete | 2026-04-08 |
| 12. Platform ecosystem schema expansion | v1.4 | 1/1 | Complete | 2026-04-08 |
| 13. Legacy VIP and wallet data backfill | v1.4 | 1/1 | Complete | 2026-04-08 |

## Next Steps

1. Run /gsd:verify-work 13 to validate VIP parity and wallet backfill evidence.
2. Prepare milestone closeout once verification output is accepted.

---
*Roadmap updated: 2026-04-08*
*Last updated: 2026-04-08 after Phase 13 execution completion*
