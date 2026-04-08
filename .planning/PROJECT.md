# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration program for a legacy WordPress novel/webcomic platform. v1.0 established financial and identity record preservation, v1.1 completed strict content migration, v1.2 completed UGC ownership foundation, v1.3 shipped taxonomy and tag infrastructure, and v1.4 expanded the schema for platform ecosystem features (VIP tiers, author monetization, gamification, social) with deterministic backfill of legacy VIP and wallet data.

**Current State:** 13 phases shipped. 184 novels/chapters migrated with exact IDs, ownership, and taxonomy preserved. Schema expanded with ecosystem models and financial data safely decomposed.

## Core Value

Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## Current Milestone: v1.5 (Next)

**Goal:** Implement author center and gamification foundation business logic on top of v1.4 schema expansion.

**Target features:**
- Author profile editing and pen name management
- Withdrawal request workflow for payout processing
- Mission fulfillment engine with points distribution
- Basic gamification UI integration
- Notification delivery system for ecosystem events

*Scope will be refined during `/gsd:new-milestone v1.5` requirements definition.*

## Validated Requirements (All Milestones v1.0-v1.4)

**v1.0 - Foundation (4 requirements):**
- [x] Data model normalization and legacy identity preservation
- [x] ETL extraction, transformation, and loading with resumable semantics
- [x] Post-migration verification for critical parity checks
- [x] Secure handling of financial and user identity data

**v1.1 - Content Migration (2 requirements):**
- [x] Strict DB-to-DB content migration with exact IDs and raw content fidelity
- [x] Content reconciliation and rerun safety verification

**v1.2 - UGC Foundation (2 requirements):**
- [x] Uploader ownership relation from User to Novel
- [x] Required `uploaderId` on Novel with safe default assignment

**v1.3 - Taxonomy Infrastructure (6 requirements):**
- [x] WordPress terms stored in PostgreSQL with original term IDs
- [x] Taxonomy model supports multiple WordPress taxonomy types
- [x] Novel-to-term many-to-many relationships established
- [x] Existing migrated novels linked to WordPress taxonomy terms
- [x] Taxonomy migration is non-destructive to existing data
- [x] Migration logic remains rerunnable with no duplicates

**v1.4 - Ecosystem Foundation (14 requirements):**
- [x] VipLevel model for legacy VIP tier migration with preserved IDs (ECO-01)
- [x] User extended with optional currentVipLevelId (ECO-02)
- [x] Wallet split into financial decomposition (depositedBalance, earnedBalance, totalDeposited) (ECO-03)
- [x] Safe migration strategy for legacy balance preservation and deterministic mapping (ECO-04)
- [x] AuthorProfile one-to-one model with approval workflow (ECO-05)
- [x] WithdrawalRequest model for payout lifecycle tracking (ECO-06)
- [x] Banner model with display positioning and date constraints (ECO-07)
- [x] User referral graph with unique referral codes (ECO-08)
- [x] Mission and points economy models independent from fiat transactions (ECO-09)
- [x] Reader UX models (ReadingHistory, Bookmark, Review, Notification) (ECO-10)
- [x] ViewCount BigInt fields on Novel and Chapter for scalable analytics (ECO-11)
- [x] Nested comment and reaction system with type tracking (ECO-12)
- [x] Legacy VIP tiers migrated from wp_vip_levels with preserved IDs and deterministic upsert (ECO-16)
- [x] Wallet backfill from legacy balance to split structure with rerun safety (ECO-17)

## Out of Scope (Deferred to v2)

- **ECO-13**: Admin UI for ecosystem management (banners, VIP levels, missions, moderation)
- **ECO-14**: Product analytics and anti-abuse heuristics
- **ECO-15**: Real-time notification delivery and read/unread synchronization
- Full ecosystem business logic implementation (payment processing, points payout automation)
- Advanced search and filtering UX changes
- Content transformation or algorithmic ranking

## Context

**Schema State:**
- Prisma models: 25+ (including 16+ from v1.4 ecosystem expansion)
- Enums: 10+ (TypeScript enums for status workflows, types, and constraints)
- Migrations: 13 (all replay-safe compound migrations)

**Data State:**
- Novels: 184 (all with exact WordPress IDs preserved)
- Chapters: 1,000+ (all with preserve parent novel IDs)
- Terms: 330 (Wikipedia taxonomy terms with preserved IDs)
- Novel-term links: 2,007 (reconstructed from wp_term_relationships)
- VIP levels: 330+ (migrated from wp_vip_levels with upsert semantics)
- Wallets: Split from legacy balance into financial decomposition structure

**Infrastructure:**
- ETL runner: 13 stages (source loading → transformation → upsert → verification)
- Verification scripts: 4 (content reconciliation, taxonomy reconciliation, wallet reconciliation, verification UAT)
- Test suites: 6 (33 tests passing, 0 regressions)

## Key Decisions

| Decision | Rationale | Outcome | Updated |
|----------|-----------|---------|---------|
| Preserve original MySQL IDs as target primary keys | Purchase history and relationships depend on exact source identity | ✓ Good | v1.0 |
| Use DB-to-DB migration only | Reduces ETL risk and keeps migration deterministic | ✓ Good | v1.0 |
| Defer rich-content cleanup to later CMS tool | Keeps each milestone focused on relational integrity | ✓ Good | v1.0 |
| Treat chapter content as raw post_content | Avoids accidental transformation of user content | ✓ Good | v1.1 |
| Migrate novels before chapters | Prevents FK failures in ETL reruns | ✓ Good | v1.1 |
| Default Novel.uploaderId to Admin user 1 | Safely backfills existing 176+ novels | ✓ Good | v1.2 |
| Preserve WordPress term IDs in taxonomy model | Keeps ETL joins deterministic | ✓ Good | v1.3 |
| Additive schema changes only (no breaking changes) | Preserve compatibility during phased deployment | ✓ Good | v1.4 |
| Use Prisma enum guards in SQL migration | Prevent duplicate enum creation on rerun | ✓ Good | v1.4 |
| Wallet backfill only when both fields are zero | Ensure existing user balances aren't overwritten | ✓ Good | v1.4 |

## Evolution Log

**v1.0:** Foundation established. Email sensitivity and user identity data safeguarded through encrypted storage and strict ID preservation.

**v1.1:** Content migration proved deterministic. Exact novel and chapter IDs preserved through raw DB-to-DB transfer. Rerun safety validated.

**v1.2:** UGC ownership link established. 176 novels safely assigned to Admin user 1 default. Uploader field now required for new records.

**v1.3:** Taxonomy schema shipped. 330 terms and 2,007 novel-term links reconstructed from WordPress. Idempotent ETL verified.

**v1.4:** Ecosystem foundation delivered. 16+ new models with backward compatibility. Financial decomposition safe. VIP and wallet data migrated (330+ records). All 33 tests passing.

---

*Last updated: 2026-04-08 — v1.4 shipped, v1.5 planning begins*
