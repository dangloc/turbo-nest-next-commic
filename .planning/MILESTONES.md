# Project Milestones: WordPress to NestJS Migration

## v1.9 Full Reader Productization (Shipped: 2026-04-09)

**Phases completed:** 3 phases, 4 plans, 4 tasks

**Key accomplishments:**

- Dashboard shell with session guards and section navigation (wallet, purchases, profile, notifications) enables centralized account management.
- Wallet top-up flow with VNPAY/MOMO provider checkout and payment verification delivered; balance and transaction history visible in dashboard.
- Chapter purchase flow with confirmation, insufficient-balance handling, and immediate unlock propagation in reader navigation.
- Dashboard purchases section shows recent purchase activity and spending summary from transaction ledger.
- Profile management dashboard with read/update auth contracts and account identity/session visibility.

---

## v1.8 Frontend Web Foundation (Shipped: 2026-04-08)

**Phases completed:** 4 phases, 5 plans

**Key accomplishments:**

- Frontend foundation contracts, provider wiring, and reusable API/auth client scaffolding shipped.
- Google auth login/session bootstrap and logout flows integrated end-to-end with backend auth endpoints.
- Discovery storefront shipped with URL-synced pagination, sorting, and category navigation.
- Reader experience shipped with chapter navigation, analytics trigger path, and progress/history persistence.
- Social discussion shipped with nested comments, replies, and reaction toggles in chapter and novel views.

---

## v1.7 Financial Engine & Payment Integration (Shipped: 2026-04-08)

**Phases completed:** 2 phases, 3 plans

**Key accomplishments:**

- Payment intent/verification and idempotent wallet settlement shipped.
- Purchase flow delivered with duplicate/insufficient-funds safety.
- 95/5 revenue split shipped with audit ledger markers.
- Author withdrawal request flow shipped with earned-balance freeze.
- Admin withdrawal listing and approve/reject workflows shipped.
- API regression and typecheck passed at closeout (33 suites, 149 tests).

---

## v1.6 Core Reader API & Social Experience (Shipped: 2026-04-08)

**Phases completed:** 2 phases, 2 plans, 6 tasks

**Key accomplishments:**

- Novel and chapter retrieval with multi-level filtering shipped.
- Comment crud, nested replies, and character counting completed.
- Reaction endpoints (add/remove) for chapters and comments delivered.
- Author novel list and user profile endpoints shipped with pagination.

---

*Latest update: 2026-04-09 after v1.9 completion*
