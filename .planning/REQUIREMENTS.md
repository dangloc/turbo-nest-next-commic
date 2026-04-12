# Requirements: v1.13 Legacy Financial ETL Import

Defined: 2026-04-12
Core Value: Import legacy WordPress user financials and purchased chapter history without trusting deprecated columns or performing per-user meta lookups.

## v1.13 Requirements

### Legacy Financial Snapshot

- [ ] ETL-01: Migration reads legacy user balance and VIP level from a single grouped `wp_usermeta` pivot per user.
  - Acceptance: `wp_users.price` and `wp_users.vip_level_id` are ignored, and the SQL uses `MAX(CASE WHEN meta_key = '...' THEN meta_value END)` to extract `_user_balance`, `_user_vip_level_id`, and `_purchased_chapters`.
- [ ] ETL-02: Migration transforms the serialized `_purchased_chapters` payload into Prisma-ready purchase rows.
  - Acceptance: PHP-serialized values decode with `php-serialize`, numeric-key objects are normalized, and the mapped rows include actual target fields (`userId`, `chapterId`, `novelId`, `pricePaid`, `purchasedAt`).

### Prisma Load Path

- [ ] ETL-03: Migration updates target wallet/VIP state and bulk inserts purchase history with Prisma.
  - Acceptance: wallet/VIP updates and purchase history writes are performed through Prisma repository methods, and chapter purchases use `createMany` with duplicate protection instead of per-row inserts.

## Future Requirements (Deferred)

- ETL-04: Support a dry-run report with per-user financial diffs and quarantine output.
- ETL-05: Add incremental checkpointing for resumable legacy imports.

## Out of Scope (v1.13)

| Feature | Reason |
|---------|--------|
| Re-migrating non-financial WordPress content | Already covered by earlier ETL phases |
| Replacing the existing financial transaction import pipeline | This phase targets legacy balance/VIP and purchase history only |
| Adding a new external parsing dependency | `php-serialize` is already present in `apps/api/package.json` |

## Traceability

| Requirement | Planned Phase | Status | Completed |
|-------------|---------------|--------|-----------|
| ETL-01 | Phase 34 | Planned | - |
| ETL-02 | Phase 34 | Planned | - |
| ETL-03 | Phase 34 | Planned | - |

Coverage:
- v1.13 requirements: 3 total
- Completed: 0
- Mapped to planned phases: 3
- Unmapped: 0

---

Requirements defined: 2026-04-12
Last updated: 2026-04-12 after Phase 34 planning started
