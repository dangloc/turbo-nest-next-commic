# Requirements: WordPress to NestJS Taxonomy & Tags Migration

**Defined:** 2026-04-08
**Core Value:** Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## v1 Requirements

Requirements for the v1.3 Taxonomy & Tags Migration milestone.

### Taxonomy Storage

- [ ] **TAX-01**: WordPress terms are stored in PostgreSQL with original term IDs, name, slug, and taxonomy type preserved.
- [ ] **TAX-02**: The taxonomy model supports multiple WordPress taxonomy types, including categories, tags, and custom taxonomies.
- [ ] **TAX-03**: Novel-to-term links are represented as a many-to-many relationship in PostgreSQL.

### Taxonomy Migration

- [ ] **TAX-04**: Existing migrated novels are linked to their WordPress taxonomy terms using reconstructed wp_term_relationships data.
- [ ] **TAX-05**: The taxonomy migration can be applied without changing existing novel IDs, uploader ownership, or chapter relationships.
- [ ] **TAX-06**: Migration logic remains rerunnable so taxonomy links and term records are not duplicated on repeated runs.

## v2 Requirements

Deferred to future release.

### Taxonomy Management Experience

- **TAX-07**: Admins can manage taxonomy assignments from an application UI.
- **TAX-08**: Users can filter or browse novels by taxonomy labels in the frontend experience.
- **TAX-09**: Taxonomy editing workflows include validation and moderation rules for future UGC content.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Taxonomy admin UI | This milestone only prepares the relational model and ETL |
| Novel search UX | Separate frontend effort, not required for migration |
| Taxonomy rewriting/normalization | Keep the WordPress source taxonomy shape intact |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TAX-01 | Phase 10 | Pending |
| TAX-02 | Phase 10 | Pending |
| TAX-03 | Phase 10 | Pending |
| TAX-04 | Phase 10 | Pending |
| TAX-05 | Phase 10 | Pending |
| TAX-06 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after v1.3 milestone definition*
