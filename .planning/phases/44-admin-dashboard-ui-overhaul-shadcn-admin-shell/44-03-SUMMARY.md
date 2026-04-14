---
phase: 44-admin-dashboard-ui-overhaul-shadcn-admin-shell
plan: 03
subsystem: ui
tags: [next-app-router, route-groups, admin-shell, public-layout, header, AdminLayout]

# Dependency graph
requires:
  - phase: 44-02
    provides: AdminLayout async server component, admin-sidebar, admin-header, nav-items
provides:
  - apps/web/app/layout.tsx (Root layout html/body/AppProvider only — no Header)
  - apps/web/app/(public)/layout.tsx (Public layout wrapping all non-dashboard routes with Header)
  - apps/web/app/(admin)/dashboard/layout.tsx (Admin layout mounting AdminLayout for dashboard routes)
  - apps/web/app/(admin)/dashboard/page.tsx (Dashboard page rendering DashboardView)
  - apps/web/app/(admin)/dashboard/author/page.tsx (Author dashboard page rendering AuthorDashboardView)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js route groups (public) and (admin) to isolate Header from AdminLayout without URL changes"
    - "Root layout owns html/body/AppProvider only; group layouts own Header or AdminLayout"

key-files:
  created:
    - apps/web/app/(public)/layout.tsx
    - apps/web/app/(admin)/dashboard/layout.tsx
    - apps/web/app/(admin)/dashboard/page.tsx
    - apps/web/app/(admin)/dashboard/author/page.tsx
  modified:
    - apps/web/app/layout.tsx
    - apps/web/app/(public)/page.tsx
    - apps/web/app/(public)/auth/login/page.tsx
    - apps/web/app/(public)/auth/register/page.tsx
    - apps/web/app/(public)/author/[id]/page.tsx
    - apps/web/app/(public)/category/[slug]/page.tsx
    - apps/web/app/(public)/novels/[id]/page.tsx
    - apps/web/app/(public)/reader/chapters/[chapterId]/page.tsx

key-decisions:
  - "Route group directories add a path segment for files but not for URLs — all import depths updated to account for extra nesting level"
  - "Deleted stale .next/types/validator.ts errors by removing the .next build cache — regenerates on next dev/build run"

# Metrics
duration: 6min
completed: 2026-04-14
---

# Phase 44 Plan 03: Route Group Migration Summary

**Route group refactor isolating public Header from AdminLayout: (public) group for all non-dashboard routes, (admin) group for dashboard routes with sidebar shell**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-14T12:32:07Z
- **Completed:** 2026-04-14T12:38:25Z
- **Tasks:** 4 + checkpoint
- **Files modified:** 13

## Accomplishments

- Stripped `Header` import and render from `apps/web/app/layout.tsx` — root layout now owns only html/body/AppProvider
- Created `app/(public)/layout.tsx` wrapping all public routes with `<Header />`
- Moved all public pages (page.tsx, auth/, author/, category/, novels/, reader/) into `app/(public)/` group using git mv
- Created `app/(admin)/dashboard/layout.tsx` mounting `AdminLayout` for all dashboard routes
- Moved `dashboard/page.tsx` and `dashboard/author/page.tsx` into `app/(admin)/dashboard/` group
- All public URLs and dashboard URLs unchanged — Next.js strips route group names

## Task Commits

Each task was committed atomically:

1. **Task 1: Strip Header from root layout** — `6ab38f0` (feat)
2. **Task 2: Create (public) group with Header layout, move public pages** — `78aff2d` (feat)
3. **Task 3: Create (admin) group, wire AdminLayout** — `01748b7` (feat)
4. **Task 4: TypeScript compile + import path audit** — `9596686` (fix)

## Files Created

- `apps/web/app/(public)/layout.tsx` — Public layout with `<Header />`
- `apps/web/app/(admin)/dashboard/layout.tsx` — Admin layout wrapping `<AdminLayout>`
- `apps/web/app/(admin)/dashboard/page.tsx` — Dashboard page (DashboardView)
- `apps/web/app/(admin)/dashboard/author/page.tsx` — Author dashboard page (AuthorDashboardView)

## Files Modified (moved + import-depth-updated)

- `apps/web/app/layout.tsx` — Header removed
- `apps/web/app/(public)/page.tsx` — import depth: `../src/` → `../../src/`
- `apps/web/app/(public)/auth/login/page.tsx` — import depth: `../../../src/` → `../../../../src/`
- `apps/web/app/(public)/auth/register/page.tsx` — import depth: `../../../src/` → `../../../../src/`
- `apps/web/app/(public)/author/[id]/page.tsx` — import depth: `../../../src/` → `../../../../src/`
- `apps/web/app/(public)/category/[slug]/page.tsx` — import depth: `../../../src/` → `../../../../src/`
- `apps/web/app/(public)/novels/[id]/page.tsx` — import depth: `../../../src/` → `../../../../src/`
- `apps/web/app/(public)/reader/chapters/[chapterId]/page.tsx` — import depth: `../../../../src/` → `../../../../../src/`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] All moved (public) pages had wrong relative import depths after git mv**
- **Found during:** Task 4 (TypeScript compile check)
- **Issue:** `git mv app/auth app/(public)/auth` moves files but does not update import paths. Each file that used `../../../src/` pointing to `apps/web/src/` now resolves one level short because the `(public)` group adds one extra directory level. All sub-pages needed one additional `../` prefix.
- **Fix:** Updated all relative imports in auth/login, auth/register, author/[id], category/[slug], novels/[id] from `../../../src/` to `../../../../src/`; updated reader/chapters/[chapterId] from `../../../../src/` to `../../../../../src/`
- **Files modified:** 6 page files in (public) group
- **Commit:** 9596686

**2. [Rule 1 - Bug] Stale .next/types/validator.ts with old route paths**
- **Found during:** Task 4 (TypeScript compile)
- **Issue:** `.next/types/validator.ts` (generated by Next.js) had hardcoded references to old paths like `app/auth/login/page.js` that no longer exist
- **Fix:** Deleted `.next/` build cache directory — errors disappear, file regenerates on next `npm run dev`
- **Files modified:** removed `.next/` (not committed — generated output)
- **Commit:** part of 9596686 fix

**3. Pre-existing TypeScript errors (out of scope — NOT fixed)**
- `src/components/header.tsx`: `displayName` property error — pre-existing, not related to this plan
- `src/features/dashboard/dashboard.tsx`: `any` type and property errors — pre-existing
- `src/components/header.redesign.tsx`: duplicate identifier errors — pre-existing draft file

These errors existed before phase 44 and are not caused by route group migration.

## Known Stubs

None — this plan is purely structural (route group moves and layout files). No data fetching, display logic, or UI components added.

## Self-Check: PASSED
