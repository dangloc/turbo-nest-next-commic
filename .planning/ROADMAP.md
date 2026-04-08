# Roadmap: WordPress to NestJS Migration v1.8

Milestone: v1.8 - Frontend Web Foundation
Created: 2026-04-08
Status: active

## Phases

### Phase 20: Frontend Foundation & Auth Integration

Goal: Establish the web app foundation, shared API client layer, and authenticated session experience.

Requirements: WEB-01, WEB-02, AUTH-01, AUTH-02

Scope:
- Organize frontend architecture for scalable feature modules.
- Create typed API client and auth-aware request helpers.
- Integrate Google OAuth login/session state with backend auth flow.

Success Criteria:
- Frontend bootstraps with environment-aware API client wiring.
- Login/logout and session rehydration behavior work end to end.
- Shared API client is reused by downstream discovery/reader/social features.

### Phase 21: Novel Discovery UI

Goal: Ship public storefront discovery pages backed by existing reader discovery APIs.

Requirements: DISC-01, DISC-02, DISC-03

Scope:
- Homepage and category discovery views.
- Pagination/sort/filter controls mapped to API queries.
- URL-synced query state for shareable storefront navigation.

Success Criteria:
- Discovery lists render correctly from API data with robust loading/empty/error states.
- Pagination and filtering round-trip between UI and backend.
- URL query state reproduces the same discovery result set when shared/reloaded.

### Phase 22: Reader Experience UI

Goal: Deliver the core chapter reading experience integrated with backend analytics and history APIs.

Requirements: READ-01, READ-02, READ-03

Scope:
- Chapter reading interface with navigation context.
- View-count trigger integration.
- Reading history update/resume behavior for authenticated readers.

Success Criteria:
- Readers can open chapters and navigate reliably.
- Chapter openings trigger backend view analytics flow.
- Authenticated readers resume from persisted history/progress.

### Phase 23: Social Interaction UI

Goal: Integrate nested comment and reaction interactions into the chapter/novel reading experience.

Requirements: SOC-01, SOC-02, SOC-03

Scope:
- Nested comment tree rendering.
- Comment/reply submission UI with validation and state feedback.
- Reaction toggle UX connected to social APIs.

Success Criteria:
- Comment threads and replies display in stable nested order.
- Authenticated users can post comments/replies successfully.
- Reaction toggles update UI quickly and remain API-consistent after refresh.

## Dependency Graph

Phase 20 (Frontend Foundation & Auth Integration)
  -> Phase 21 (Novel Discovery UI)
  -> Phase 22 (Reader Experience UI)
  -> Phase 23 (Social Interaction UI)

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 20 | WEB-01..AUTH-02 | Planned | 1-2 plans |
| 21 | DISC-01..DISC-03 | Planned | 1-2 plans |
| 22 | READ-01..READ-03 | Planned | 1-2 plans |
| 23 | SOC-01..SOC-03 | Planned | 1-2 plans |

---

Next: /gsd:plan-phase 20
