# Roadmap: WordPress to NestJS Migration

Milestone: v1.11 - Dynamic Content Discovery & Channel Expansion
Created: 2026-04-09
Status: planning

## Milestones

- [done] v1.9 Full Reader Productization (shipped 2026-04-09) - see .planning/milestones/v1.9-ROADMAP.md
- [done] v1.10 Notification Center & Dynamic Content (shipped 2026-04-09) - see .planning/milestones/v1.10-ROADMAP.md
- [active] v1.11 Dynamic Content Discovery & Channel Expansion (in progress)

## Phases

### Phase 28: Dynamic Content Discovery Foundation

Goal: Deliver filterable discovery and recommendation-ready content retrieval contracts.

Requirements: CONTENT-01, CONTENT-02

Scope:
- Genre/tag based discovery filtering contracts and query flows.
- Reading-history driven recommendation baseline endpoint contracts.
- Frontend discovery integration for dynamic filters.

Success Criteria:
- Users can filter content by taxonomy dimensions with stable pagination.
- Recommendation endpoint returns deterministic data shape for UI rendering.
- Discovery UI can consume and render dynamic content payloads without regressions.

Plans:
- [ ] 28-01-PLAN.md - define discovery contracts, API query layer, and frontend integration

### Phase 29: Follow and Notification Channel Expansion

Goal: Add follow-driven digest signals and broaden notification channel preferences.

Requirements: CONTENT-03, NOTI-04

Scope:
- Author follow relationship model and APIs.
- Digest-ready payload shape for followed-author updates.
- Notification preference channel expansion (in-app + channel settings baseline).

Success Criteria:
- Users can follow/unfollow authors and retrieve follow state.
- Digest payload data source exists for downstream delivery workers.
- Notification preference model captures channel-level enablement.

Plans:
- [ ] 29-01-PLAN.md - implement follow APIs and channel preference contracts

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 28 | CONTENT-01, CONTENT-02 | Planned | 1 plan |
| 29 | CONTENT-03, NOTI-04 | Planned | 1 plan |

---

Next: /gsd:discuss-phase 28
