# Requirements: v1.9 Full Reader Productization

Defined: 2026-04-08
Core Value: Deliver a complete signed-in reader dashboard where payments, purchases, profile, and notifications work together.

## v1.9 Requirements

### Dashboard

- [x] DASH-01: User can open a dedicated dashboard with account summary cards for wallet, purchases, profile, and notifications.
- [x] DASH-02: User can navigate between dashboard sections without losing signed-in session context.

### Wallet & Payments

- [x] WAL-01: User can initiate wallet top-up and complete verification flow from the dashboard.
- [x] WAL-02: User can view current wallet balance and transaction history with clear status labels.

### Chapter Purchases

- [x] BUY-01: User can purchase locked chapters with clear confirmation and insufficient-balance handling.
- [x] BUY-02: Purchased access state is reflected immediately in chapter reading/navigation UI.

### Profile Management

- [x] PROF-01: User can view and update profile fields (nickname and avatar metadata) from dashboard settings.
- [x] PROF-02: User can review account identity/session information relevant to web profile management.

### Notifications

- [ ] NOTI-01: User can view notification inbox with unread/read grouping.
- [ ] NOTI-02: User can mark single notifications and all notifications as read.
- [ ] NOTI-03: User can manage notification preference toggles from dashboard settings.

## Future Requirements (Deferred)

- PAYUI-02: Withdrawal and payout management UX for author/admin finance operations.
- PROF-03: Advanced profile personalization (theme/layout and social links).
- NOTI-04: Push and email channel delivery configuration.

## Out of Scope (v1.9)

| Feature | Reason |
|---------|--------|
| Native mobile dashboard clients | v1.9 focuses on web completion first |
| Real-time websocket notification delivery | polling/incremental refresh is enough for this milestone |
| Full payment provider onboarding UX | backend rails already exist; this milestone prioritizes in-app flows |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 24 | Completed |
| DASH-02 | Phase 24 | Completed |
| WAL-01 | Phase 25 | Completed |
| WAL-02 | Phase 25 | Completed |
| BUY-01 | Phase 25 | Completed |
| BUY-02 | Phase 25 | Completed |
| PROF-01 | Phase 26 | Completed |
| PROF-02 | Phase 26 | Completed |
| NOTI-01 | Phase 27 | Pending |
| NOTI-02 | Phase 27 | Pending |
| NOTI-03 | Phase 27 | Pending |

Coverage:
- v1.9 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
Requirements defined: 2026-04-08
Last updated: 2026-04-08 after Phase 24 execution
