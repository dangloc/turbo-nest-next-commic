---
phase: 44-admin-dashboard-ui-overhaul-shadcn-admin-shell
plan: 02
subsystem: ui
tags: [shadcn, sidebar, admin-shell, next-navigation, app-context, cookies]

# Dependency graph
requires:
  - phase: 44-01
    provides: ShadCN sidebar/dropdown-menu/separator components, .admin-shell CSS variables, cn utility
provides:
  - apps/web/src/components/admin/nav-items.ts (NavItem type + navItems array)
  - apps/web/src/components/admin/admin-sidebar.tsx (AdminSidebar client component)
  - apps/web/src/components/admin/admin-header.tsx (AdminHeader client component)
  - apps/web/src/components/admin/admin-layout.tsx (AdminLayout async server component)
affects: [44-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SidebarMenuButton render prop pattern via @base-ui/react useRender API (not asChild)"
    - "AdminLayout as async server component reading sidebar_state cookie before render"
    - "SessionUser shape adaptation: nickname/email fields (no displayName/username)"

key-files:
  created:
    - apps/web/src/components/admin/nav-items.ts
    - apps/web/src/components/admin/admin-sidebar.tsx
    - apps/web/src/components/admin/admin-header.tsx
    - apps/web/src/components/admin/admin-layout.tsx
  modified: []

key-decisions:
  - "SidebarMenuButton uses render prop (not asChild) because this project's ShadCN sidebar uses @base-ui/react useRender API"
  - "SessionUser type has nickname/email (not displayName/username) — all user display adapted accordingly"
  - "Avatar component only supports fallback+className props — src/alt not applicable"
  - "DropdownMenuTrigger uses render prop for button element following @base-ui/react pattern"

# Metrics
duration: 4min
completed: 2026-04-14
---

# Phase 44 Plan 02: Admin Shell Components Summary

**Four admin shell components built as Next.js-adapted ports of shadcn-admin: nav definitions, collapsible sidebar, sticky header, and async server layout assembly**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-14T12:25:40Z
- **Completed:** 2026-04-14T12:29:47Z
- **Tasks:** 4
- **Files created:** 4

## Accomplishments

- Created `nav-items.ts` with `NavItem` interface and three nav entries using real Lucide icons (LayoutDashboard, BookOpen, Wallet)
- Created `admin-sidebar.tsx` with collapsible icon-only mode, active state via `usePathname()`, and full logout flow
- Created `admin-header.tsx` with sticky positioning, SidebarTrigger, page title from pathname, theme toggle, and user dropdown
- Created `admin-layout.tsx` as async server component reading `sidebar_state` cookie and wrapping in `.admin-shell` scope

## Task Commits

Each task was committed atomically:

1. **Task 1: nav-items.ts** - `9212111` (feat)
2. **Task 2: admin-sidebar.tsx** - `5a18061` (feat)
3. **Task 3: admin-header.tsx** - `c9bec3f` (feat)
4. **Task 4: admin-layout.tsx** - `6a6e48a` (feat)

## Files Created

- `apps/web/src/components/admin/nav-items.ts` - NavItem type + navItems array with 3 entries
- `apps/web/src/components/admin/admin-sidebar.tsx` - Collapsible sidebar, active nav, logout
- `apps/web/src/components/admin/admin-header.tsx` - Sticky header, theme toggle, user dropdown
- `apps/web/src/components/admin/admin-layout.tsx` - Async server layout, cookie read, .admin-shell scope

## Decisions Made

- Used `render` prop on `SidebarMenuButton` instead of `asChild` because this project's sidebar uses `@base-ui/react` `useRender` API rather than Radix UI's Slot pattern
- Adapted `SessionUser` type usage: used `nickname` and `email` fields (plan spec assumed `displayName`/`username` which don't exist in the actual type)
- Avatar component only accepts `fallback` and `className` — adapted to show initial letter from user's nickname or email
- Used `variant="destructive"` on `DropdownMenuItem` for logout instead of `className` override, matching the component's built-in destructive styling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SidebarMenuButton uses render prop, not asChild**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** Plan specified `asChild` on `SidebarMenuButton`, but the project's ShadCN sidebar uses `@base-ui/react`'s `useRender` API which takes a `render` prop (React element) not a Radix UI-style `asChild` prop
- **Fix:** Changed all `SidebarMenuButton asChild` usage to `render={<element>}` pattern
- **Files modified:** admin-sidebar.tsx, admin-header.tsx
- **Committed in:** 5a18061, c9bec3f

**2. [Rule 1 - Bug] SessionUser type mismatch — no displayName or username fields**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** Plan spec interfaces showed `displayName` and `username` fields on `SessionUser`, but the actual type at `apps/web/src/lib/api/types.ts` only has `id`, `email`, `nickname`, and `role`
- **Fix:** Replaced all `user?.displayName` and `user?.username` with `user?.nickname` and `user?.email`
- **Files modified:** admin-sidebar.tsx, admin-header.tsx
- **Committed in:** 5a18061, c9bec3f

**3. [Rule 1 - Bug] Avatar component has no src/alt props**
- **Found during:** Task 2 (reviewing Avatar implementation)
- **Issue:** Plan spec showed `Avatar` with `src`, `alt`, `fallback` props, but the actual component at `apps/web/src/components/ui/avatar.tsx` only accepts `fallback` and `className`
- **Fix:** Used only `fallback` prop (initial letter from nickname/email) with `className`
- **Files modified:** admin-sidebar.tsx, admin-header.tsx
- **Committed in:** 5a18061, c9bec3f

---

**Total deviations:** 3 auto-fixed bugs (all type/API mismatches between plan spec and actual codebase)
**Impact on plan:** All four components deliver the specified shell behavior. Adaptations only affect prop usage, not functionality.

## Known Stubs

None — these are pure UI shell components with no data fetching or display logic. Data flows from AppContext which is hydrated by the existing auth system.

## Self-Check: PASSED
