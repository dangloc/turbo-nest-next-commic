# WordPress to NestJS Migration

## What This Is

A migration and product-delivery platform that preserves legacy WordPress data fidelity while serving a modern reading storefront through NestJS APIs and a web frontend with monetization and social features.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling a high-quality reader experience that is fast, social, monetization-ready, and fully dashboard-discoverable.

## Current State

v1.10 shipped a complete notification center inside the dashboard:
- Notification inbox grouped into unread/read collections.
- Single and batch mark-as-read actions with persistent backend state.
- Notification preference controls persisted from dashboard settings.
- End-to-end API and frontend integration validated (notification API tests + web typecheck/lint).

Next: v1.11 focuses on dynamic content discovery and notification channel expansion.

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
- ✅ v1.10: Notification Center & Dynamic Content (notification inbox and preferences).

## Active Milestone: v1.11 Dynamic Content Discovery & Channel Expansion

Goal: Expand discovery relevance and broaden notification delivery beyond in-app inbox actions.

Target features:
- Genre/tag based dynamic content filtering and retrieval flows.
- Recommendation baseline from reading history signals.
- Author follow and digest-ready relationship data.
- Notification channel expansion foundation (push/email preference channels).

Out of scope (v1.11 candidate constraints):
- Full real-time websocket fan-out.
- Native mobile application notification integration.
- Advanced personalization ML ranking.

## Key Decisions (v1.9-v1.10)

| Decision | Outcome | Phase |
|----------|---------|-------|
| Dashboard sections via ?section={id} queries before dedicated routes | ✓ Stable, unified navigation; enables parallel section work | 24 |
| Session guards via AppContext + storage + fetchSession fallback | ✓ Preserves existing auth behavior; no regressions | 24 |
| Feature-local module structure (types/api/view split) | ✓ Consistent with discovery/reader/social; reduces friction | 24-27 |
| Deterministic purchase status mapping (including insufficient_balance) | ✓ Clear error paths in UX; prevents silent failures | 25 |
| Notification inbox + preference controls inside dashboard section model | ✓ Reuses established patterns and keeps account actions centralized | 27 |

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

*Last updated: 2026-04-09 after v1.10 milestone completion*
