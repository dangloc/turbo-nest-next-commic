# Requirements: v1.8 Frontend Web Foundation

Milestone: v1.8
Defined: 2026-04-08
Core Value: Deliver the first complete web storefront experience on top of the shipped backend APIs.

## v1.8 Requirements

### Frontend Init & Auth

- [ ] WEB-01: Initialize and configure the web frontend foundation (routing/layout/feature folder conventions and environment-based API base URL wiring).
- [ ] WEB-02: Implement shared API client utilities with typed request/response handling, auth-aware headers, and consistent error mapping.
- [ ] AUTH-01: Integrate Google OAuth login flow in the web app against existing backend auth endpoints/session behavior.
- [ ] AUTH-02: Provide authenticated user state bootstrapping (session load on app start, sign-in state persistence, sign-out UX path).

### Novel Discovery UI

- [ ] DISC-01: Build homepage discovery UI that consumes discovery APIs and renders novel lists/cards with loading and empty states.
- [ ] DISC-02: Build category/filter UI that supports pagination, sorting, and taxonomy filters mapped to discovery API query params.
- [ ] DISC-03: Ensure discovery pages are shareable via URL query state (pagination/filter/sort reflected in the URL).

### Reader Experience UI

- [ ] READ-01: Build chapter reading page that fetches and renders chapter content with novel/chapter navigation context.
- [ ] READ-02: Trigger backend chapter view-count update flow when chapter view is opened.
- [ ] READ-03: Persist and resume reading progress/history through existing reader personal APIs for authenticated users.

### Social UI

- [ ] SOC-01: Render nested comment threads for chapter/novel scope using social comments APIs with deterministic parent-reply display.
- [ ] SOC-02: Allow authenticated users to submit top-level comments and replies with inline validation/error states.
- [ ] SOC-03: Support reaction toggles on comments with immediate UI update and eventual backend consistency.

## Future Requirements (Deferred)

- [ ] PAYUI-01: Payment and wallet frontend screens (deposit/purchase/withdrawal management).
- [ ] PROF-01: Full user profile management experience.
- [ ] NOTI-01: Notification center and in-app unread tracking UI.

## Out of Scope (v1.8)

- Visual redesign system overhaul and advanced marketing pages.
- Native mobile application clients.
- Live payment gateway production hardening and payout operations interfaces.

## Traceability

| Requirement | Category | Phase | Status |
|-------------|----------|-------|--------|
| WEB-01 | Frontend Foundation | 20 | Planned |
| WEB-02 | Frontend Foundation | 20 | Planned |
| AUTH-01 | Frontend Auth | 20 | Planned |
| AUTH-02 | Frontend Auth | 20 | Planned |
| DISC-01 | Discovery UI | 21 | Planned |
| DISC-02 | Discovery UI | 21 | Planned |
| DISC-03 | Discovery UI | 21 | Planned |
| READ-01 | Reader UI | 22 | Planned |
| READ-02 | Reader UI | 22 | Planned |
| READ-03 | Reader UI | 22 | Planned |
| SOC-01 | Social UI | 23 | Planned |
| SOC-02 | Social UI | 23 | Planned |
| SOC-03 | Social UI | 23 | Planned |

---

v1.8 requirements baseline created.
