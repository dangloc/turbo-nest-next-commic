---
phase: 45-novel-form-enhancements-image-asset-resolution
plan: 01
subsystem: ui
tags: [image, utility, react, vitest, typescript]

requires: []
provides:
  - resolveImageUrl utility in src/lib/image.ts with null/absolute/relative/double-slash handling
  - Vitest coverage for resolveImageUrl (8 passing cases)
  - ImageUploadField preview uses resolveImageUrl instead of inline process.env lookup
  - AdminNovelsTable shows Anh thumbnail column per row using resolveImageUrl
  - NovelManager shows Anh thumbnail column per row using resolveImageUrl
affects: [admin-novels, author-dashboard]

tech-stack:
  added: []
  patterns:
    - "resolveImageUrl: centralized env-aware image URL resolution with double-slash sanitization"
    - "TDD: tests written (RED) before implementation (GREEN) for utility functions"

key-files:
  created:
    - apps/web/src/lib/image.ts
    - apps/web/src/lib/__tests__/image.test.ts
  modified:
    - apps/web/src/features/admin-novels/novel-detail.tsx
    - apps/web/src/features/admin-novels/novels-table.tsx
    - apps/web/src/features/author-dashboard/components/novel-manager.tsx
    - apps/web/src/features/author-dashboard/types.ts

key-decisions:
  - "resolveImageUrl is the single source of truth for image URL resolution across all novel surfaces"
  - "featuredImage: string | null added to NovelRecord type — required for thumbnail rendering (was missing from actual types.ts)"
  - "novel-manager.tsx in worktree was a different (older) version from what plan described; adapted thumbnail insertion to actual file structure"

patterns-established:
  - "resolveImageUrl pattern: null guard -> absolute URL passthrough -> base+relative join -> double-slash collapse"

requirements-completed: [NOVELMGMT-04]

duration: 15min
completed: 2026-04-18
---

# Phase 45 Plan 01: resolveImageUrl Utility and Novel Thumbnail Columns Summary

**Environment-aware image URL resolution utility created and applied to all three novel image surfaces: edit form preview, admin novels table, and author dashboard table.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-18T21:43:00Z
- **Completed:** 2026-04-18T21:51:00Z
- **Tasks:** 3 completed
- **Files modified:** 5

## Accomplishments

- Created `apps/web/src/lib/image.ts` with `resolveImageUrl` — handles null/undefined/empty -> null, passes absolute URLs through unchanged, prepends `env.apiBaseUrl` to relative paths, and collapses double-slashes outside `://`
- 8-case Vitest suite passes: null, undefined, empty, http://, https://, /relative, bare-relative, double-slash inputs
- Replaced inline `process.env.NEXT_PUBLIC_API_BASE_URL` lookup in `ImageUploadField` with single `resolveImageUrl(value)` call
- Added "Anh" thumbnail column to both `AdminNovelsTable` (`/dashboard/novels`) and `NovelManager` (`/dashboard/author`) — hidden on mobile (md:table-cell)
- Added `featuredImage: string | null` to `NovelRecord` type (was missing from actual worktree types.ts)

## Task Commits

1. **Task 1: Create resolveImageUrl utility with Vitest coverage (TDD)** - `36b63fa` (feat)
2. **Task 2: Replace inline URL resolution in ImageUploadField** - `5041030` (feat)
3. **Task 3: Add thumbnail column to AdminNovelsTable and NovelManager** - `5cff510` (feat)

## Files Created/Modified

- `apps/web/src/lib/image.ts` — resolveImageUrl utility (new)
- `apps/web/src/lib/__tests__/image.test.ts` — 8-case Vitest suite (new)
- `apps/web/src/features/admin-novels/novel-detail.tsx` — ImageUploadField uses resolveImageUrl
- `apps/web/src/features/admin-novels/novels-table.tsx` — Anh thumbnail column added
- `apps/web/src/features/author-dashboard/components/novel-manager.tsx` — Anh thumbnail column added
- `apps/web/src/features/author-dashboard/types.ts` — featuredImage added to NovelRecord

## Vitest Output

```
Test Files  1 passed (1)
     Tests  8 passed (8)
  Duration  781ms
```

All 8 cases:
1. resolveImageUrl(null) -> null
2. resolveImageUrl(undefined) -> null
3. resolveImageUrl("") -> null
4. resolveImageUrl("http://example.com/a.jpg") -> unchanged
5. resolveImageUrl("https://cdn.example.com/a.jpg") -> unchanged
6. resolveImageUrl("/uploads/x.jpg") -> `${env.apiBaseUrl}/uploads/x.jpg`
7. resolveImageUrl("uploads/x.jpg") -> `${env.apiBaseUrl}/uploads/x.jpg`
8. resolveImageUrl("//uploads///x.jpg") -> `${env.apiBaseUrl}/uploads/x.jpg` (no double-slashes outside ://)

## src/lib/image.ts (exact contents)

```typescript
import { env } from "./env";

export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = env.apiBaseUrl; // already strips trailing "/"
  const joined = `${base}/${path.replace(/^\/+/, "")}`;
  // Collapse any remaining consecutive slashes that are NOT part of the protocol "://"
  return joined.replace(/([^:])\/\/+/g, "$1/");
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Field] Added featuredImage to NovelRecord type**
- **Found during:** Task 3
- **Issue:** `NovelRecord` in actual `types.ts` lacked `featuredImage: string | null`; TypeScript errors prevented compilation
- **Fix:** Added `featuredImage: string | null` to `NovelRecord` interface
- **Files modified:** `apps/web/src/features/author-dashboard/types.ts`
- **Commit:** `5cff510`

**2. [Rule 1 - Adaptation] novel-manager.tsx actual structure differed from plan description**
- **Found during:** Task 3
- **Issue:** The `novel-manager.tsx` in the worktree is an older version with different component structure (uses `var(--line)` CSS vars, different table layout, no colSpan placeholders). Plan described a newer version
- **Fix:** Applied thumbnail column insertion to actual file structure; colSpan change not applicable (this version renders table conditionally, no loading/empty placeholder rows with colSpan)
- **Files modified:** `apps/web/src/features/author-dashboard/components/novel-manager.tsx`
- **Commit:** `5cff510`

## Known Stubs

None — resolveImageUrl is fully wired; thumbnails render from live `featuredImage` field.

## Self-Check: PASSED
