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

## v1.4 Requirements (Platform Ecosystem Foundation)

### Schema Expansion Foundations (Completed in Phase 12)

- [x] **ECO-01**: Add `VipLevel` model for source migration from `wp_vip_levels` with preserved integer IDs and tier metadata (`name`, `vndValue`, `kimTe`, optional `colorCode`, optional `iconUrl`).
- [x] **ECO-02**: Extend `User` with optional `currentVipLevelId` relation to `VipLevel` without breaking existing user records.
- [x] **ECO-03**: Extend `Wallet` into split-balance structure (`depositedBalance`, `earnedBalance`) and add cumulative `totalDeposited` for VIP progression.
- [x] **ECO-04**: Provide a safe migration strategy so legacy balance values are preserved and mapped deterministically into the new wallet structure.
- [x] **ECO-05**: Add `AuthorProfile` one-to-one model with `User`, including pen name, bank details, and approval workflow status enum.
- [x] **ECO-06**: Add `WithdrawalRequest` model with amount and status enum for author payout lifecycle tracking.
- [x] **ECO-07**: Add `Banner` model with image/link payload, display position enum, and date-range constraints.
- [x] **ECO-08**: Extend `User` with unique `referralCode` and optional self-relation `referredById` for referral graph tracking.
- [x] **ECO-09**: Add mission and points economy models (`Mission`, `UserMissionLog`, `PointTransaction`) independent from fiat transaction tables.
- [x] **ECO-10**: Add `ReadingHistory`, `Bookmark`, `Review` (rating constrained to 1-5), and `Notification` models with proper user/content relations.
- [x] **ECO-11**: Add additive `viewCount` (`BigInt`, default `0`) to both `Novel` and `Chapter` for scalable counter tracking.
- [x] **ECO-12**: Add nested comment and reaction system (`Comment` self-relation with `parentId`, `CommentReaction` with type enum and unique `[userId, commentId]`).

### Legacy Data Backfill (Phase 13)

- [ ] **ECO-16**: Migrate legacy VIP tiers from `wp_vip_levels` into `VipLevel` with preserved IDs and deterministic upsert semantics.
- [ ] **ECO-17**: Backfill existing wallet records so legacy `balance` is represented in `depositedBalance` and `totalDeposited` accurately without destructive loss or duplicate growth on rerun.

## v2 Requirements (Deferred)

### Experience and Operations

- **ECO-13**: Admin UI for managing banners, VIP levels, missions, and moderation policies.
- **ECO-14**: Product analytics and anti-abuse heuristics for referral and reaction events.
- **ECO-15**: Real-time notification delivery channels and read/unread synchronization UX.

## Out of Scope (Phase 13)

| Feature | Reason |
|---------|--------|
| Business logic for VIP promotions and mission payouts | Phase 13 is migration/backfill only |
| Frontend UX for new ecosystem models | Separate app-layer phases |
| Full social/notification backfill from historical events | Not part of VIP/wallet migration scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TAX-01 | Phase 10 | Complete |
| TAX-02 | Phase 10 | Complete |
| TAX-03 | Phase 10 | Complete |
| TAX-04 | Phase 11 | Complete |
| TAX-05 | Phase 11 | Complete |
| TAX-06 | Phase 11 | Complete |
| ECO-01 | Phase 12 | Complete |
| ECO-02 | Phase 12 | Complete |
| ECO-03 | Phase 12 | Complete |
| ECO-04 | Phase 12 | Complete |
| ECO-05 | Phase 12 | Complete |
| ECO-06 | Phase 12 | Complete |
| ECO-07 | Phase 12 | Complete |
| ECO-08 | Phase 12 | Complete |
| ECO-09 | Phase 12 | Complete |
| ECO-10 | Phase 12 | Complete |
| ECO-11 | Phase 12 | Complete |
| ECO-12 | Phase 12 | Complete |
| ECO-16 | Phase 13 | Planned |
| ECO-17 | Phase 13 | Planned |

**Coverage:**
- Total requirements: 20
- Completed requirements: 18
- Planned requirements: 2
- Unmapped requirements: 0

---
*Requirements updated: 2026-04-08*
*Last updated: 2026-04-08 after Phase 12 completion and Phase 13 kickoff*
