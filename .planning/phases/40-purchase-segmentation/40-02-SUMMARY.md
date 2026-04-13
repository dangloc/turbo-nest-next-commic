---
phase: 40-purchase-segmentation
plan: "02"
subsystem: web
tags: [nextjs, react, finance, purchase-history, combo-history, dashboard]

requires:
  - phase: 40-purchase-segmentation
    plan: "01"
    provides: "GET /finance/purchases/history/combo backend endpoint"

provides:
  - "ComboPurchaseHistoryItem and ComboPurchaseHistoryResponse client-side types in finance/types.ts"
  - "fetchComboPurchaseHistory fetcher in finance/api.ts targeting /finance/purchases/history/combo"
  - "Separate comboPurchaseHistoryState bucket in DashboardView with independent load/refresh"
  - "Two-table purchases section: Purchased chapter history and Combo purchase history"
  - "DOM test coverage for both purchase streams in dashboard-wallet-history.dom.test.jsx"

affects: [purchase-segmentation, finance-dashboard, admin-monitoring]

tech-stack:
  added: []
  patterns:
    - "Parallel data fetching: loadPurchaseHistory + loadComboPurchaseHistory both triggered on section activation"
    - "Independent refresh buttons per history stream"
    - "Chapter rows table rendered from buildPurchasePricingModel.chapterRows for per-chapter override visibility"

key-files:
  created: []
  modified:
    - apps/web/src/features/finance/types.ts
    - apps/web/src/features/finance/api.ts
    - apps/web/src/features/dashboard/dashboard.tsx
    - apps/web/src/features/dashboard/__tests__/dashboard-wallet-history.dom.test.jsx
    - apps/web/src/features/dashboard/__tests__/dashboard-view.dom.test.jsx
    - apps/web/package.json

key-decisions:
  - "Combo history fetches page 1 with pageSize 20 by default — no pagination added since combo purchases are low-volume"
  - "Chapter pricing rows table renders only when chapters array is non-empty — pricing summary remains clean for novels without chapter overrides"
  - "Per-chapter override sourceLabel fix was auto-applied as Rule 1 (pre-existing bug: DOM test expected the label but dashboard never rendered chapter rows)"

requirements-completed:
  - MONITOR-02

duration: 8min
completed: 2026-04-13
---

# Phase 40 Plan 02: Frontend Purchase-History Segmentation Summary

**Two-table dashboard purchases section — individual chapter history and combo purchase history rendered as independent streams with separate refresh controls**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-13T21:40:00Z
- **Completed:** 2026-04-13T21:48:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `ComboPurchaseHistoryItem` and `ComboPurchaseHistoryResponse` types to `apps/web/src/features/finance/types.ts`
- Added `fetchComboPurchaseHistory` fetcher targeting `GET /finance/purchases/history/combo` with safe pagination defaults
- Added `comboPurchaseHistoryState` bucket to `DashboardView` — separate from `purchaseHistoryState`
- Updated `purchases` section `useEffect` to trigger both `loadPurchaseHistory` and `loadComboPurchaseHistory` in parallel on section activation
- Split `renderPurchasesSection` into two labeled articles: "Purchased chapter history" (paginated) and "Combo purchase history" (flat list)
- Added chapter-level pricing rows table to the pricing summary for per-chapter override visibility
- Updated `dashboard-wallet-history.dom.test.jsx`: added `fetchComboPurchaseHistory` mock, 3 new tests covering combo history rendering, dual-stream independence, and refresh isolation
- Updated `dashboard-view.dom.test.jsx`: added `fetchPurchaseHistory` + `fetchComboPurchaseHistory` + `changePassword` mocks to fix test isolation
- Updated `test:dashboard-dom` script to include wallet-history test file
- All 13 tests pass: 4 purchase-ui + 9 DOM (3 dashboard-view, 6 wallet-history)

## Task Commits

1. **Task 1 - Types, fetcher, and dashboard state** - `4a87d05` (feat)
2. **Task 2 - Render split tables and DOM tests** - `c98bf21` (feat)

## Files Created/Modified

- `apps/web/src/features/finance/types.ts` — Added `ComboPurchaseHistoryItem` and `ComboPurchaseHistoryResponse` interfaces
- `apps/web/src/features/finance/api.ts` — Added `fetchComboPurchaseHistory` function and type re-export
- `apps/web/src/features/dashboard/dashboard.tsx` — Added `comboPurchaseHistoryState`, `loadComboPurchaseHistory`, parallel section loading, combo history table, chapter pricing rows table
- `apps/web/src/features/dashboard/__tests__/dashboard-wallet-history.dom.test.jsx` — Added `fetchComboPurchaseHistory` mock, combo fixture in beforeEach, 3 new combo stream tests
- `apps/web/src/features/dashboard/__tests__/dashboard-view.dom.test.jsx` — Added missing mocks for `fetchPurchaseHistory`, `fetchComboPurchaseHistory`, `changePassword`
- `apps/web/package.json` — Updated `test:dashboard-dom` to include wallet-history test file

## Decisions Made

- Combo history fetch uses page 1 / pageSize 20 fixed defaults — combo purchases are low-volume events and pagination adds complexity without current benefit
- Chapter pricing rows table only renders when `pricingDisplay.chapterRows.length > 0` — keeps the pricing card clean for standard novels
- Both purchase history tables show independently refreshable via separate "Refresh" buttons — admins can reload either stream without affecting the other

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing DOM test failure: "Per-chapter override" not in DOM**
- **Found during:** Task 2 (running test:dashboard-dom baseline)
- **Issue:** `dashboard-view.dom.test.jsx` expected `Per-chapter override` text from `buildPurchasePricingModel.chapterRows` but the dashboard never rendered chapter rows in the pricing summary — `chapterRows` was computed but unused in the render
- **Fix:** Added chapter rows table inside the pricing summary block, conditionally rendered when `chapterRows.length > 0`
- **Files modified:** `apps/web/src/features/dashboard/dashboard.tsx`
- **Commit:** `c98bf21`

**2. [Rule 1 - Bug] Test isolation issue: `changePassword` not mocked in dashboard-view.dom.test.jsx**
- **Found during:** Task 2 test file update
- **Issue:** `profile/api` mock was missing `changePassword` — could cause TypeScript/mock resolution errors in some test execution orders
- **Fix:** Added `changePassword: vi.fn()` to profile/api mock
- **Files modified:** `apps/web/src/features/dashboard/__tests__/dashboard-view.dom.test.jsx`
- **Commit:** `c98bf21`

## Known Stubs

None — both history tables are wired to real API responses via their respective fetchers.

## Self-Check: PASSED

- `4a87d05` confirmed in git log
- `c98bf21` confirmed in git log
- All 13 tests pass: `npm run test:dashboard --workspace=web` — 4 purchase-ui + 9 DOM
- `ComboPurchaseHistoryItem` and `fetchComboPurchaseHistory` exist in their respective files
- `comboPurchaseHistoryState` and `loadComboPurchaseHistory` present in dashboard.tsx
- "Combo purchase history" and "Purchased chapter history" rendered as separate articles
