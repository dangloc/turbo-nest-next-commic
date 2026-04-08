# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration platform for a legacy WordPress novel/webcomic system.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling safe operational tooling and reader-facing APIs on the new platform.

## Current State

v1.7 is shipped and archived. The platform now includes:
- Reader and social APIs from v1.6 (discovery, chapter analytics, bookmarks/history, nested comments, reaction toggles).
- Financial engine APIs from v1.7 (payment intents/verification, wallet settlement, purchase safety, 95/5 revenue split, author withdrawal requests, admin withdrawal decisions).

## Next Milestone Goals

- Define the next milestone scope via /gsd:new-milestone.
- Prioritize post-v1.7 follow-ups such as production gateway integration, payout rail automation, and financial reporting.

## Validated Milestones

- v1.0: WordPress migration foundation shipped.
- v1.1: Content DB-to-DB migration and reconciliation shipped.
- v1.2: UGC ownership foundation shipped.
- v1.4: Ecosystem foundation schema expansion shipped.
- v1.5: Auth verification, RBAC, and CMS import shipped.
- v1.6: Core Reader API & Social Experience shipped.
- v1.7: Financial Engine & Payment Integration shipped.

## Out of Scope (v1.7)

- Direct live gateway settlement in production (sandbox-first contracts only).
- In-app tax invoices and accounting exports.
- Automated payout rail execution to external banks.
- Full fraud engine and dispute workflow.

---

*Last updated: 2026-04-08 after v1.7 milestone completion*
