# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration platform for a legacy WordPress novel/webcomic system.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling safe operational tooling and reader-facing APIs on the new platform.

## Current State

v1.6 is shipped and archived. Reader delivery APIs and social interaction APIs are now available for frontend clients, including public discovery, chapter analytics, bookmarks/history, nested comment threads, and reaction toggles.

## Validated Milestones

- v1.0: WordPress migration foundation shipped.
- v1.1: Content DB-to-DB migration and reconciliation shipped.
- v1.2: UGC ownership foundation shipped.
- v1.4: Ecosystem foundation schema expansion shipped.
- v1.5: Auth verification, RBAC, and CMS import shipped.
- v1.6: Core Reader API & Social Experience shipped.

## Next Milestone Goals

- Define the next milestone scope with /gsd:new-milestone.
- Extend the API surface without breaking the shipped reader and social contracts.
- Keep realtime chat, search, recommendations, and notification fanout out of scope until explicitly introduced.

<details>
<summary>Archived v1.6 baseline</summary>

## Current Milestone: v1.6 - Core Reader API & Social Experience

Goal: Build public-facing APIs for frontend clients to consume content, track reading habits, and enable social interaction.

Target features:
- Reader Content APIs (Phase 16): discovery, chapter read analytics, bookmark/history UX.
- Social Interaction APIs (Phase 17): nested comments and reaction toggles.

## Active Scope (v1.6)

### Phase 16 - Reader Content APIs
- Public novel discovery API with pagination, sorting, and filters (category/tags/status).
- Chapter reading endpoint that safely increments Chapter and parent Novel view counts.
- Authenticated Bookmark and ReadingHistory APIs for resume UX.

### Phase 17 - Social Interaction APIs
- Nested comment list/create/reply APIs for novel/chapter discussions.
- Comment reaction toggle API with unique reaction safety.

## Out of Scope (v1.6)

- Realtime comments/chat (websocket streaming).
- Recommendation engine / personalization ML.
- Full-text search infrastructure.
- Notification fanout workflows for comment/reaction events.

</details>

---

*Last updated: 2026-04-08 after v1.6 milestone archive*
