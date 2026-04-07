# Requirements: WordPress to NestJS Migration

**Defined:** 2026-04-05
**Core Value:** Preserve every financially or identity-sensitive record during the migration, with a repeatable ETL process and verifiable totals.

## v1 Requirements

Requirements for migration foundation and its audit-closure follow-up.

### Validated

- [x] **DATA-01**: Prisma schema normalizes WordPress user, wallet, provider, VIP, transaction, and purchased chapter data into dedicated PostgreSQL tables. — Phase 1
- [x] **DATA-02**: New user records retain the original WordPress password hash, user role, and stable legacy identifier mapping. — Phase 1
- [x] **DATA-03**: Purchased chapter storage enforces uniqueness for the user/chapter pair and includes an index that supports large-scale lookup and deduplication. — Phase 1

### Pending Gap Closure (from v1.0 audit)

- [ ] **MIG-01**: ETL script connects to the legacy MySQL database and the new PostgreSQL database using Node.js/TypeScript.
- [ ] **MIG-02**: ETL script migrates users, Google social login mappings, and wallet balances from the WordPress source tables.
- [ ] **MIG-03**: ETL script decodes serialized `vip_package` and `_purchased_chapters` values from `wp_usermeta` and maps them to normalized destination tables.
- [ ] **MIG-04**: ETL script writes purchased chapters in chunked batches with `createMany()` so migration remains safe for million-row volumes.
- [ ] **MIG-05**: ETL script migrates transaction history with legacy identifiers, amounts, timestamps, and content preserved where available.
- [ ] **MIG-06**: ETL script is idempotent or safely resumable so reruns do not create duplicate user, wallet, provider, VIP, or purchased chapter records.
- [ ] **VER-01**: Post-migration checks confirm total wallet balances match the legacy system.
- [ ] **VER-02**: Post-migration checks confirm purchased chapter counts match the successfully decoded WordPress source data.
- [ ] **VER-03**: Post-migration checks confirm social login mappings for Google users are preserved correctly.

## v2 Requirements

Deferred to future release.

### Runtime API Expansion

- **API-01**: Add runtime application endpoints for the migrated data model.
- **API-02**: Add user-facing migration admin tooling and dashboards.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Frontend redesign or reader UX rebuild | Migration milestone is backend/data foundation only |
| Continuous bi-directional sync with WordPress | One-time cutover reduces complexity and risk |
| Password rehashing | Preserving WP hashes keeps existing login compatibility |
| New social or purchase features | Not required to safely move existing data |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| MIG-01 | Phase 4 | Pending |
| MIG-02 | Phase 4 | Pending |
| MIG-03 | Phase 4 | Pending |
| MIG-04 | Phase 4 | Pending |
| MIG-05 | Phase 4 | Pending |
| MIG-06 | Phase 4 | Pending |
| VER-01 | Phase 5 | Pending |
| VER-02 | Phase 5 | Pending |
| VER-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Checked complete: 3
- Pending gap closure: 9
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements restored: 2026-04-07 after /gsd:plan-milestone-gaps*
*Last updated: 2026-04-07 (phases 4-5 traceability reassignment)*
