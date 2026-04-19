---
phase: 46-restore-novel-manager-ui-drill-down
plan: "01"
subsystem: author-dashboard-ui
tags: [dialog, create-flow, redirect, layout-cleanup, shadcn]
dependency_graph:
  requires: []
  provides: [dialog-component, novel-create-dialog, author-page-redirect]
  affects: [admin-novels-table, author-dashboard-view, dashboard-author-route]
tech_stack:
  added: ["@radix-ui/react-dialog (via shadcn dialog)"]
  patterns: ["Shadcn Dialog with controlled open state", "server-side redirect via next/navigation redirect()"]
key_files:
  created:
    - apps/web/src/components/ui/dialog.tsx
  modified:
    - apps/web/src/features/admin-novels/novels-table.tsx
    - apps/web/src/features/author-dashboard/author-dashboard.tsx
    - apps/web/app/(admin)/dashboard/author/page.tsx
decisions:
  - "Used controlled Dialog state (createOpen) rather than DialogTrigger to allow resetting form state on close"
  - "Used server-side redirect() in /dashboard/author/page.tsx (not client-side) so redirect fires before any rendering"
  - "Kept bootstrapAuthorDashboardSession in AuthorDashboardView so auth guard still runs if someone lands on /dashboard/author without being redirected"
metrics:
  duration_seconds: 264
  completed_date: "2026-04-19"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 3
---

# Phase 46 Plan 01: Dialog Create Flow + Author Dashboard Redirect Summary

Installed Shadcn Dialog component, added a Dialog-based "Thêm truyện" create flow to AdminNovelsTable, and converted /dashboard/author to a server-side redirect to /dashboard/novels while stripping the obsolete split-pane NovelManager/ChapterManager layout from AuthorDashboardView.

## What Was Built

**Task 1: Shadcn Dialog Component**
- Installed `apps/web/src/components/ui/dialog.tsx` via `npx shadcn@latest add dialog --yes`
- Exports: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose, DialogOverlay, DialogPortal
- Backed by `@radix-ui/react-dialog`

**Task 2: Dialog Create Flow in AdminNovelsTable**
- Added "Thêm truyện" Button with Plus icon to the toolbar (before the ml-auto display settings button)
- Added controlled Dialog with form containing:
  - Title input (maxLength=255, required, validated client-side)
  - Description textarea (required, validated client-side)
  - Error display, loading state ("Đang tạo..."), Hủy and Tạo truyện buttons
- On successful `createNovel` call, calls `router.push('/dashboard/novels/' + res.data.id)` to redirect to the new novel's detail page
- Dialog resets form state on close via `onOpenChange` handler

**Task 3: /dashboard/author Redirect + Layout Cleanup**
- Replaced `/dashboard/author/page.tsx` with a minimal server component calling `redirect("/dashboard/novels")`
- Removed from `author-dashboard.tsx`:
  - `ChapterManager` and `NovelManager` imports
  - `NovelRecord` type import
  - `useCallback` import
  - `selectedNovel` state and `handleSelectNovel` callback
  - The `lg:grid-cols-2` grid containing both managers
- Replaced the grid with a simple redirect message with a link to /dashboard/novels
- Auth guard (`bootstrapAuthorDashboardSession`) remains intact for any direct visits

## Key Decisions

1. **Controlled Dialog open state** — Using `useState(false)` for `createOpen` rather than `DialogTrigger` wrappers gives explicit control over resetting form fields and errors when the dialog closes.

2. **Server-side `redirect()` for /dashboard/author** — Using Next.js `redirect()` from `next/navigation` in a server component issues an HTTP 307 before any rendering, which is faster and cleaner than a client-side `useEffect` redirect.

3. **Kept auth guard in AuthorDashboardView** — The `bootstrapAuthorDashboardSession` call remains so the component still handles unauthenticated users who might reach it without the server redirect (e.g., cached pages, direct API access).

## Files Created
- `apps/web/src/components/ui/dialog.tsx` (new, 158 lines)

## Files Modified
- `apps/web/src/features/admin-novels/novels-table.tsx` (+112 lines: imports, state, handler, Button, Dialog JSX)
- `apps/web/src/features/author-dashboard/author-dashboard.tsx` (simplified, removed 20 lines)
- `apps/web/app/(admin)/dashboard/author/page.tsx` (replaced with 5-line redirect)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a44ed82 | feat(46-01): install Shadcn Dialog component |
| 2 | c4de393 | feat(46-01): add Dialog create flow to AdminNovelsTable |
| 3 | 9127a38 | feat(46-01): redirect /dashboard/author and strip AuthorDashboardView split-pane |

## Deviations from Plan

None — plan executed exactly as written.

Pre-existing TypeScript errors in `novels-table.tsx` (DropdownMenuTrigger `asChild` prop type errors) and other files (`header.redesign.tsx`, `novel-detail.tsx`) were present before this plan and are out of scope per the SCOPE BOUNDARY rule.

## Known Stubs

None — all data flows are wired. The create form calls the real `createNovel` API function and redirects to the real novel detail page on success.
