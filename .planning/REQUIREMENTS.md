# Requirements: WordPress to NestJS UGC Foundation

**Defined:** 2026-04-08
**Core Value:** Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## v1 Requirements

Requirements for the v1.2 User-Generated Content (UGC) Foundation milestone.

### UGC Ownership Foundation

- [ ] **UGC-01**: Novel model has a required uploader ownership link to User (one User can own many novels).
- [ ] **UGC-02**: Novel table includes `uploaderId` as an integer foreign key with schema default `1` (Admin) for safe backfill and future unassigned inserts.
- [ ] **UGC-03**: Prisma migration is generated and applied successfully, preserving existing novels and assigning uploader ownership without breaking existing ETL/content flows.

## v2 Requirements

Deferred to future release.

### User Submission Experience

- **UGC-04**: Authenticated users can submit new novels through API workflow.
- **UGC-05**: Submission flow includes moderation/status state before publishing.
- **UGC-06**: Uploader-facing management endpoints support editing and ownership-scoped listing.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full UGC submit/publish API | v1.2 focuses on schema foundation only |
| Frontend uploader dashboard | Planned after ownership schema is stable |
| Novel moderation workflow | Deferred to later milestone with explicit product rules |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UGC-01 | Phase 9 | Pending |
| UGC-02 | Phase 9 | Pending |
| UGC-03 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 3 total
- Mapped to phases: 3
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after v1.2 milestone definition*
