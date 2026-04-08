# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration platform for a legacy WordPress novel/webcomic system.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling safe operational tooling and reader-facing APIs on the new platform.

## Current State

v1.6 is shipped and archived. Reader delivery APIs and social interaction APIs are available for frontend clients, including public discovery, chapter analytics, bookmarks/history, nested comment threads, and reaction toggles.

## Current Milestone: v1.7 - Financial Engine & Payment Integration

Goal: Build secure financial APIs to handle user deposits, content purchases, author withdrawals, and platform revenue sharing.

Target features:
- Deposit & Purchase APIs (Phase 18): payment intent/verification, wallet top-up settlement, chapter purchase flow.
- Author Withdrawals & Revenue Share (Phase 19): 95/5 split, withdrawal requests, admin approval/rejection workflows.

## Validated Milestones

- v1.0: WordPress migration foundation shipped.
- v1.1: Content DB-to-DB migration and reconciliation shipped.
- v1.2: UGC ownership foundation shipped.
- v1.4: Ecosystem foundation schema expansion shipped.
- v1.5: Auth verification, RBAC, and CMS import shipped.
- v1.6: Core Reader API & Social Experience shipped.

## Out of Scope (v1.7)

- Direct live gateway settlement in production (sandbox-first contracts only).
- In-app tax invoices and accounting exports.
- Automated payout rail execution to external banks.
- Full fraud engine and dispute workflow.

<details>
<summary>Archived v1.6 baseline</summary>

## v1.6 - Core Reader API & Social Experience

- Reader discovery, chapter analytics, bookmarks/history APIs shipped.
- Nested comments and reaction toggles shipped.
- Realtime chat, search, recommendations, and notification fanout intentionally deferred.

</details>

---

*Last updated: 2026-04-08 after v1.7 milestone start*
