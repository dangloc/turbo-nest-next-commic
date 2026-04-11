# Requirements: v1.12 Creator Growth and Reader Personalization

Defined: 2026-04-11
Core Value: Deepen creator-reader relationship while improving long-form reading comfort and continuity across devices.

## v1.12 Requirements

### Creator Growth

- [x] CREATOR-01: Authenticated reader can follow and unfollow a public author.
  - Acceptance: follow state toggles immediately and persists on refresh.
- [x] CREATOR-02: Reader can view public follower count and personal follow state on author profile pages.
  - Acceptance: follower count and follow badge/CTA are consistent between backend payload and UI rendering.

### Reader Personalization

- [x] READER-05: Reader can configure typography controls in chapter view (font family, line height, content width).
  - Acceptance: preference changes apply immediately while reading.
- [x] READER-06: Reader typography preferences persist across chapter navigation and browser reload.
  - Acceptance: previously selected typography options are rehydrated and applied on chapter open.

### Cross-Device Progression Sync

- [ ] SYNC-03: Authenticated reader can resume chapter progress on a second device/session from their latest synced position.
  - Acceptance: latest server progression is visible when opening the same novel on another device.
- [ ] SYNC-04: Progression merge remains conflict-safe when multiple sessions update nearby progress values.
  - Acceptance: deterministic last-write policy is applied and documented in sync response metadata.

## Future Requirements (Deferred)

- CREATOR-03: Follower feed and creator activity stream.
- READER-07: Per-novel reading presets and export/import.
- SYNC-05: Real-time push updates for active multi-device sessions.

## Out of Scope (v1.12)

| Feature | Reason |
|---------|--------|
| Full social messaging system between readers and creators | Not required for follow graph baseline |
| Advanced AI recommendation ranking | Focus is relationship and continuity primitives first |
| Native mobile client synchronization protocol | Web and API baseline first |

## Traceability

| Requirement | Planned Phase | Status | Completed |
|-------------|---------------|--------|-----------|
| CREATOR-01 | Phase 31 | Complete | 2026-04-11 |
| CREATOR-02 | Phase 31 | Complete | 2026-04-11 |
| READER-05 | Phase 32 | Complete | 2026-04-11 |
| READER-06 | Phase 32 | Complete | 2026-04-11 |
| SYNC-03 | Phase 33 | Planned | - |
| SYNC-04 | Phase 33 | Planned | - |

Coverage:
- v1.12 requirements: 6 total
- Completed: 4
- Mapped to planned phases: 6
- Unmapped: 0

---

Requirements defined: 2026-04-11
Last updated: 2026-04-11 after Phase 32 completion
