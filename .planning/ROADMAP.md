# Roadmap: WordPress to NestJS Migration v1.5

**Milestone:** v1.5 — Auth Verification & CMS Import Foundation  
**Created:** 2026-04-08  
**Status:** Planning phase creation

## Phases

### Phase 14: Auth Verification & Role-Based Access Control

**Goal:** Implement Google OAuth user verification, link new users to legacy accounts by email, and enforce API access control through role-based route guards.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, RBAC-01, RBAC-02, RBAC-03, RBAC-04

**Scope:**
- Google OAuth integration with Passport.js
- Legacy account linking by email/provider ID
- Wallet initialization for new users
- @Roles() decorator and RolesGuard middleware
- Route protection for novel CRUD operations

**Success Criteria:**
- Google login endpoint accepts callback and grants session
- First-time Google users linked to existing accounts by email (if found)
- New users created with default USER role and initialized Wallet
- @Roles() guard blocks unauthenticated and under-privileged requests
- Admin-only routes require ADMIN role, Author routes require ADMIN/AUTHOR

### Phase 15: Admin CMS Import API

**Goal:** Provide secure file upload endpoint for Admins to import novel content from .txt/.docx files with intelligent chapter parsing.

**Requirements:** CMS-01, CMS-02, CMS-03, CMS-04, CMS-05

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
Phase 14 (Auth & RBAC)
  ↓
Phase 15 (CMS Import)
  (depends on Phase 14 for @Roles guard)
```

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 14 | AUTH-01 to RBAC-04 (8 reqs) | Pending | 2 plans |
| 15 | CMS-01 to CMS-05 (5 reqs) | Pending | 1-2 plans |

---

*Roadmap created: 2026-04-08*
*Ready for phase planning with `/gsd:plan-phase 14`*
