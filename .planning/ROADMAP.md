# Roadmap: WordPress to NestJS Migration

Milestone: v1.12 - Creator Growth and Reader Personalization
Created: 2026-04-11
Status: Planned

## Milestones

- [done] v1.9 Full Reader Productization (shipped 2026-04-09) - see .planning/milestones/v1.9-ROADMAP.md
- [done] v1.10 Notification Center and Dynamic Content (shipped 2026-04-09) - see .planning/milestones/v1.10-ROADMAP.md
- [done] v1.11 Reader Experience and Creator Discovery (shipped 2026-04-11) - see .planning/milestones/v1.11-ROADMAP.md
- [active] v1.12 Creator Growth and Reader Personalization (in progress)

## Phases

### Phase 31: Author Follow Graph and Public Social Visibility

Status: Complete

Goal: Introduce authenticated follow/unfollow actions and public follower visibility on author profile surfaces.

Requirements: CREATOR-01, CREATOR-02

Scope:
- Backend follow relation contracts and persistence model.
- Authenticated follow/unfollow API routes with idempotent behavior.
- Author profile payload extension for follower count and viewer follow state.
- Frontend follow CTA integration on public author page.

Success Criteria:
- Authenticated reader can follow and unfollow an author reliably.
- Author profile shows stable follower count and viewer follow state.
- Follow state persists across reload and re-login.

Plans:
- [x] 31-01-PLAN.md - implement backend author follow graph contracts and endpoints
- [x] 31-02-PLAN.md - integrate follow state and follower count in author profile UI

### Phase 32: Advanced Reader Typography Personalization

Status: Planned

Goal: Provide richer in-reader typography controls and persistent reading presets.

Requirements: READER-05, READER-06

Scope:
- Reader typography model for font family, line height, and content width.
- Preference persistence and rehydration on chapter open.
- Reader control panel updates and style variant system.
- Backward-compatible defaults for existing readers.

Success Criteria:
- Reader can adjust advanced typography settings with immediate effect.
- Typography settings remain stable across chapter navigation and refresh.
- Default reading experience remains usable for users with no saved preferences.

Plans:
- [ ] 32-01-PLAN.md - define typography preference contracts and persistence model
- [ ] 32-02-PLAN.md - deliver reader UI controls and style application variants

### Phase 33: Cross-Device Progression Continuity and Conflict Safety

Status: Planned

Goal: Synchronize reading progression across devices with deterministic conflict handling.

Requirements: SYNC-03, SYNC-04

Scope:
- Sync metadata contract extensions for progression updates.
- Cross-session resume fetch strategy for chapter and novel context.
- Conflict-safe merge policy (deterministic last-write behavior).
- Reader UX messaging for synced resume state.

Success Criteria:
- Reader can continue from latest synced position on a second device.
- Concurrent progression updates resolve deterministically and traceably.
- Resume behavior remains stable under rapid chapter switching.

Plans:
- [ ] 33-01-PLAN.md - implement backend cross-device progression merge and metadata contracts
- [ ] 33-02-PLAN.md - integrate frontend cross-device resume reconciliation flow

## Progress

| Phase | Requirements | Status | Plans | Completion |
|-------|--------------|--------|-------|------------|
| 31 | CREATOR-01, CREATOR-02 | Complete | 2/2 complete | 100% |
| 32 | READER-05, READER-06 | Planned | 2 planned | - |
| 33 | SYNC-03, SYNC-04 | Planned | 2 planned | - |

---

Next Action: Execute Phase 32 using /gsd:execute-phase 32
