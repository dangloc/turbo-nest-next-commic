# Roadmap: WordPress to NestJS Migration

Milestone: v1.11 - Reader Experience & Creator Discovery
Created: 2026-04-09
Status: planning

## Milestones

- [done] v1.9 Full Reader Productization (shipped 2026-04-09) - see .planning/milestones/v1.9-ROADMAP.md
- [done] v1.10 Notification Center & Dynamic Content (shipped 2026-04-09) - see .planning/milestones/v1.10-ROADMAP.md
- [active] v1.11 Reader Experience & Creator Discovery (in progress)

## Phases

### Phase 28: Public Author Profiles

Goal: Deliver public creator profile pages that expose author identity, catalog, and aggregate platform stats.

Requirements: AUTHOR-01, AUTHOR-02, AUTHOR-03

Scope:
- Public author profile route and server/API data contract.
- Author metadata rendering with safe empty-state handling.
- Author novel catalog listing with links into discovery/reader flow.
- Aggregate creator stats section (including total views baseline).

Success Criteria:
- Reader can visit a public author URL and see author info without authentication errors.
- Reader can browse authored novels from the profile page.
- Aggregate stats render accurately from backend payload.

Plans:
- [ ] 28-01-PLAN.md - implement backend author profile contract and public stats endpoint
- [ ] 28-02-PLAN.md - build public /author/[id] route with discovery-consistent catalog UI

### Phase 29: Core Chapter Reader Interface

Goal: Ship immersive chapter reading UI with stable chapter navigation controls.

Requirements: READER-01, READER-02

Scope:
- Reader surface optimized for long-form chapter content.
- Next/previous chapter navigation controls.
- Table-of-contents access for chapter jumps.
- Loading, missing-chapter, and boundary navigation states.

Success Criteria:
- Reader can open chapter pages in distraction-free layout.
- Reader can navigate between chapters and jump from table of contents.
- Navigation handles first/last chapter boundaries safely.

Plans:
- [ ] 29-01-PLAN.md - implement immersive reader layout and chapter navigation wiring

### Phase 30: Reader Preferences and Progression Sync

Goal: Add essential reading preferences and safe backend progression synchronization.

Requirements: READER-03, READER-04, SYNC-01, SYNC-02

Scope:
- In-reader font size and light/dark mode controls.
- Preference application in active reading session.
- View count trigger integration on chapter access.
- Reading-history update/resume sync for authenticated users.

Success Criteria:
- Reader can change font size and theme mode while reading.
- Backend receives idempotent chapter view updates.
- Reader resume position/history persists and restores correctly.

Plans:
- [ ] 30-01-PLAN.md - implement reader settings controls and progression sync endpoints

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 28 | AUTHOR-01..AUTHOR-03 | Planned | 2 plans |
| 29 | READER-01..READER-02 | Planned | 1 plan |
| 30 | READER-03..READER-04, SYNC-01..SYNC-02 | Planned | 1 plan |

---

Next: /gsd:discuss-phase 28
