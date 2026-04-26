---
gsd_state_version: 1.0
milestone: v1.16
milestone_name: The Revenue Pipeline - SePay Integration & User Top-Ups
current_phase: 53
status: completed
last_updated: "2026-04-27T01:11:24+07:00"
progress:
  total_phases: 52
  completed_phases: 48
  total_plans: 79
  completed_plans: 81
  percent: 100
---

# GSD Workflow State

Current Milestone: v1.16 (The Revenue Pipeline - SePay Integration & User Top-Ups)
Current Phase: 53
Status: Complete

---

## Current Position

Phase: 53 (user-topup-package-selection-ui) — COMPLETE
Plan: 1 of 1 complete
Milestone: v1.16 - The Revenue Pipeline - SePay Integration & User Top-Ups
Last session stopped at: Phase 53 verified and completed on 2026-04-27

---

## Completed in Phase 53

### Plan 53-01: User Top-up Package Selection UI

- `/top-up` public route created with a Suspense-wrapped client top-up flow.
- Eight fixed VND packages render in a responsive 2/4-column grid.
- 100.000 VND is selected by default; package clicks move the selected highlight.
- `Nạp tiền` calls `initSePayCheckout` with `TOPUP-${Date.now()}`, selected amount, VND currency, bank-transfer method, and payment result URLs.
- Success path renders and auto-submits the returned hidden SePay POST form.
- Error path shows an inline Vietnamese message and re-enables the button.

### Quality Gates

- Code review clean: `.planning/phases/53-user-topup-package-selection-ui/53-REVIEW.md`
- Verification passed: `.planning/phases/53-user-topup-package-selection-ui/53-VERIFICATION.md`

---

## Completed in Phase 44

### Plan 44-01: ShadCN Dependency Layer and Admin Shell CSS Foundation

- clsx, tailwind-merge, lucide-react installed in apps/web dependencies
- cn() upgraded to twMerge(clsx(inputs)) with ClassValue signature
- ShadCN initialized with Tailwind v4 detection; sidebar, dropdown-menu, separator, tooltip components added
- .admin-shell and html.dark .admin-shell CSS scopes appended to globals.css
- Public-site --muted/#6e645c and --accent/#b85c2f palette values preserved intact
- tsconfig paths alias (@/* -> ./src/*) added as ShadCN init prerequisite

### Key Decisions (Phase 44)

- ShadCN init requires tsconfig paths alias; added @/* -> ./src/* to enable component generation
- Admin shell CSS scoped under .admin-shell with --muted-admin/--accent-admin aliases to avoid public warm palette collision
- custom button.tsx preserved (shd-btn pattern); ShadCN init silently overwrote it — must be restored when using --defaults

---

## Completed in Phase 43

- VIP auto-unlock: when all chapters return `priceSource === "vip_subscription"`, `isUnlocked(true)` and `setRequiresPurchase(false)` are set so VIP users bypass the lock screen entirely.
- Wallet balance displayed on locked chapter screen; fetched via `fetchWalletSummary` only when chapter is locked and user is authenticated.
- Balance-based button disable: chapter and combo buy buttons disabled when `walletBalance < price`; Top Up Wallet link toggles to `action-primary` when balance is insufficient.
- Combo original price strikethrough: `<s>` rendered only when `originalTotalPrice > discountedTotalPrice`.
- `walletBalanceLabel` i18n key added in both vi and en copy objects.
- `fetchWalletSummary` re-exported from `reader/api.ts` to keep feature boundary clean.

---

### Plan 44-02: Admin Shell Components

- nav-items.ts with NavItem interface and three nav entries (LayoutDashboard, BookOpen, Wallet)
- admin-sidebar.tsx with collapsible icon-only mode, active state via usePathname(), and logout flow
- admin-header.tsx with sticky positioning, SidebarTrigger, page title, theme toggle, user dropdown
- admin-layout.tsx as async server component reading sidebar_state cookie

### Plan 44-03: Route Group Migration

- Root layout stripped of Header (AppProvider/html/body only)
- app/(public)/layout.tsx wraps all non-dashboard routes with Header
- app/(admin)/dashboard/layout.tsx mounts AdminLayout for dashboard routes
- All public pages moved into (public) group via git mv
- Dashboard pages moved into (admin)/dashboard group
- Import depths updated for all moved files (route group adds extra nesting level)

### Key Decisions (Phase 44)

- ShadCN init requires tsconfig paths alias; added @/* -> ./src/* to enable component generation
- Admin shell CSS scoped under .admin-shell with --muted-admin/--accent-admin aliases to avoid public warm palette collision
- Route group directories add a path segment for files but not for URLs — all import depths updated
- Deleted stale .next/types/validator.ts errors by removing .next build cache

---

## Completed in Phase 45

### Plan 45-01: resolveImageUrl Utility and Novel Thumbnail Columns

- resolveImageUrl utility created in apps/web/src/lib/image.ts
- 8-case Vitest suite covers null/undefined/empty/http/https/relative/bare/double-slash inputs
- ImageUploadField in novel-detail.tsx uses resolveImageUrl instead of inline process.env lookup
- AdminNovelsTable (/dashboard/novels) shows Anh thumbnail column using resolveImageUrl
- NovelManager (/dashboard/author) shows Anh thumbnail column using resolveImageUrl
- featuredImage: string | null added to NovelRecord type

### Key Decisions (Phase 45)

- resolveImageUrl is the single source of truth for image URL resolution across all novel surfaces
- featuredImage added to NovelRecord type — was missing from actual worktree types.ts
- novel-manager.tsx actual structure differed from plan description; thumbnail column adapted to actual file

---

## Completed in Phase 46

### Plan 46-01: Dialog Create Flow + AuthorDashboardView Redirect

- AuthorDashboardView simplified to migration notice (no longer renders split-pane NovelManager)
- /dashboard/author now redirects to /dashboard/novels
- Dialog create-novel flow added to AdminNovelsTable
- Shadcn Dialog component installed

### Plan 46-02: NovelDetail Auth Guard + Orphan Cleanup

- bootstrapAuthorDashboardSession guard added to NovelDetail (closes NOVELUI-03 gap 1)
- Guard redirects unauthenticated users to /auth/login, READER role to /dashboard
- AUTHOR/ADMIN users see novel detail after guard resolves
- Data-loading effects gated on guardState.status === "ready"
- Loading and error render panels added before novel content
- novel-manager.tsx deleted (orphaned in 46-01)
- novel-manager.dom.test.jsx and novel-manager.table.dom.test.jsx deleted (co-orphans)
- vi.mock("../components/novel-manager", ...) stripped from author-dashboard-flow test
- Zero ES imports or vi.mock references to novel-manager remain

### Key Decisions (Phase 46)

- Client-side guard required for NovelDetail because session is in localStorage (not HTTP cookies) — server-side Next.js redirect cannot read the session token
- Orphaned novel-manager.tsx and its co-orphan test files deleted rather than updated — they had no remaining test subject
- Guard pattern mirrored exactly from AuthorDashboardView to ensure consistent redirect behavior

---

## Next Steps

Phase 46 complete. All NOVELUI-03 requirements satisfied.

---

## Accumulated Context

### Roadmap Evolution

- Phase 50 added: SePay Webhook Integration for NestJS
