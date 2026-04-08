# Roadmap: WordPress to NestJS Migration v1.6

Milestone: v1.6 - Core Reader API & Social Experience
Created: 2026-04-08
Status: active

## Phases

### Phase 16: Reader Content APIs

Goal: Ship public content-delivery APIs and authenticated personal reading UX APIs for frontend consumption.

Requirements: READ-01, READ-02, READ-03, READ-04, READ-05, READ-06

Scope:
- Novel discovery listing with pagination/sorting/filtering.
- Chapter read endpoint with safe dual viewCount increment.
- Bookmark and reading-history endpoints for authenticated users.

Success Criteria:
- Frontend can browse/filter/sort novels via stable paginated API.
- Reading a chapter increments chapter + novel counters safely under concurrent access.
- Users can save bookmarks and resume reading positions through authenticated APIs.

### Phase 17: Social Interaction APIs

Goal: Enable reader discussion and engagement through nested comments and reaction toggles.

Requirements: SOC-01, SOC-02, SOC-03, SOC-04, SOC-05

Scope:
- Comment retrieval with nested reply trees.
- Comment/reply creation endpoints.
- Reaction toggle endpoint with uniqueness enforcement.

Success Criteria:
- Clients can render threaded comments by novel/chapter.
- Users can post comments/replies with valid scope rules.
- Reactions toggle deterministically without duplicate reaction records.

## Dependency Graph

Phase 16 (Reader Content APIs)
  ->
Phase 17 (Social Interaction APIs)

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 16 | READ-01..READ-06 | Completed | 1 plan |
| 17 | SOC-01..SOC-05 | Completed | 1 plan |

---

Plans:
- [x] 17-01-PLAN.md — nested comments, replies, and reaction toggles

Next: /gsd:complete-milestone v1.6
