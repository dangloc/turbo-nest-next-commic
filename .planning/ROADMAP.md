# Roadmap: WordPress to NestJS Migration

Milestone: v1.13 - Legacy Financial ETL Import
Created: 2026-04-12
Status: Planned

## Milestones

- [done] v1.9 Full Reader Productization (shipped 2026-04-09) - see .planning/milestones/v1.9-ROADMAP.md
- [done] v1.10 Notification Center and Dynamic Content (shipped 2026-04-09) - see .planning/milestones/v1.10-ROADMAP.md
- [done] v1.11 Reader Experience and Creator Discovery (shipped 2026-04-11) - see .planning/milestones/v1.11-ROADMAP.md
- [done] v1.12 Creator Growth and Reader Personalization (shipped 2026-04-11) - see .planning/milestones/v1.12-ROADMAP.md
- [active] v1.13 Legacy Financial ETL Import (in progress)

## Phases

### Phase 34: Legacy Financial ETL Import

Status: Planned

Goal: Migrate legacy WordPress user financials and chapter purchase history into PostgreSQL using a single usmeta pivot source of truth.

Requirements: ETL-01, ETL-02, ETL-03

Scope:
- Single-query extraction of legacy user financial metadata from wp_usermeta.
- PHP-serialized chapter purchase transformation into Prisma-ready purchase rows.
- Prisma load path for wallet/user VIP updates plus bulk purchase inserts.
- ETL runner and CLI wiring for the migration stage.

Success Criteria:
- Migration ignores deprecated wp_users price and vip_level_id columns.
- Balance, VIP level, and purchase history are sourced from one grouped wp_usermeta pivot per user.
- Chapter purchases are bulk inserted with createMany and no N+1 meta lookups.

Plans:
- [ ] 34-01-PLAN.md - implement legacy financial pivot loader, parser, and Prisma load path

## Progress

| Phase | Requirements | Status | Plans | Completion |
|-------|--------------|--------|-------|------------|
| 34 | ETL-01, ETL-02, ETL-03 | Planned | 1 planned | - |

---

Next Action: Execute Phase 34 using /gsd:execute-phase 34
