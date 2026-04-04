# WordPress to NestJS Migration

## What This Is

This project rebuilds a legacy novel-reading / webcomic platform from WordPress onto a NestJS backend with PostgreSQL and Prisma. The immediate focus is a safe one-time migration that preserves user financial balances, social login links, password hashes, VIP status, and purchased chapters without data loss.

## Core Value

Preserve every financially or identity-sensitive record during the migration, with a repeatable ETL process and verifiable totals.

## Requirements

### Validated

- ✓ Monorepo scaffold exists with `apps/web`, `apps/api`, and shared `packages/*` workspace structure — existing codebase
- ✓ NestJS API starter boots and serves a basic HTTP response from `apps/api/src/main.ts` and `apps/api/src/app.controller.ts` — existing codebase
- ✓ Next.js frontend starter renders an App Router page from `apps/web/app/page.tsx` — existing codebase

### Active

- [ ] Normalized Prisma schema separates user identity, social logins, wallet balance, transactions, VIP subscriptions, and purchased chapters.
- [ ] ETL script migrates WordPress MySQL data into PostgreSQL while preserving WP password hashes, social IDs, balances, VIP metadata, and purchased chapter history.
- [ ] Migration process is idempotent or safely resumable so it can be rerun without duplicating user-facing financial or purchase records.
- [ ] Verification checks prove wallet totals, social login mappings, and purchased chapter counts match the legacy source.

### Out of Scope

- WordPress theme or frontend redesign — this milestone is backend migration work only.
- New reader, discovery, or community features — they are separate product work after the migration foundation.
- Password rehashing or login migration off WP phpass — preserving existing hashes is required for compatibility.

## Context

The source system is a WordPress/MySQL installation with critical data spread across `wp_users`, `wp_social_users`, `tb_transactions`, and serialized values in `wp_usermeta`. The target system is a NestJS + PostgreSQL + Prisma backend in this repository, and the work must protect balances, social identities, and purchased books during migration.

The current workspace already contains a brownfield monorepo scaffold, including `apps/api`, `apps/web`, and `packages/ui`, plus a codebase map in `.planning/codebase/`.

## Constraints

- **Data Integrity**: Preserve financial balances, Google social IDs, and purchased chapter history exactly — these are the highest-risk records.
- **Compatibility**: Retain WordPress phpass password hashes — users must still be able to authenticate after migration.
- **Scale**: Purchased chapters may contain millions of rows — migration must use chunked batch writes instead of per-row inserts.
- **Source/Target**: Read from MySQL and write to PostgreSQL — the script must bridge two databases cleanly.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use a normalized Prisma schema with dedicated `User`, `UserProvider`, `Wallet`, `Transaction`, `VipSubscription`, and `PurchasedChapter` tables | Avoid duplicating serialized WordPress data and make large-table queries efficient | — Pending |
| Keep the original WordPress password hash string in the new user table | Preserve login compatibility during transition | — Pending |
| Batch purchased chapter inserts with `createMany()` and chunking | Prevent RAM overflow and keep migration fast at scale | — Pending |
| Treat migration as a one-time, resumable ETL rather than an always-on sync | Reduces complexity and matches the goal of platform replacement | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after initialization*