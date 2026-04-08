# Requirements: v1.5 Auth Verification & CMS Import Foundation

**Milestone:** v1.5  
**Defined:** 2026-04-08  
**Core Value:** Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## v1.5 Requirements

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

## Traceability

| Requirement | Category | Phase | Status |
|-------------|----------|-------|--------|
| AUTH-01 | Authentication | 14 | Planned |
| AUTH-02 | Authentication | 14 | Planned |
| AUTH-03 | Authentication | 14 | Planned |
| AUTH-04 | Authentication | 14 | Planned |
| RBAC-01 | Authorization | 14 | Planned |
| RBAC-02 | Authorization | 14 | Planned |
| RBAC-03 | Authorization | 14 | Planned |
| RBAC-04 | Authorization | 14 | Planned |
| CMS-01 | Content Management | 15 | Planned |
| CMS-02 | Content Management | 15 | Planned |
| CMS-03 | Content Management | 15 | Planned |
| CMS-04 | Content Management | 15 | Planned |
| CMS-05 | Content Management | 15 | Planned |

---

*v1.5 requirements defined and ready for phased execution*
