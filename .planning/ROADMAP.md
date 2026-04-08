# Roadmap: WordPress to NestJS Migration v1.5

**Milestone:** v1.5 — Auth Verification & CMS Import Foundation
**Created:** 2026-04-08
**Status:** Phase 14 complete, Phase 15 planned

## Phases

### Phase 14: Auth Verification & Role-Based Access Control

**Goal:** Implement Google OAuth user verification, link new users to legacy accounts by email, and enforce API access control through role-based route guards.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, RBAC-01, RBAC-02, RBAC-03, RBAC-04

**Plans:** 1 plan

Plans:
- [x] 14-01-PLAN.md — Google OAuth strategy + RBAC decorator/guard + route protection

**Outcome:**
- Google OAuth strategy implemented with provider-id and email fallback account linking.
- New users are created with default USER role and wallet bootstrap.
- `@Roles()` and `RolesGuard` implemented and applied to sensitive routes.
- API regression sweep passed (20/20 suites, 91/91 tests).

**Artifacts:**
- `.planning/phases/14-auth-verification-rbac/14-01-SUMMARY.md`
- `.planning/phases/14-auth-verification-rbac/14-VERIFICATION.md`

### Phase 15: Admin CMS Import API

**Goal:** Provide secure file upload endpoint for Admins to import novel content from .txt/.docx files with intelligent chapter parsing.

**Requirements:** CMS-01, CMS-02, CMS-03, CMS-04, CMS-05

**Plans:** 1 plan

Plans:
- [ ] 15-01-PLAN.md — Admin-only import endpoint + parser service + novel/chapter persistence

**Scope:**
- POST /admin/import endpoint with file upload handling
- Novel title extraction from filename/metadata
- Intelligent chapter detection via regex markers
- Novel and Chapter record creation with attribution
- Import response with validation summary

**Success Criteria:**
- Endpoint accepts .txt and .docx files, rejects others
- Chapter markers detected and split content correctly
- Records created with correct uploaderId attribution
- Import response includes novel ID, chapter counts, errors, warnings
- Admin-only access enforced via @Roles('ADMIN') guard

## Dependency Graph

```
Phase 14 (Auth & RBAC)  [COMPLETE]
  ↓
Phase 15 (CMS Import)   [READY TO EXECUTE]
```

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 14 | AUTH-01 to RBAC-04 (8 reqs) | Complete (2026-04-08) | 1/1 plans |
| 15 | CMS-01 to CMS-05 (5 reqs) | Planned | 1/1 plans |

---

*Roadmap updated: 2026-04-08*
*Next: `/gsd:execute-phase 15`*
