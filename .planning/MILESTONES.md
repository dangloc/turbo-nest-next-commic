# Project Milestones: WordPress to NestJS Migration

## v1.8 Frontend Web Foundation (Shipped: 2026-04-08)

**Phases completed:** 4 phases, 5 plans

**Key accomplishments:**

- Frontend foundation contracts, provider wiring, and reusable API/auth client scaffolding shipped.
- Google auth login/session bootstrap and logout flows integrated end-to-end with backend auth endpoints.
- Discovery storefront shipped with URL-synced pagination, sorting, and category navigation.
- Reader experience shipped with chapter navigation, analytics trigger path, and progress/history persistence.
- Social discussion shipped with nested comments, replies, and reaction toggles in chapter and novel views.

**What's next:** Define the next milestone with /gsd:new-milestone.

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

**What's next:** Define the next milestone with /gsd:new-milestone.

---

## v1.6 Core Reader API & Social Experience (Shipped: 2026-04-08)

**Phases completed:** 2 phases, 2 plans, 6 tasks

**Key accomplishments:**

- Public reader discovery ships pagination, sorting, and taxonomy-based filtering.
- Chapter reads increment chapter and novel view counts with transactional safety.
- Authenticated bookmark and reading-history APIs support resume UX.
- Nested comment threads return deterministic reply trees for novel and chapter scopes.
- Comment creation validates scope inheritance and ownership.
- Reaction toggles enforce the unique user/comment constraint without duplicate records.

**What's next:** Define the next milestone with /gsd:new-milestone.

---

## v1.5 Auth Verification & CMS Import Foundation (Shipped: 2026-04-08)

**Phases completed:** 2 phases, 2 plans, 6 tasks

**Key accomplishments:**

- Google OAuth strategy with legacy account linking.
- Role-based access control shipped with @Roles() + RolesGuard.
- ADMIN-only CMS import endpoint and parser pipeline shipped.

---

## v1.2 User-Generated Content (UGC) Foundation (Shipped: 2026-04-08)

**Phases completed:** 1 phase, 1 plan

**Key accomplishments:**

- Uploader ownership semantics added safely for migrated content.

---

## v1.1 Content Migration (Shipped: 2026-04-07)

**Phases completed:** 3 phases, 5 plans

**Key accomplishments:**

- Strict DB-to-DB content migration and reconciliation shipped.

---

## v1.0 WordPress Migration Foundation (Shipped: 2026-04-07)

**Phases completed:** 5 phases, 9 plans

**Key accomplishments:**

- Migration foundation and parity/reconciliation tooling shipped.
