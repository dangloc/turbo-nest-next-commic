# Requirements: v1.6 Core Reader API & Social Experience

Milestone: v1.6
Defined: 2026-04-08
Core Value: Deliver stable, frontend-ready reader and social APIs on top of validated content/auth foundations.

## v1.6 Requirements

### Reader Content APIs (READ)

- [x] READ-01: Public GET /novels endpoint supports pagination (`page`, `limit`) and returns total/count metadata.
- [x] READ-02: GET /novels supports sorting by `viewCount`, `updatedAt`, and `createdAt` with deterministic direction handling.
- [x] READ-03: GET /novels supports filtering by taxonomy tags/category and publish status using query parameters.
- [x] READ-04: GET /chapters/:id returns chapter payload and atomically increments both `chapter.viewCount` and parent `novel.viewCount`.
- [x] READ-05: Authenticated bookmark APIs allow users to list/add/remove bookmarks while enforcing user ownership.
- [x] READ-06: Authenticated reading history APIs allow upsert/get of user progress for resume behavior.

### Social Interaction APIs (SOC)

- [ ] SOC-01: GET comments endpoint returns nested comment trees for novel/chapter scope including replies.
- [ ] SOC-02: POST comment endpoint supports top-level comments and replies via optional `parentId`.
- [ ] SOC-03: Comment creation validates scope (novel/chapter) and ownership fields from authenticated user.
- [ ] SOC-04: Reaction toggle endpoint supports LIKE, HEART, HAHA, WOW, SAD, ANGRY enum values.
- [ ] SOC-05: Reaction toggle respects uniqueness constraint (userId + commentId), preventing duplicate concurrent reactions.

## Traceability

| Requirement | Category | Phase | Status |
|-------------|----------|-------|--------|
| READ-01 | Reader API | 16 | Completed |
| READ-02 | Reader API | 16 | Completed |
| READ-03 | Reader API | 16 | Completed |
| READ-04 | Reader API | 16 | Completed |
| READ-05 | Reader API | 16 | Completed |
| READ-06 | Reader API | 16 | Completed |
| SOC-01 | Social API | 17 | Planned |
| SOC-02 | Social API | 17 | Planned |
| SOC-03 | Social API | 17 | Planned |
| SOC-04 | Social API | 17 | Planned |
| SOC-05 | Social API | 17 | Planned |

---

v1.6 requirements baseline created.
