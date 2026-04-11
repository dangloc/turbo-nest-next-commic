# Roadmap: WordPress to NestJS Migration

Milestone: v1.11 - Reader Experience and Creator Discovery
Created: 2026-04-09
Status: Phase 30 complete; milestone v1.11 delivered

## Milestones

- [done] v1.9 Full Reader Productization (shipped 2026-04-09) - see .planning/milestones/v1.9-ROADMAP.md
- [done] v1.10 Notification Center and Dynamic Content (shipped 2026-04-09) - see .planning/milestones/v1.10-ROADMAP.md
- [active] v1.11 Reader Experience and Creator Discovery (in progress)

## Phases

### Phase 28: Public Author Profiles

Status: 100% Complete (Shipped 2026-04-11)

Goal: Deliver public creator profile pages that expose author identity, catalog, and aggregate platform stats.

Requirements: AUTHOR-01 complete, AUTHOR-02 complete, AUTHOR-03 complete

Scope:
- Public author profile route and server/API data contract.
- Author metadata rendering with safe empty-state handling.
- Author novel catalog listing with links into discovery and reader flow.
- Aggregate creator stats section (including total views baseline).

Success Criteria:
- Reader can visit a public author URL and see author info without authentication errors.
- Reader can browse authored novels from the profile page.
- Aggregate stats render accurately from backend payload.

Plans Completed:
- [x] 28-01-SUMMARY.md - Backend author profile contract and public stats endpoint
- [x] 28-02-SUMMARY.md - Public /author/[id] route with discovery-consistent catalog UI
- [x] 28-COMPLETION-SUMMARY.md - Full phase completion report

### Phase 29: Core Chapter Reader Interface

Status: 100% Complete (Shipped 2026-04-11)

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
- [x] 29-01-PLAN.md - add backend chapter context endpoint for TOC and boundary navigation
- [x] 29-02-PLAN.md - implement immersive reader UI with prev/next and TOC jumps
- [x] 29-COMPLETION-SUMMARY.md - full phase completion report

### Phase 30: Reader Preferences and Progression Sync

Status: 100% Complete (Shipped 2026-04-11)

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

Plans Completed:
- [x] 30-01-SUMMARY.md - backend idempotent chapter-open sync endpoint and contracts
- [x] 30-02-SUMMARY.md - frontend chapter-open and resume progression integration
- [x] 30-03-SUMMARY.md - in-reader font size and theme preferences with persistence
- [x] 30-COMPLETION-SUMMARY.md - full phase completion report

## Progress

| Phase | Requirements | Status | Plans | Completion |
|-------|--------------|--------|-------|------------|
| 28 | AUTHOR-01..AUTHOR-03 | Complete | 2 done | 2026-04-11 |
| 29 | READER-01, READER-02 | Complete | 2 done | 2026-04-11 |
| 30 | READER-03, READER-04, SYNC-01, SYNC-02 | Complete | 3 done | 2026-04-11 |

---

Next Action: Start next milestone planning (v1.12)
