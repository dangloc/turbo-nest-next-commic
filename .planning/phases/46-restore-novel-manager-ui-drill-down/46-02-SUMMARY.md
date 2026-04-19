---
phase: 46-restore-novel-manager-ui-drill-down
plan: "02"
subsystem: author-dashboard / admin-novels
tags: [auth-guard, cleanup, novel-detail, orphan-removal]
dependency_graph:
  requires: [46-01]
  provides: [NOVELUI-03-complete]
  affects: [admin-novels/novel-detail, author-dashboard/components, author-dashboard/tests]
tech_stack:
  added: []
  patterns: [bootstrapAuthorDashboardSession-guard, GuardState-discriminated-union, client-side-session-guard]
key_files:
  created: []
  modified:
    - apps/web/src/features/admin-novels/novel-detail.tsx
    - apps/web/src/features/author-dashboard/__tests__/author-dashboard-flow.dom.test.jsx
  deleted:
    - apps/web/src/features/author-dashboard/components/novel-manager.tsx
    - apps/web/src/features/author-dashboard/__tests__/novel-manager.dom.test.jsx
    - apps/web/src/features/author-dashboard/__tests__/novel-manager.table.dom.test.jsx
decisions:
  - "Client-side guard required because session is stored in localStorage, not HTTP cookies — server-side Next.js redirect cannot read the session token"
  - "Mirrored exact guard pattern from AuthorDashboardView to ensure consistent redirect behavior across all AUTHOR/ADMIN routes"
  - "Orphan test files deleted rather than updated — no subject component to test against"
metrics:
  duration: "~12 minutes"
  completed: "2026-04-19"
  tasks_completed: 2
  files_modified: 2
  files_deleted: 3
---

# Phase 46 Plan 02: NovelDetail Auth Guard + Orphan Cleanup Summary

**One-liner:** Client-side AUTHOR/ADMIN guard added to NovelDetail via bootstrapAuthorDashboardSession; orphaned novel-manager component and its dedicated tests deleted.

---

## Tasks Completed

### Task 1: Add bootstrapAuthorDashboardSession guard to NovelDetail (commit: 3e52964)

Added an auth guard to `apps/web/src/features/admin-novels/novel-detail.tsx` mirroring the pattern from `AuthorDashboardView`.

**Imports added:**
- `useContext` added to the existing React import
- `AppContext` from `../../providers/app-provider`
- `bootstrapAuthorDashboardSession` from `../author-dashboard/api`

**State shape (GuardState discriminated union):**
```typescript
type GuardState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };
```

**Guard useEffect deps:** `[loaded, router, setUser, user]`

**Behavior by user type:**
- Unauthenticated: `bootstrapAuthorDashboardSession(null)` returns `{ kind: "redirect", to: "/auth/login" }` → `router.replace("/auth/login")`
- READER role: returns `{ kind: "redirect", to: "/dashboard", reason: "forbidden_role" }` → `router.replace("/dashboard")`
- AUTHOR/ADMIN: returns `{ kind: "ready", user }` → `setUser(user)`, `setGuardState({ status: "ready" })`

**Render branches added (in order before existing novelLoading check):**
1. `!loaded || guardState.status === "loading"` → "Đang tải..." panel
2. `guardState.status === "error"` → destructive message panel using `guardState.message` (NOT `guardState.status.message`)

**Data-loading effects gated:**
- "Load novel + terms" useEffect: early-returns if `guardState.status !== "ready"`; added `guardState.status` to dep array → `[novelId, guardState.status]`
- "Load chapters" useEffect: early-returns if `guardState.status !== "ready"` (before existing `if (!novel) return;`); dep array → `[novel?.id, guardState.status]`

---

### Task 2: Delete orphan novel-manager.tsx and clean up test references (commit: 0b43fc0)

**Files deleted:**
- `apps/web/src/features/author-dashboard/components/novel-manager.tsx` — orphaned in 46-01 when `AuthorDashboardView` was simplified to no longer render it
- `apps/web/src/features/author-dashboard/__tests__/novel-manager.dom.test.jsx` — co-orphan; had no remaining subject component
- `apps/web/src/features/author-dashboard/__tests__/novel-manager.table.dom.test.jsx` — co-orphan; had no remaining subject component

**Surgical edit to `author-dashboard-flow.dom.test.jsx`:**
- Removed the obsolete `vi.mock("../components/novel-manager", ...)` block (lines 19-21) that was dead code after the component was removed
- No test cases depended on the mock directly (no `data-testid="novel-manager-stub"` assertions in the file)
- Remaining 2 test cases (allows AUTHOR redirect, redirects unauthorized) still pass

**Post-cleanup verification:**
- Zero ES import references to `novel-manager` in `apps/web/src`
- Zero `vi.mock` references to `novel-manager` in `apps/web/src`
- `author-dashboard-flow.dom.test.jsx` passes: 2/2 tests green
- Sibling components `confirm-dialog.tsx` and `term-selector.tsx` remain untouched

---

## Deviations from Plan

None - plan executed exactly as written. The pre-existing TypeScript errors in `novel-detail.tsx` (missing `deleteAllChapters`, `getNovel`, `importChapters` exports) were present before this plan executed and are out of scope per the deviation rules scope boundary.

---

## Requirement Closure

- **NOVELUI-03:** Fully satisfied. Verification truth 7 ("/dashboard/novels/[id] is protected (AUTHOR/ADMIN only)") now passes.
- Gap 1 (BLOCKER): Closed — NovelDetail now enforces AUTHOR/ADMIN access via `bootstrapAuthorDashboardSession`.
- Gap 2 (Cleanup): Closed — `novel-manager.tsx` and its orphan test files deleted; no references remain.

---

## Self-Check: PASSED

- `apps/web/src/features/admin-novels/novel-detail.tsx` — exists, contains guard ✓
- `apps/web/src/features/author-dashboard/components/novel-manager.tsx` — deleted ✓
- `apps/web/src/features/author-dashboard/__tests__/novel-manager.dom.test.jsx` — deleted ✓
- `apps/web/src/features/author-dashboard/__tests__/novel-manager.table.dom.test.jsx` — deleted ✓
- `apps/web/src/features/author-dashboard/__tests__/author-dashboard-flow.dom.test.jsx` — exists, vi.mock removed, 2/2 tests pass ✓
- Commit 3e52964 — exists ✓
- Commit 0b43fc0 — exists ✓
