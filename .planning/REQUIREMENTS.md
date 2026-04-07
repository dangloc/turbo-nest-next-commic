# Requirements: WordPress to NestJS Content Migration

**Defined:** 2026-04-07
**Core Value:** Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## v1 Requirements

Requirements for the v1.1 Content Migration milestone.

### Content Import

- [ ] **CONTENT-01**: Novels from wp_posts where post_type = truyen_chu are imported into PostgreSQL with the original MySQL IDs preserved.
- [ ] **CONTENT-02**: Chapters from wp_posts where post_type = chuong_truyen are imported into PostgreSQL with the original MySQL IDs preserved.
- [ ] **CONTENT-03**: Chapter-to-novel relationships from wp_postmeta where meta_key = chuong_with_truyen are preserved exactly in the target database.
- [ ] **CONTENT-04**: Chapter post_content is copied as raw content without heavy Word/Text parsing or transformation.
- [ ] **CONTENT-05**: The content migration can be rerun without duplicating novels or chapters.
- [ ] **CONTENT-06**: Reconciliation output confirms source and target counts plus relationship integrity for novels and chapters.

## v2 Requirements

Deferred to future release.

### Rich Content Tools

- **CONTENT-07**: A manual CMS-based rich content import tool can clean up or rewrite chapter text after the DB migration.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Heavy Word/Text parsing in ETL | Too risky and cumbersome for the migration milestone |
| Frontend or reader UX redesign | Not part of content migration scope |
| Additional content types beyond novels and chapters | Keep the milestone focused on the direct DB-to-DB contract |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONTENT-01 | Phase 6 | Pending |
| CONTENT-02 | Phase 6 | Pending |
| CONTENT-03 | Phase 7 | Pending |
| CONTENT-04 | Phase 7 | Pending |
| CONTENT-05 | Phase 8 | Pending |
| CONTENT-06 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after v1.1 milestone start*
