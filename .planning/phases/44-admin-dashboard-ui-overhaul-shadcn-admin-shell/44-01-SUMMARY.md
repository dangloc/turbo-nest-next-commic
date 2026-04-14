---
phase: 44-admin-dashboard-ui-overhaul-shadcn-admin-shell
plan: 01
subsystem: ui
tags: [shadcn, tailwind, clsx, tailwind-merge, lucide-react, css-variables, sidebar]

# Dependency graph
requires:
  - phase: 43-reader-monetization-ui-gaps
    provides: existing apps/web ui components and globals.css public palette
provides:
  - clsx + tailwind-merge cn() utility in apps/web/src/lib/cn.ts
  - ShadCN Sidebar, DropdownMenu, Separator, Tooltip, Sheet, Skeleton components in apps/web/src/components/ui/
  - apps/web/src/lib/utils.ts (ShadCN cn utility coexisting with lib/cn.ts)
  - .admin-shell scoped CSS variables in globals.css (sidebar, neutral palette, dark variants)
  - apps/web/components.json ShadCN registry config
  - apps/web/src/hooks/use-mobile.ts responsive hook
affects: [44-02, 44-03]

# Tech tracking
tech-stack:
  added: [clsx ^2.1.1, tailwind-merge ^3.5.0, lucide-react ^1.8.0, @base-ui/react ^1.4.0, class-variance-authority ^0.7.1, tw-animate-css ^1.4.0, shadcn ^4.2.0]
  patterns: [ShadCN component model with @base-ui/react primitives, scoped admin CSS variables under .admin-shell selector]

key-files:
  created:
    - apps/web/src/components/ui/sidebar.tsx
    - apps/web/src/components/ui/dropdown-menu.tsx
    - apps/web/src/components/ui/separator.tsx
    - apps/web/src/components/ui/tooltip.tsx
    - apps/web/src/components/ui/sheet.tsx
    - apps/web/src/components/ui/skeleton.tsx
    - apps/web/src/lib/utils.ts
    - apps/web/src/hooks/use-mobile.ts
    - apps/web/components.json
  modified:
    - apps/web/src/lib/cn.ts
    - apps/web/app/globals.css
    - apps/web/package.json
    - apps/web/tsconfig.json
    - apps/web/src/components/ui/button.tsx

key-decisions:
  - "ShadCN init (--defaults) used for Tailwind v4 auto-detection; tsconfig paths alias added as prerequisite"
  - "button.tsx custom implementation preserved; ShadCN replaced it but was reverted to keep shd-btn CSS pattern"
  - "layout.tsx Google font addition from ShadCN init reverted to keep local font setup"
  - "--muted-admin and --accent-admin aliases used in .admin-shell to avoid overriding public site --muted (warm brown) and --accent (orange)"
  - "ShadCN's :root variables (--background, --foreground, etc.) left in :root block added by init; they coexist with public palette due to different names"
  - "ButtonSize union extended with 'icon-sm' and children made optional for ShadCN sheet/sidebar compatibility"

patterns-established:
  - "Admin shell scoping: all admin layout wrappers get .admin-shell class; ShadCN sidebar variables only resolve inside that scope"
  - "Two cn utilities coexist: src/lib/cn.ts (for existing components importing ../../lib/cn) and src/lib/utils.ts (ShadCN components importing @/lib/utils) — both identical"

requirements-completed: [DASHUI-01]

# Metrics
duration: 25min
completed: 2026-04-14
---

# Phase 44 Plan 01: ShadCN Dependency Layer and Admin Shell CSS Foundation Summary

**clsx/tailwind-merge cn() upgrade, ShadCN Sidebar + component suite installation, and .admin-shell scoped CSS variables appended to globals.css without disturbing the public-site warm palette**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-14T12:15:00Z
- **Completed:** 2026-04-14T12:40:00Z
- **Tasks:** 5
- **Files modified:** 14

## Accomplishments
- Installed clsx, tailwind-merge, lucide-react as runtime dependencies in apps/web
- Upgraded cn() from simple string-join to twMerge(clsx(inputs)) — backward compatible
- Initialized ShadCN with Tailwind v4 detection; added sidebar, dropdown-menu, separator, tooltip components
- Appended .admin-shell and html.dark .admin-shell CSS variable blocks to globals.css — public palette intact
- All ShadCN-generated components compile clean; pre-existing dashboard/header errors unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Install clsx, tailwind-merge, lucide-react** - `c684afd` (chore)
2. **Task 2: Upgrade cn utility to clsx + tailwind-merge** - `ba67f01` (feat)
3. **Task 3: Initialize ShadCN and add Sidebar + required components** - `96310ee` (feat)
4. **Task 4: Add scoped admin CSS variables to globals.css** - `4e64697` (feat)
5. **Task 5: TypeScript clean-compile verification** - `38db53a` (fix)

