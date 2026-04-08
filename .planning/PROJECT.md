# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration program for a legacy WordPress novel/webcomic platform. v1.0-v1.4 established the migration foundation, content integrity, ownership tracking, taxonomy infrastructure, and ecosystem schema. v1.5 adds **user authentication verification through social login, access control enforcement, and admin tooling for content management**.

**Current State:** 13 phases shipped, 184 novels/chapters migrated, ecosystem schema complete. Now adding Identity Verification, Access Control, and Admin CMS tooling.

## Core Value

Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## Current Milestone: v1.5 — Auth Verification & CMS Import Foundation

**Goal:** Enable legacy user verification via Google OAuth, enforce API access control through role-based guards, and provide admin CMS tooling for novel/chapter import from file uploads.

**Target features:**
- **Google OAuth & Legacy Account Linking**: Implement Google Login via Passport.js, match new users to existing accounts by email/provider ID, or create new users safely
- **Role-Based Access Control (RBAC)**: Protect sensitive API routes with role guards (@Roles decorator), enforce Admin/Author/User permission hierarchy
- **Admin CMS Import API**: Secure file upload endpoint for Admins to import novel content from .txt/.docx files with intelligent chapter parsing and uploader attribution

This milestone bridges Identity (authentication) and Authorization (access control) while delivering the first admin tooling for content creation workflows.

## Requirements (Active — v1.5)

### Authentication & Legacy Sync (AUTH)

- [ ] **AUTH-01**: Implement Google OAuth endpoint using Passport.js that accepts Google callback and exchanges auth code for user profile
- [ ] **AUTH-02**: Upon successful Google login, query UserProvider table for matching provider ID; if found, link to existing User; if not, check User table by email for safe legacy account linking
- [ ] **AUTH-03**: If no existing User or UserProvider exists, create new User with isNewUser flag and initialize default Wallet record
- [ ] **AUTH-04**: Validate that Google OAuth session maintains HTTPS-only, secure, sameSite cookies with proper expiration (JWT or session-based, 24h default)

### Role-Based Access Control (RBAC)

- [ ] **RBAC-01**: Implement @Roles() NestJS decorator to guard API endpoints by user.role (ADMIN, AUTHOR, USER)
- [ ] **RBAC-02**: Create RolesGuard middleware that checks authenticated user.role against required roles before route execution
- [ ] **RBAC-03**: Apply Role guards to sensitive endpoints: POST /novels (ADMIN/AUTHOR), PATCH /novels/:id (ADMIN/AUTHOR/OWNER), DELETE endpoints (ADMIN only)
- [ ] **RBAC-04**: Enforce User.role = 'USER' as default for new users, assignable only by ADMIN through separate admin API

### CMS Import API (CMS)

- [ ] **CMS-01**: Create secure POST /admin/import endpoint accepting multipart/form-data with .txt or .docx file uploads, accessible only to ADMIN role
- [ ] **CMS-02**: Implement file parser service that extracts novel title from filename or file metadata, reads full content for chapter extraction
- [ ] **CMS-03**: Implement intelligent chapter splitter that detects common markers ('Chapter 1', 'Chương 1', 'Chap. 1', etc.) to split content into atomic chapter text blocks
- [ ] **CMS-04**: Upon successful parse, create Novel record with title, postContent (will be split), uploaderId = authenticated Admin user, then create individual Chapter records with chapterNumber, title (from marker), postContent, novelId, createdAt
- [ ] **CMS-05**: Return import response with {novelId, chaptersCreated[], errors[], warnings[]}, allowing Admins to verify parse quality before final save

## Validated Requirements (All Milestones v1.0-v1.4)

**Previous Milestones:** 28 requirements (all ✓ complete) spanning foundation, content migration, UGC, taxonomy, and ecosystem schema.

See `.planning/milestones/v1.{0-4}-REQUIREMENTS.md` for full details.

## Out of Scope (v1.5)

- **Advanced OAuth providers** (GitHub, Discord, etc.) — v1.5 focused on Google + email. Other providers deferred.
- **Two-Factor Authentication** — scope increase; phase-gate decision for v1.6+
- **Batch import workflows** — Single-file import only; batch/async processing deferred
- **Advanced file format support** (PDF, EPUB parsing) — Limited to .txt and basic .docx; rich format support deferred
- **Import scheduling and webhooks** — Real-time only; async/scheduled imports deferred
- **CMS draft/publish workflow** — Imported content immediately live; drafts deferred to v1.6+
- **User self-registration UI** — Backend API only; UI integration deferred
- **Multi-language file parsing** — Best-effort UTF-8; advanced NLP deferred

## Context

**Authentication Baseline:**
- Existing User model with email, password (for legacy accounts)
- Existing UserProvider for OAuth linkage (userId, provider, providerId)
- Existing Role enum (ADMIN, AUTHOR, USER)
- Passport.js available in stack

**CMS Tooling Baseline:**
- Existing Novel and Chapter models with uploaderId
- File handling libraries available (multer, pdf-parse, docx, etc.)
- Admin user already exists (ID = 1 from v1.2)

**API Security:**
- NestJS Guards pattern established
- JWT or session-based auth already in place
- Rate limiting on upload endpoints (implementation detail)

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Use Passport.js + Google OAuth | Proven, minimal OAuth implementation surface, reduces custom auth risk | Pending |
| Email-based legacy account linking on first OAuth login | Preserves existing user data without manual mapping, safe for bulk users | Pending |
| Chapter detection via regex markers (not ML-based) | Deterministic, reproducible, no external dependencies, works for WordPress export format | Pending |
| Single-file upload (not batch) | Simpler validation and error reporting, easier rollback, allows incremental CMS adoption | Pending |
| Imported content immediately live (not draft stage) | Admins have control; draft workflow can be added in v1.6+ when approval process needed | Pending |

## Evolution

**v1.5:** Adding Identity Verification & Authorization. Google OAuth links legacy users, RBAC gates sensitive operations, Admin CMS tooling enables direct content creation.

---

*Last updated: 2026-04-08 — v1.5 Milestone Started*
