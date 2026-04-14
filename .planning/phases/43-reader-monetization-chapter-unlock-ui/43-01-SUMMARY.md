---
phase: 43-reader-monetization-chapter-unlock-ui
plan: "01"
subsystem: reader
tags: [reader, monetization, vip, wallet, purchase-ui]
dependency_graph:
  requires: []
  provides: [reader-vip-bypass, reader-wallet-balance-display, reader-button-disable, reader-combo-strikethrough]
  affects: [apps/web/src/features/reader/reader.tsx, apps/web/src/features/reader/api.ts]
tech_stack:
  added: []
  patterns: [react-state-derivation, conditional-disable, i18n-key-addition]
key_files:
  modified:
    - apps/web/src/features/reader/reader.tsx
    - apps/web/src/features/reader/api.ts
decisions:
  - "Read walletBalance from depositedBalance (not totalDeposited or earnedBalance) — deposited balance is the spendable balance used for purchases"
  - "Fetch wallet only when chapterIsLocked && !isVip — avoids unnecessary API call for VIP users and unlocked chapters"
  - "balanceInsufficientForChapter/Combo derived before return() — allows reuse in Top Up link class without duplication inside JSX conditional"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-14"
  tasks_completed: 3
  files_modified: 2
requirements:
  - READERMONO-01
  - READERMONO-02
  - READERMONO-03
  - READERMONO-04
---

# Phase 43 Plan 01: Reader Monetization UI Gaps Summary

**One-liner:** Closed four reader UI gaps — VIP subscription auto-bypass of lock screen, wallet `depositedBalance` display on locked chapter box, purchase button disable when balance < price, and combo original price `<s>` strikethrough when discount exists.

## What Was Built

### Task 1: Re-export fetchWalletSummary from reader/api.ts

Added `fetchWalletSummary` and `type WalletSummaryResponse` to the import from `../finance/api` in `reader/api.ts`, then exported both from the reader feature boundary so `reader.tsx` does not reach across feature directories.

### Task 2: VIP auto-unlock, wallet state, and pricing effect

- Added `comboOriginalPrice` and `walletBalance` state (both `number | null`) in `ChapterReaderView`
- Added `walletBalanceLabel` i18n key to both `vi` ("Số dư ví") and `en` ("Wallet balance") in `getChapterCopy()`
- Both new states reset to `null` inside the chapter-change `useEffect` reset block
- Replaced the original `setVipAccessMode(...)` call with an `isVip` const; when `isVip` is true, calls `setIsUnlocked(true)` and `setRequiresPurchase(false)` immediately
- Stored `pricingResult.data.combo.originalTotalPrice` in `comboOriginalPrice` state
- After pricing resolves, fetches wallet summary only when `chapterIsLocked && !isVip`; sets `walletBalance` from `depositedBalance`

### Task 3: Locked box render updates

- Wallet balance row rendered when `walletBalance !== null`
- Combo price paragraph shows `<s>originalPrice</s>` only when `comboOriginalPrice > comboPrice`
- Chapter buy button: `disabled={purchaseBusy || balanceInsufficientForChapter}`
- Combo buy button: `disabled={purchaseBusy || balanceInsufficientForCombo}`
- Top Up Wallet link: `action-primary` when either balance check is insufficient, `action-secondary` otherwise

## Commits

| Hash | Message |
|------|---------|
| `8622961` | feat(43): reader monetization UI gaps — wallet balance, VIP bypass, button disable, combo strikethrough |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired to real API calls.

## Self-Check: PASSED

- `apps/web/src/features/reader/reader.tsx` — modified and committed
- `apps/web/src/features/reader/api.ts` — modified and committed
- Commit `8622961` exists in git log
- `npx tsc --noEmit -p apps/web/tsconfig.json` — zero errors in reader files
