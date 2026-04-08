# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration platform for a legacy WordPress novel/webcomic system.

Milestones v1.0-v1.5 established:
- schema and ETL migration foundation,
- strict reconciliation and rerun safety,
- ecosystem schema expansion,
- Google OAuth + RBAC,
- admin CMS import tooling.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling safe operational tooling on the new platform.

## Current State

- Latest shipped milestone: v1.5 Auth Verification & CMS Import Foundation (2026-04-08).
- API security baseline now includes social login, role guards, and persisted AUTHOR role support.
- Admin content operations baseline now includes secure file import and chapter parsing.

## Validated Milestones

- v1.0: WordPress migration foundation shipped.
- v1.1: Content DB-to-DB migration and reconciliation shipped.
- v1.2: Uploader ownership model for novels shipped.
- v1.4: Ecosystem schema expansion shipped.
- v1.5: Auth verification + RBAC + CMS import shipped.

## Next Milestone Goals

To be defined for v1.6 via /gsd:new-milestone.

Recommended exploration areas:
- CMS publish workflow (draft/review/publish)
- additional provider authentication (GitHub/Discord)
- richer import format support and quality diagnostics
- operational dashboards for import/reconciliation health

---

Last updated: 2026-04-08 after v1.5 milestone completion
