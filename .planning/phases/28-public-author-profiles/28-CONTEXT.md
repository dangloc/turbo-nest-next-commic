# Phase 28-public-author-profiles - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Source:** User decisions captured during /gsd:discuss-phase 28

<domain>
## Phase Boundary

Deliver fully public author profile pages that expose creator identity, authored novel catalog, and aggregate creator stats. This phase covers only public profile read surfaces and does not include reader customization/progression sync work.

</domain>

<decisions>
## Implementation Decisions

### Public Profile Routing
- **D-01:** Use ID-based public route `/author/[id]` for phase 28 consistency with existing ID-based novel routing.

### Profile Data Contract
- **D-02:** Display identity name as `penName` when available; fallback to `nickname` when `penName` is missing.
- **D-03:** Render avatar and bio on the public profile page.
- **D-04:** If profile data is incomplete, render a clean basic fallback layout instead of failing or hiding the profile surface.

### Author Catalog Behavior
- **D-05:** Reuse the existing discovery novel-card pattern exactly for UI consistency.
- **D-06:** Default catalog sort is latest updated first.
- **D-07:** Use standard pagination behavior (no infinite scroll for this phase).

### Aggregate Stats
- **D-08:** Show these stats: total published novels, total views across all published novels, and latest update date.
- **D-09:** Compute stats live in backend queries for now; do not add caching in phase 28.

### Public Access and Empty/Error States
- **D-10:** Public author profile is fully accessible without authentication.
- **D-11:** Return 404 when author user ID does not exist.
- **D-12:** If author exists but has zero published novels, show friendly empty state text: "This author hasn't published any novels yet".

### Claude's Discretion
- Exact layout spacing, typography scale, and section ordering within the agreed contract.
- Exact SQL/Prisma query composition details as long as output contract and decisions D-01..D-12 are honored.
- Optional lightweight formatting helpers for view/date display that do not change required behavior.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- .planning/ROADMAP.md - phase 28 goal, scope, success criteria, and requirement mapping.
- .planning/REQUIREMENTS.md - AUTHOR-01, AUTHOR-02, AUTHOR-03 requirement definitions.
- .planning/PROJECT.md - v1.11 milestone intent and prior cross-phase decisions.

### Backend Data Model and Reader Patterns
- apps/api/prisma/schema.prisma - `User`, `AuthorProfile`, `Novel` data shape and author-to-novel linkage via `uploaderId`.
- apps/api/src/reader/reader-discovery.controller.ts - existing public discovery endpoint/controller style.
- apps/api/src/reader/reader.service.ts - existing pagination, sorting, and novel listing/query patterns.

### Frontend Discovery UI Patterns
- apps/web/src/features/discovery/types.ts - discovery response/query contracts and pagination defaults.
- apps/web/src/features/discovery/api.ts - typed API request and query param construction pattern.
- apps/web/src/features/discovery/discovery.tsx - canonical discovery novel-card and paginated feed rendering pattern to reuse.

</canonical_refs>

<specifics>
## Specific Ideas

- Keep author route shape simple and stable (`/author/[id]`) for immediate delivery.
- Prioritize consistency: author catalog cards should visually match discovery cards, not a new design variant.
- Empty catalog should still feel intentional and welcoming, not error-like.
- Live stats are preferred now; caching is explicitly deferred until needed by performance signals.

</specifics>

<deferred>
## Deferred Ideas

- Vanity/slug-based author URLs.
- Profile stats caching layer.
- Any phase 29/30 work (chapter reader UX, reader customization controls, progression sync).

</deferred>

---
*Phase: 28-public-author-profiles*
*Context gathered: 2026-04-09*
