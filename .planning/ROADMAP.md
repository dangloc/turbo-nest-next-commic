# Roadmap: WordPress to NestJS Migration v1.9

Milestone: v1.9 - Full Reader Productization
Created: 2026-04-08
Status: active

## Milestones

- [done] v1.8 Frontend Web Foundation (shipped 2026-04-08) - see .planning/milestones/v1.8-ROADMAP.md
- [active] v1.9 Full Reader Productization (in progress)

## Phases

### Phase 24: Dashboard Foundation

Goal: Deliver a signed-in dashboard shell that centralizes account entry points and section navigation.

Requirements: DASH-01, DASH-02

Scope:
- Dashboard landing structure with summary modules.
- Section routing/navigation for wallet, purchases, profile, and notifications.
- Session-aware access control and error/loading states.

Success Criteria:
- Authenticated users can access the dashboard and see account summary modules.
- Navigation between dashboard sections preserves session context.
- Unauthenticated users are redirected to sign-in flow consistently.

Plans:
- [x] 24-01-PLAN.md - dashboard shell, navigation contracts, and session guards

### Phase 25: Wallet Top-Up and Chapter Purchases

Goal: Ship monetization UX for wallet funding and chapter unlock purchases.

Requirements: WAL-01, WAL-02, BUY-01, BUY-02

Scope:
- Wallet top-up initiation and verification UX.
- Wallet balance and transaction history views.
- Chapter purchase flow and post-purchase state refresh in reader pages.

Success Criteria:
- Users can complete wallet top-up and see updated balance/history.
- Chapter purchase flow handles confirm/success/insufficient-balance paths.
- Purchased chapter access updates immediately in reading experience.

Plans:
- [ ] 25-01-PLAN.md - wallet summary API, top-up verification UX, and transaction history
- [ ] 25-02-PLAN.md - chapter purchase UX, insufficient-balance handling, and instant unlock state

### Phase 26: Profile Management Dashboard

Goal: Provide account profile management inside the dashboard.

Requirements: PROF-01, PROF-02

Scope:
- Profile view/edit screen for user metadata.
- Account identity/session details panel.
- Form validation and profile update feedback states.

Success Criteria:
- Users can update profile fields and see persisted values.
- Account identity/session details are visible and accurate.
- Validation and error states are clear and recoverable.

Plans:
- [x] 26-01-PLAN.md - profile data contracts, settings UI, and update flows

### Phase 27: Notification Center and Preferences

Goal: Complete notification management with inbox actions and preference controls.

Requirements: NOTI-01, NOTI-02, NOTI-03

Scope:
- Notification inbox grouped by read/unread state.
- Mark-one and mark-all read interactions.
- Notification preference settings integrated into dashboard.

Success Criteria:
- Users can read and manage notification states without page reload friction.
- Mark-all and per-item actions remain consistent after refresh.
- Preference updates persist and are reflected in UI state.

Plans:
- [ ] 27-01-PLAN.md - notification inbox and preference settings

## Dependency Graph

Phase 24 (Dashboard Foundation)
  -> Phase 25 (Wallet Top-Up and Chapter Purchases)
  -> Phase 26 (Profile Management Dashboard)
  -> Phase 27 (Notification Center and Preferences)

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 24 | DASH-01..DASH-02 | Completed | 1 plan |
| 25 | WAL-01..BUY-02 | Planned | 2 plans |
| 26 | PROF-01..PROF-02 | Completed | 1 plan |
| 27 | NOTI-01..NOTI-03 | Planned | 1 plan |

---

Next: /gsd:execute-phase 25 --wave 2
