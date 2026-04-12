# WordPress to NestJS Migration

## What This Is

A migration and product-delivery platform that preserves legacy WordPress data fidelity while serving a modern reading storefront through NestJS APIs and a web frontend with monetization and social features.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling a high-quality reader experience that is fast, social, monetization-ready, and fully dashboard-discoverable.

## Current State

v1.13 shipped and archived:
- Legacy WordPress user financial data migration using single `wp_usermeta` pivot queries as source of truth.
- PHP-serialized chapter purchase transformation and normalization.
- Bulk Prisma loading for wallet balance, VIP level, and purchase history (fully idempotent with skipDuplicates).

Complete financial ETL pipeline now available for production migration scenarios.

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
- ✅ v1.10: Notification Center & Dynamic Content.
- ✅ v1.11: Reader Experience & Creator Discovery.
- ✅ v1.12: Creator Growth & Reader Personalization.
- ✅ v1.13: Legacy Financial ETL Import.

## Next Milestone

v1.14 to be defined via `/gsd:new-milestone`. Areas of potential focus:
- Data validation and post-migration reconciliation UX
- Additional creator tools and monetization features
- Advanced content discovery and recommendations
- Platform stability and performance optimization

## Key Decisions (v1.9-v1.13)

| Decision | Outcome | Phase |
|----------|---------|-------|
| Dashboard sections via ?section={id} queries before dedicated routes | ✓ Stable, unified navigation; enables parallel section work | 24 |
| Session guards via AppContext + storage + fetchSession fallback | ✓ Preserves existing auth behavior; no regressions | 24 |
| Feature-local module structure (types/api/view split) | ✓ Consistent with discovery/reader/social; reduces friction | 24-27 |
| Deterministic purchase status mapping (including insufficient_balance) | ✓ Clear error paths in UX; prevents silent failures | 25 |
| Notification inbox + preference controls inside dashboard section model | ✓ Reuses established patterns and keeps account actions centralized | 27 |
| Reader progression updates must be idempotent and session-safe | ✓ Implemented via authenticated chapter-open sync contract and guarded client integration | 30 |
| Follow graph must remain public-read but authenticated-write | ✓ Shipped | 31 |
| Cross-device resume sync must be conflict-safe and deterministic | ✓ Shipped | 33 |
| Legacy financial ETL must source truth from wp_usermeta pivots, not wp_users | ✓ Implemented via single grouped CASE WHEN query with bulk Prisma loading | 34 |

## Active Requirements for Next Milestone

(To be defined in v1.14 requirements document)

## Evolution Notes

- **After v1.12:** Added cross-device sync, advanced personalization.
- **After v1.13:** Financial migration pipeline complete; all legacy user data now importable via ETL.
- **After v1.14:** To be determined based on roadmap priorities and user feedback.

This document evolves at phase transitions and milestone boundaries:

1. Requirements validated in shipped milestone → move to archived milestone REQUIREMENTS.md
2. New requirements defined in next milestone → create fresh REQUIREMENTS.md
3. Key Decisions → logged with outcome for historical reference
4. Core Value check → still the one thing? (Yes, preserving fidelity while enabling great UX)
5. What This Is accuracy → accurate after each phase

---

*Last updated: 2026-04-12 after v1.13 milestone completion*
