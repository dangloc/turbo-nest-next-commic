# Roadmap: WordPress to NestJS Migration v1.5

**Milestone:** v1.5 — Auth Verification & CMS Import Foundation
**Created:** 2026-04-08
**Status:** v1.5 scope complete

## Phases

### Phase 14: Auth Verification & Role-Based Access Control

**Goal:** Implement Google OAuth user verification, link new users to legacy accounts by email, and enforce API access control through role-based route guards.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, RBAC-01, RBAC-02, RBAC-03, RBAC-04

**Plans:** 1 plan

Plans:
- [x] 14-01-PLAN.md — Google OAuth strategy + RBAC decorator/guard + route protection

**Artifacts:**
- `.planning/phases/14-auth-verification-rbac/14-01-SUMMARY.md`
- `.planning/phases/14-auth-verification-rbac/14-VERIFICATION.md`

### Phase 15: Admin CMS Import API

**Goal:** Provide secure file upload endpoint for Admins to import novel content from .txt/.docx files with intelligent chapter parsing.

**Requirements:** CMS-01, CMS-02, CMS-03, CMS-04, CMS-05

**Plans:** 1 plan

Plans:
- [x] 15-01-PLAN.md — Admin-only import endpoint + parser service + novel/chapter persistence

**Outcome:**
- `/admin/import` endpoint implemented with ADMIN-only access.
- Parser supports txt/docx and Chapter/Chương marker splitting.
- Novel + chapter persistence implemented with uploader attribution.
- Response contract includes `novelId`, `chaptersCreated`, `errors`, `warnings`.
- Full API regression and typecheck pass.

**Artifacts:**
- `.planning/phases/15-admin-cms-import-api/15-01-SUMMARY.md`
- `.planning/phases/15-admin-cms-import-api/15-VERIFICATION.md`

## Dependency Graph

```
Phase 14 (Auth & RBAC)  [COMPLETE]
  ↓
Phase 15 (CMS Import)   [COMPLETE]
```

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 14 | AUTH-01 to RBAC-04 (8 reqs) | Complete (2026-04-08) | 1/1 plans |
| 15 | CMS-01 to CMS-05 (5 reqs) | Complete (2026-04-08) | 1/1 plans |

---

*Roadmap updated: 2026-04-08*
*Next: `/gsd:complete-milestone v1.5`*
