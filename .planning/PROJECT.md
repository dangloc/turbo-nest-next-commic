# WordPress to NestJS Migration

## What This Is

A migration and product-delivery platform that preserves legacy WordPress data fidelity while serving a modern reading storefront through NestJS APIs and a web frontend with monetization and social features.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling a high-quality reader experience that is fast, social, monetization-ready, and fully dashboard-discoverable.

## Current State

v1.15 shipped and archived on 2026-04-20:
- Admin Dashboard foundational UI rebuilt with `shadcn-admin` layout patterns and route groups.
- Novel & Chapter Management converted to robust Data Tables supporting server-side processing visual setups.
- Reader Monetization features enhanced, covering VIP bypass logic and contextual combination UI pricing.
- Added visual mockups for User and Wallet Management admin tables.

v1.16 revenue pipeline work is active:
- Phase 53 completed and verified on 2026-04-27: `/top-up` now offers eight fixed VND packages, defaults to 100.000 VND, calls `initSePayCheckout`, and redirects through the returned SePay POST form.

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
<details>
<summary>Archived Releases (v1.0 - v1.14)</summary>
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
- ✅ v1.14: Identity & Account Experience.
</details>
- ✅ v1.15: Novel Management Productivity.

## Key Decisions (v1.9-v1.14)

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
| Local auth frontend should preserve Google fallback while promoting first-party login | ✓ Shipped in v1.14 | 35 |
| Auth session handoff must keep dashboard/profile/finance flows immediately accessible | ✓ Verified across phases 36-39 | 38-39 |

## Evolution Notes

- **After v1.12:** Added cross-device sync, advanced personalization.
- **After v1.13:** Financial migration pipeline complete; all legacy user data now importable via ETL.
- **After v1.14:** Local auth and account-management UX are now first-class, with legacy wallet/purchase history exposed in the dashboard.

---

*Last updated: 2026-04-27 after Phase 53 verification*
