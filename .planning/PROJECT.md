# WordPress to NestJS Migration

## What This Is

A migration and product-delivery platform that preserves legacy WordPress data fidelity while serving a modern reading storefront through NestJS APIs and a web frontend with monetization and social features.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling a high-quality reader experience that is fast, social, monetization-ready, and fully dashboard-discoverable.

## Current State

v1.9 shipped a complete user dashboard with account management:
- Dashboard shell provides centralized entry to wallet, purchases, profile, and notifications.
- Wallet top-up flow with VNPAY/MOMO provider checkout and payment verification.
- Chapter purchase UX with confirmation, insufficient-balance handling, and immediate unlock.
- Profile management (read/update) with account identity visibility.
- Transaction history and purchase activity tracking.

Next: v1.10 delivers notification center with inbox, read management, and preference controls.

## Shipped Milestones

- ✅ v1.0: WordPress migration foundation.
- ✅ v1.1: Content DB-to-DB migration and reconciliation.
- ✅ v1.2: UGC ownership foundation.
- ✅ v1.4: Ecosystem foundation schema expansion.
- ✅ v1.5: Auth verification, RBAC, and CMS import.
- ✅ v1.6: Core Reader API & Social Experience.
- ✅ v1.7: Financial Engine & Payment Integration.
- ✅ v1.8: Frontend Web Foundation (auth/discovery/reader/social).
- ✅ v1.9: Full Reader Productization (dashboard/wallet/purchases/profile).

## Active Milestone: v1.10 Notification Center & Dynamic Content

Goal: Complete notification management and lay groundwork for content discovery dynamics.

Target features:
- Notification inbox with read/unread grouping.
- Mark-one and mark-all read actions.
- Notification preference toggles in dashboard settings.

Deferred to v1.11+:
- Real-time websocket notification delivery (polling sufficient for v1.10).
- Mobile app notification delivery (web-first in v1.10).
- Advanced content discovery and recommendation algorithms.

## Out of Scope (v1.10)

- Native mobile application UX and push notification delivery.
- Live payment settlement operations and advanced finance admin dashboards.
- Major visual redesign or branding system replacement.
- Email channel delivery configuration.

## Key Decisions (v1.9)

| Decision | Outcome | Phase |
|----------|---------|-------|
| Dashboard sections via ?section={id} queries before dedicated routes | ✓ Stable, unified navigation; enables parallel section work | 24 |
| Session guards via AppContext + storage + fetchSession fallback | ✓ Preserves existing auth behavior; no regressions | 24 |
| Feature-local module structure (types/api/view split) | ✓ Consistent with discovery/reader/social; reduces friction | 24-26 |
| Deterministic purchase status mapping (including insufficient_balance) | ✓ Clear error paths in UX; prevents silent failures | 25 |
| Immediate unlock refresh on successful purchase (no page reload) | ✓ Better UX; proves session/context sync works end-to-end | 25 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

After each phase:
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Shipped with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. What This Is still accurate? Update if drifted.

After each milestone:
1. Full review of all sections.
2. Core Value check — still the one thing?
3. Out-of-Scope audit — still valid reasoning?
4. Context refresh with current delivered state.
5. Shift milestones: Shipped → previous, Active → next.

---

*Last updated: 2026-04-09 after v1.9 milestone completion*
