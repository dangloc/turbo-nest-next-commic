# Phase 06-content-schema-id-preservation - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Source:** Milestone request and repository inspection

<domain>
## Phase Boundary

Strict DB-to-DB content migration for novels and chapters only. This phase establishes the target schema and ETL contracts required to preserve exact source IDs and parent relationships before any full import work begins.

</domain>

<decisions>
## Implementation Decisions

### Content Scope
- Migrate only wp_posts rows where post_type = 'truyen_chu' or 'chuong_truyen'.
- Copy chapter post_content raw; do not parse Word/Text files in ETL.
- Preserve chapter-to-novel relationships from wp_postmeta where meta_key = 'chuong_with_truyen'.

### Identity Preservation
- Force original MySQL IDs into the target database.
- Use exact source IDs for relational links so purchase history remains intact.

### the agent's Discretion
- Whether target Prisma models expose source IDs as primary keys or stable unique columns, as long as exact IDs are preserved.
- Whether loaders and repositories are wired immediately or staged behind contracts for the next phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap
- .planning/ROADMAP.md — phase 6 scope and phase 7/8 sequencing

### Existing ETL schema/contracts
- apps/api/prisma/schema.prisma — current normalized migration schema
- apps/api/src/etl/types.ts — ETL contract conventions and shared source-row shapes
- apps/api/src/etl/source-mysql-loaders.ts — current MySQL source loader pattern
- apps/api/src/etl/prisma-repositories.ts — current Prisma repository pattern
- apps/api/src/etl/etl-runner.ts — ETL orchestration contract

</canonical_refs>

<specifics>
## Specific Ideas

- Novels source: wp_posts where post_type = truyen_chu; extract ID and post_title.
- Chapters source: wp_posts where post_type = chuong_truyen; extract ID, post_title, and raw post_content.
- Relationship source: wp_postmeta where meta_key = chuong_with_truyen; post_id is the chapter ID and meta_value is the parent novel ID.
- Exact IDs must survive into PostgreSQL so chapter-to-novel links and purchase history remain stable.

</specifics>

<deferred>
## Deferred Ideas

- Heavy Word/Text parsing or rich-content cleanup in ETL.
- Manual CMS import tooling for post-migration content editing.
- Any content types outside novels and chapters.

</deferred>

---
*Phase: 06-content-schema-id-preservation*
*Context gathered: 2026-04-07*
