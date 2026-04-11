# WordPress to NestJS Migration

## What This Is

A migration and product-delivery platform that preserves legacy WordPress data fidelity while serving a modern reading storefront through NestJS APIs and a web frontend with monetization and social features.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling a high-quality reader experience that is fast, social, monetization-ready, and fully dashboard-discoverable.

## Current State

v1.11 shipped and archived:
- Public author profile discovery surface with creator identity, catalog visibility, and aggregate stats.
- Core chapter reader interface with immersive layout, TOC navigation, and boundary-safe previous/next controls.
- Reader progression sync with authenticated idempotent chapter-open tracking and resume continuity.
- In-reader preference controls for persisted font size and light/dark theme.

## Current Milestone: v1.12 Creator Growth and Reader Personalization

Goal: Increase creator retention and reader session quality by introducing social following, richer reading customization, and cross-device resume continuity.

Target features:
- Author follow graph and follower visibility on public author surfaces.
- Advanced typography controls (font family, line height, content width) for long-form reading comfort.
- Cross-device progression sync so authenticated readers can resume from their latest position across devices.

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
- ✅ v1.11: Reader Experience & Creator Discovery (author profiles, chapter reader, progression sync, preferences).

## Key Decisions (v1.9-v1.12)

| Decision | Outcome | Phase |
|----------|---------|-------|
| Dashboard sections via ?section={id} queries before dedicated routes | ✓ Stable, unified navigation; enables parallel section work | 24 |
| Session guards via AppContext + storage + fetchSession fallback | ✓ Preserves existing auth behavior; no regressions | 24 |
| Feature-local module structure (types/api/view split) | ✓ Consistent with discovery/reader/social; reduces friction | 24-27 |
| Deterministic purchase status mapping (including insufficient_balance) | ✓ Clear error paths in UX; prevents silent failures | 25 |
| Notification inbox + preference controls inside dashboard section model | ✓ Reuses established patterns and keeps account actions centralized | 27 |
| Reader progression updates must be idempotent and session-safe | ✓ Implemented via authenticated chapter-open sync contract and guarded client integration | 30 |
| Follow graph must remain public-read but authenticated-write | — Planned in v1.12 | 31 |
| Cross-device resume sync must be conflict-safe and deterministic | — Planned in v1.12 | 33 |

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
2. Core Value check - still the one thing?
3. Out-of-Scope audit - still valid reasoning?
4. Context refresh with current delivered state.
5. Shift milestones: Shipped -> previous, Active -> next.

---

*Last updated: 2026-04-11 after v1.12 milestone initialization*