## Files Created/Modified
- `apps/web/src/lib/cn.ts` - Upgraded to twMerge(clsx(inputs)) with ClassValue signature
- `apps/web/src/lib/utils.ts` - ShadCN-generated cn utility (coexists; ShadCN components import this via @/lib/utils)
- `apps/web/src/components/ui/sidebar.tsx` - ShadCN Sidebar component tree with use-mobile hook
- `apps/web/src/components/ui/dropdown-menu.tsx` - ShadCN DropdownMenu using @base-ui/react Menu
- `apps/web/src/components/ui/separator.tsx` - ShadCN Separator
- `apps/web/src/components/ui/tooltip.tsx` - ShadCN Tooltip
- `apps/web/src/components/ui/sheet.tsx` - ShadCN Sheet (slide-over panel using @base-ui/react Dialog)
- `apps/web/src/components/ui/skeleton.tsx` - ShadCN Skeleton loading placeholder
- `apps/web/src/hooks/use-mobile.ts` - Responsive breakpoint hook (used by Sidebar)
- `apps/web/components.json` - ShadCN registry config (Tailwind v4, @base-ui style, @/* alias)
- `apps/web/app/globals.css` - Added ShadCN :root variables + .admin-shell and html.dark .admin-shell scoped blocks
- `apps/web/package.json` - Added clsx, tailwind-merge, lucide-react, @base-ui/react, class-variance-authority, tw-animate-css
- `apps/web/tsconfig.json` - Added baseUrl + paths alias (@/* -> ./src/*)
- `apps/web/src/components/ui/button.tsx` - Extended ButtonSize with 'icon-sm', made children optional

## Decisions Made
- Used --defaults flag for ShadCN init to skip prompts; tsconfig paths was a required prerequisite
- Preserved custom button.tsx shd-btn pattern by restoring file after ShadCN overwrote it
- Reverted ShadCN's Google Fonts addition to layout.tsx (kept local font setup)
- Used --muted-admin/--accent-admin aliases instead of --muted/--accent in .admin-shell to avoid collisions with public warm palette
- Extended ButtonSize with 'icon-sm' to satisfy ShadCN sidebar/sheet type requirements without breaking existing callers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added tsconfig paths alias for ShadCN init prerequisite**
- **Found during:** Task 3
- **Issue:** `npx shadcn init` failed with "No import alias found in tsconfig.json"
- **Fix:** Added `"baseUrl": "."` and `"paths": { "@/*": ["./src/*"] }` to apps/web/tsconfig.json
- **Files modified:** apps/web/tsconfig.json
- **Committed in:** 96310ee (Task 3 commit)

**2. [Rule 1 - Bug] Restored custom button.tsx after ShadCN overwrote it**
- **Found during:** Task 3
- **Issue:** `shadcn init --defaults` silently replaced the project's custom button.tsx (shd-btn CSS pattern) with ShadCN's @base-ui version
- **Fix:** Restored original button.tsx from git history; ShadCN version would have broken all existing button usages
- **Files modified:** apps/web/src/components/ui/button.tsx
- **Committed in:** 96310ee (Task 3 commit)

**3. [Rule 1 - Bug] Restored --muted and --accent in :root after ShadCN collision**
- **Found during:** Task 3
- **Issue:** ShadCN init replaced `--muted: #6e645c` with `--muted: oklch(0.97 0 0)` and `--accent: #b85c2f` with `--accent: oklch(0.97 0 0)` in the existing :root block
- **Fix:** Restored original hex values; ShadCN values kept in .admin-shell as --muted-admin/--accent-admin per plan intent
- **Files modified:** apps/web/app/globals.css
- **Committed in:** 96310ee (Task 3 commit)

**4. [Rule 1 - Bug] Reverted ShadCN's Google Fonts addition to layout.tsx**
- **Found during:** Task 3
- **Issue:** ShadCN init added `import { Geist } from "next/font/google"` to layout.tsx — requires network access and duplicates existing local font setup
- **Fix:** Reverted layout.tsx to original; local GeistVF.woff fonts are already in place
- **Files modified:** apps/web/app/layout.tsx
- **Committed in:** 96310ee (Task 3 commit)

**5. [Rule 1 - Bug] Extended ButtonSize and made children optional for ShadCN compatibility**
- **Found during:** Task 5 (TypeScript verification)
- **Issue:** sheet.tsx and sidebar.tsx passed `size="icon-sm"` to custom Button which only accepted "sm" | "md" | "icon"; sheet.tsx also used Button as @base-ui render prop without children
- **Fix:** Added "icon-sm" to ButtonSize union; made children optional in ButtonProps
- **Files modified:** apps/web/src/components/ui/button.tsx
- **Committed in:** 38db53a (Task 5 commit)

---

**Total deviations:** 5 auto-fixed (4 bugs, 1 blocking prerequisite)
**Impact on plan:** All fixes required for correct ShadCN installation without breaking existing public site. No scope creep.

## Known Stubs
None — this plan installs infrastructure (packages, components, CSS variables) with no UI rendering or data display.

## Self-Check
- [x] apps/web/src/lib/cn.ts exists and uses twMerge(clsx(inputs))
- [x] apps/web/src/components/ui/sidebar.tsx exists
- [x] apps/web/src/components/ui/dropdown-menu.tsx exists
- [x] apps/web/src/components/ui/separator.tsx exists
- [x] globals.css contains --bg: #f6f1e8 (public palette intact)
- [x] globals.css contains --accent: #b85c2f (public palette intact)
- [x] globals.css contains .admin-shell { block
- [x] All task commits exist: c684afd, ba67f01, 96310ee, 4e64697, 38db53a

---
*Phase: 44-admin-dashboard-ui-overhaul-shadcn-admin-shell*
*Completed: 2026-04-14*
