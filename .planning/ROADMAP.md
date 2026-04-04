# Roadmap: WordPress to NestJS Migration

**Created:** 2026-04-05
**Core Value:** Preserve every financially or identity-sensitive record during the migration, with a repeatable ETL process and verifiable totals.

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Schema Foundation | Define the normalized Prisma model and database shape | DATA-01, DATA-02, DATA-03 | 3 |
| 2 | ETL Migration | Build the one-time migration script and safe batch loading | MIG-01, MIG-02, MIG-03, MIG-04, MIG-05, MIG-06 | 4 |
| 3 | Verification | Prove the migration preserved critical records | VER-01, VER-02, VER-03 | 3 |

## Phase Details

**Phase 1: Schema Foundation**
Goal: Design the PostgreSQL Prisma schema so legacy WordPress data lands in normalized, queryable tables without duplication.
Requirements: DATA-01, DATA-02, DATA-03
Success criteria:
1. `schema.prisma` defines separate tables for users, providers, wallets, transactions, VIP subscriptions, and purchased chapters.
2. Legacy WordPress IDs and password hashes are preserved in the new user model.
3. Purchased chapter storage has uniqueness and indexing appropriate for large-scale lookup.

**Phase 2: ETL Migration**
Goal: Implement the migration job that extracts WordPress data, transforms serialized metadata, and loads normalized PostgreSQL records.
Requirements: MIG-01, MIG-02, MIG-03, MIG-04, MIG-05, MIG-06
Success criteria:
1. The script connects to both MySQL and PostgreSQL with clear configuration.
2. User, social login, wallet, VIP, and transaction records are migrated with the intended mappings.
3. Serialized `wp_usermeta` values are decoded safely for VIP and purchased chapter data.
4. Purchased chapters are inserted in batches using `createMany()` with chunking.

**Phase 3: Verification**
Goal: Prove the new database matches critical source totals and identity mappings after migration.
Requirements: VER-01, VER-02, VER-03
Success criteria:
1. Wallet totals can be cross-checked against the legacy source and match.
2. Purchased chapter counts match the successfully decoded source records.
3. Google social login mappings can be queried and verified in the new system.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| MIG-01 | Phase 2 | Pending |
| MIG-02 | Phase 2 | Pending |
| MIG-03 | Phase 2 | Pending |
| MIG-04 | Phase 2 | Pending |
| MIG-05 | Phase 2 | Pending |
| MIG-06 | Phase 2 | Pending |
| VER-01 | Phase 3 | Pending |
| VER-02 | Phase 3 | Pending |
| VER-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Roadmap created: 2026-04-05*