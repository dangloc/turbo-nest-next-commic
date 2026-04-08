# WordPress to NestJS Migration

## What This Is

A migration and product-delivery platform that preserves legacy WordPress data fidelity while serving a modern reading storefront through NestJS APIs and a web frontend.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling a high-quality reader experience that is fast, social, and monetization-ready.

## Current State

v1.7 is shipped and archived. Backend APIs now cover:
- Reader and social APIs (discovery, chapter analytics, bookmarks/history, nested comments, reactions).
- Financial engine APIs (payment intents/verification, wallet settlement, purchase safety, revenue split, withdrawal workflows).

v1.8 is now shipped with a complete web storefront baseline (auth, discovery, reader, social) on top of the existing backend APIs.

## Current Milestone

None active. Start the next milestone with /gsd:new-milestone.

## Validated Milestones

- v1.0: WordPress migration foundation shipped.
- v1.1: Content DB-to-DB migration and reconciliation shipped.
- v1.2: UGC ownership foundation shipped.
- v1.4: Ecosystem foundation schema expansion shipped.
- v1.5: Auth verification, RBAC, and CMS import shipped.
- v1.6: Core Reader API & Social Experience shipped.
- v1.7: Financial Engine & Payment Integration shipped.
- v1.8: Frontend web foundation (auth/discovery/reader/social) shipped.

## Out of Scope (v1.8)

- Production payment gateway hardening and live settlement rollout.
- Automated payout rails and financial reporting dashboards.
- Native mobile apps (focus is web storefront foundation).

## Evolution

This document evolves at phase transitions and milestone boundaries.

After each phase transition (via /gsd-transition):
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. What This Is still accurate? Update if drifted.

After each milestone (via /gsd:complete-milestone):
1. Full review of all sections.
2. Core Value check.
3. Out-of-Scope audit.
4. Context refresh with current delivered state.

---

*Last updated: 2026-04-08 after v1.8 milestone completion*
