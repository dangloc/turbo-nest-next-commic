---
phase: 37-wallet-and-purchase-history-dashboard
plan: 01
status: completed
requirements: [ACCOUNT-02]
---

## Objective
Completed ACCOUNT-02 by extending account dashboard with wallet VIP visibility and paginated purchased-chapter history backed by finance APIs.

## What Was Built
- Added finance backend contracts for account wallet/purchase history:
  - Extended `WalletSummaryResponse` with `vipTier` projection.
  - Added paginated purchase history contracts and endpoint query types.
- Implemented backend purchase-history API:
  - New `listPurchaseHistory` service method in `apps/api/src/finance/finance.service.ts`.
  - New `GET /finance/purchases/history` route in `apps/api/src/finance/purchase.controller.ts`.
  - Wallet summary now resolves `User.currentVipLevel` and returns typed `vipTier` metadata.
- Added/updated backend tests:
  - Updated `apps/api/src/finance/__tests__/payment.spec.ts` for wallet `vipTier` shape.
  - Updated `apps/api/src/finance/__tests__/purchase.spec.ts` for controller pagination pass-through.
  - Added `apps/api/src/finance/__tests__/purchase-history.spec.ts` for metadata, unlock status, and pagination.
- Extended web finance contracts and API wrappers:
  - Added `WalletVipTier`, `PurchaseHistoryItem`, and `PurchaseHistoryResponse` in `apps/web/src/features/finance/types.ts`.
  - Added `fetchPurchaseHistory(page, pageSize, token, signal)` in `apps/web/src/features/finance/api.ts`.
- Upgraded dashboard purchases/wallet UI:
  - Wallet section shows current VIP tier card and threshold metadata.
  - Purchases section now renders purchased chapter history table with:
    - chapter title
    - novel title
    - author display name
    - purchase date
    - price paid
    - unlock status
    - reader deep-link for unlocked chapters
  - Added previous/next pagination controls for large histories.
- Added frontend DOM coverage:
  - `apps/web/src/features/dashboard/__tests__/dashboard-wallet-history.dom.test.jsx`.
- Added CSS styling hooks for VIP card and purchase-history table/pagination in `apps/web/app/globals.css`.

## Verification
- Backend verification passed:
  - `npm test --workspace=api -- --runInBand src/finance/__tests__/payment.spec.ts src/finance/__tests__/purchase.spec.ts src/finance/__tests__/purchase-history.spec.ts`
  - `npm run check-types --workspace=api`
- Frontend verification passed:
  - `cd apps/web && npx vitest run src/features/dashboard/__tests__/dashboard-wallet-history.dom.test.jsx`
  - `cd apps/web && npm run check-types`
- Scoped eslint command on target web files reported warnings only (no errors).

## Result
ACCOUNT-02 acceptance is satisfied: users can view wallet balances with VIP tier metadata and browse paginated purchased chapter history with reader-access-aware status in dashboard.
