# WordPress to NestJS Migration

## What This Is

A NestJS + PostgreSQL migration platform for a legacy WordPress novel/webcomic system.

Milestones v1.0-v1.5 established:
- schema and ETL migration foundation,
- strict reconciliation and rerun safety,
- ecosystem schema expansion,
- Google OAuth + RBAC,
- admin CMS import tooling.

## Core Value

Preserve every identity-sensitive and financial record with exact IDs and relationships while enabling safe operational tooling and scalable reader-facing APIs on the new platform.

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

## Validated Milestones

- v1.0: WordPress migration foundation shipped.
- v1.1: Content DB-to-DB migration and reconciliation shipped.
- v1.2: Uploader ownership model for novels shipped.
- v1.4: Ecosystem schema expansion shipped.
- v1.5: Auth verification + RBAC + CMS import shipped.

## Out of Scope (v1.6)

- Realtime comments/chat (websocket streaming).
- Recommendation engine / personalization ML.
- Full-text search infrastructure.
- Notification fanout workflows for comment/reaction events.

## Evolution

This document evolves at phase transitions and milestone boundaries.

After each phase transition:
1. Move shipped requirements to validated traceability.
2. Add decisions and known constraints discovered during execution.
3. Re-evaluate out-of-scope boundaries.

After each milestone:
1. Archive roadmap and requirements under .planning/milestones.
2. Collapse active roadmap and reset requirements for next milestone.
3. Update current state and next goals.

---

Last updated: 2026-04-08 after v1.6 milestone start
