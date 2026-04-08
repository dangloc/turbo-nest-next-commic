# Requirements: WordPress to NestJS Platform Migration

**Defined:** 2026-04-08
**Core Value:** Preserve every financially or identity-sensitive record during migration, with exact IDs and relationships intact.

## v1.3 Requirements (Taxonomy & Tags Migration)

### Taxonomy Storage and Migration

- [x] **TAX-01**: WordPress terms are stored in PostgreSQL with original term IDs, name, slug, and taxonomy type preserved.
- [x] **TAX-02**: The taxonomy model supports multiple WordPress taxonomy types, including categories, tags, and custom taxonomies.
- [x] **TAX-03**: Novel-to-term links are represented as a many-to-many relationship in PostgreSQL.
- [x] **TAX-04**: Existing migrated novels are linked to their WordPress taxonomy terms using reconstructed wp_term_relationships data.
- [x] **TAX-05**: The taxonomy migration can be applied without changing existing novel IDs, uploader ownership, or chapter relationships.
- [x] **TAX-06**: Migration logic remains rerunnable so taxonomy links and term records are not duplicated on repeated runs.

## v1.4 Requirements (Platform Ecosystem Foundation - Schema Expansion)

### VIP System and Migration Foundations

- [ ] **ECO-01**: Add `VipLevel` model for source migration from `wp_vip_levels` with preserved integer IDs and tier metadata (`name`, `vndValue`, `kimTe`, optional `colorCode`, optional `iconUrl`).
- [ ] **ECO-02**: Extend `User` with optional `currentVipLevelId` relation to `VipLevel` without breaking existing user records.

### Author Center and Wallet Foundations

- [ ] **ECO-03**: Extend `Wallet` into split-balance structure (`depositedBalance`, `earnedBalance`) and add cumulative `totalDeposited` for VIP progression.
- [ ] **ECO-04**: Provide a safe migration strategy so legacy balance values are preserved and mapped deterministically into the new wallet structure.
- [ ] **ECO-05**: Add `AuthorProfile` one-to-one model with `User`, including pen name, bank details, and approval workflow status enum.
- [ ] **ECO-06**: Add `WithdrawalRequest` model with amount and status enum for author payout lifecycle tracking.

### Banners and Platform Growth

- [ ] **ECO-07**: Add `Banner` model with image/link payload, display position enum, and date-range constraints.

### Gamification and Referrals

- [ ] **ECO-08**: Extend `User` with unique `referralCode` and optional self-relation `referredById` for referral graph tracking.
- [ ] **ECO-09**: Add mission and points economy models (`Mission`, `UserMissionLog`, `PointTransaction`) independent from fiat transaction tables.

### Advanced Reader UX and Social

- [ ] **ECO-10**: Add `ReadingHistory`, `Bookmark`, `Review` (rating constrained to 1-5), and `Notification` models with proper user/content relations.
- [ ] **ECO-11**: Add additive `viewCount` (`BigInt`, default `0`) to both `Novel` and `Chapter` for scalable counter tracking.
- [ ] **ECO-12**: Add nested comment and reaction system (`Comment` self-relation with `parentId`, `CommentReaction` with type enum and unique `[userId, commentId]`).

## v2 Requirements (Deferred)

### Experience and Operations

- **ECO-13**: Admin UI for managing banners, VIP levels, missions, and moderation policies.
- **ECO-14**: Product analytics and anti-abuse heuristics for referral and reaction events.
- **ECO-15**: Real-time notification delivery channels and read/unread synchronization UX.

## Out of Scope (Phase 12)

| Feature | Reason |
|---------|--------|
| Full business logic implementation for VIP, mission rewards, and withdrawal processing | Phase 12 focuses on schema contracts and safe migration only |
| Frontend UI for author center, social feeds, and notifications | Separate app-layer delivery phases |
| Backfill ETL for every new model | Requires dedicated migration phases after schema contracts stabilize |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TAX-01 | Phase 10 | Complete |
| TAX-02 | Phase 10 | Complete |
| TAX-03 | Phase 10 | Complete |
| TAX-04 | Phase 11 | Complete |
| TAX-05 | Phase 11 | Complete |
| TAX-06 | Phase 11 | Complete |
| ECO-01 | Phase 12 | Planned |
| ECO-02 | Phase 12 | Planned |
| ECO-03 | Phase 12 | Planned |
| ECO-04 | Phase 12 | Planned |
| ECO-05 | Phase 12 | Planned |
| ECO-06 | Phase 12 | Planned |
| ECO-07 | Phase 12 | Planned |
| ECO-08 | Phase 12 | Planned |
| ECO-09 | Phase 12 | Planned |
| ECO-10 | Phase 12 | Planned |
| ECO-11 | Phase 12 | Planned |
| ECO-12 | Phase 12 | Planned |

**Coverage:**
- Total requirements: 18
- Completed requirements: 6
- Planned requirements: 12
- Unmapped requirements: 0

---
*Requirements updated: 2026-04-08*
*Last updated: 2026-04-08 for v1.4 milestone kickoff*
