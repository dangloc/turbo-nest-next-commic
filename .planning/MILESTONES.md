# Project Milestones: WordPress to NestJS Migration

## v1.14 Identity & Account Experience (Shipped: 2026-04-13)

**Delivered:** Local authentication, profile/security management, and wallet/purchase-history dashboard flows for the account experience.

**Phases completed:** 5 phases, 5 plans, 0 tasks

**Key accomplishments:**

- Delivered local login/register UI with client-side validation, inline errors, and session bootstrap integration.
- Added profile-management and password-change verification across dashboard and API wiring.
- Exposed wallet balance, VIP metadata, and paginated purchase history in the dashboard.
- Added phase-level verification artifacts for account requirements so milestone audit can pass.
- Closed the milestone audit with verified requirement coverage and no blocking integration gaps.

**Stats:**

- 10 files created/modified
- 404 lines of code (primary language)
- 5 phases, 5 plans, 0 tasks
- 1 day from initialization to ship

**Git range:** `docs(35)` → `feat(39-01)`

**What's next:** Project complete or next milestone planning after stakeholder review.


---

## v1.12 Creator Growth and Reader Personalization (Shipped: 2026-04-11)

**Delivered:** Creator follow growth features, advanced typography personalization, and deterministic cross-device progression sync with conflict-safe merge behavior.

**Phases completed:** 3 phases, 6 plans, 12 tasks

**Key accomplishments:**

- Added authenticated follow and unfollow actions with public follower visibility on author profiles.
- Delivered advanced reader typography controls with persistent preferences for font family, line height, and content width.
- Implemented deterministic backend progression merge policy with explicit conflict metadata for stale-vs-newer updates.
- Integrated frontend reconciliation flow that applies effective server progress across sessions.
- Added explicit reader sync status feedback to communicate accepted updates and server-kept checkpoints.

---

## v1.11 Reader Experience and Creator Discovery (Shipped: 2026-04-11)

**Delivered:** Public author discovery surfaces plus an immersive chapter-reading experience with progression sync and in-reader preference controls.

**Phases completed:** 3 phases, 7 plans, 12 tasks

**Key accomplishments:**

- Shipped public author profile pages with identity metadata, author catalog discovery, and aggregate platform statistics.
- Delivered core chapter reader navigation contracts and deterministic previous/next plus table-of-contents flow.
- Added authenticated idempotent chapter-open progression sync endpoint to prevent duplicate view-count increments.
- Integrated frontend resume-aware chapter sync so authenticated readers retain consistent reading continuity.
- Added in-reader persisted preferences for font size and light/dark reading mode with immediate visual application.

---

## v1.10 Notification Center & Dynamic Content (Shipped: 2026-04-09)

**Phases completed:** 1 phase, 1 plan, 2 tasks

**Key accomplishments:**

- Added user-scoped notification API endpoints for inbox retrieval, mark-one/mark-all read, and preference updates.
- Added notification service and controller test suite (9 passing tests) covering success and ownership/error paths.
- Shipped dashboard notification inbox with unread/read grouping, per-item mark-read, and mark-all-read actions.
- Added notification preference panel with toggle persistence from dashboard.
- Integrated notification feature module into dashboard section routing and responsive UI styles.

---

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

Latest update: 2026-04-11 after v1.12 completion
