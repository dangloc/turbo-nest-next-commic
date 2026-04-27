# Phase 54: User Wallet History UI & API - Research

**Researched:** 2026-04-27
**Status:** Complete

## Current Backend Shape

- `AuthMiddleware` verifies the local session token from bearer header or `commic_session` cookie and sets `req.user = { id, role }`.
- `RolesGuard` currently doubles as an authentication/authorization gate. It throws `Authentication required` when no role is present.
- No `JwtAuthGuard` currently exists in `apps/api/src/auth`.
- Finance module already owns user wallet operations:
  - `GET /finance/wallet/summary` in `PaymentController`
  - `GET /finance/purchases/history` in `PurchaseController`
  - `GET /admin/wallets/transactions` in `AdminWalletsController`
- `FinanceService.getWalletSummary()` returns recent 20 transactions, but not a paginated full transaction ledger.
- `FinanceService.listAdminWalletTransactions()` already demonstrates pagination, deterministic ordering, Decimal-to-number mapping, and joined transaction/user projection.

## Current Data Model

Relevant Prisma fields:
- `User.balance Int`
- `User.kimTe Int`
- `User.vipLevelId Int?`
- `User.currentVipLevelId Int?`
- `User.vipLevel`
- `User.currentVipLevel`
- `Wallet.depositedBalance Decimal`
- `Wallet.earnedBalance Decimal`
- `Wallet.totalDeposited Decimal`
- `Transaction.userId`
- `Transaction.amountIn Decimal`
- `Transaction.amountOut Decimal`
- `Transaction.accumulated Decimal`
- `Transaction.type`
- `Transaction.transactionDate`
- `Transaction.gateway`
- `Transaction.referenceCode`
- `Transaction.sepayCode`
- `Transaction.content`

SePay webhook phases update `User.balance`, `User.kimTe`, `User.vipLevelId`, and insert `Transaction` rows. Existing reader purchase phases use `Wallet.depositedBalance` for spendable balance. Phase 54 should expose both the requested Kim Te fields and enough transaction ledger detail to support user-facing history.

## Current Frontend Shape

- `apps/web/src/features/finance/api.ts` already has authenticated wrappers using `getSessionToken()` and `apiRequest`.
- `apps/web/src/features/finance/types.ts` holds wallet, purchase, and SePay response types.
- `DashboardView` has a wallet section with summary cards and a recent wallet transaction list based on `/finance/wallet/summary`.
- Current checked-in routes do not include a public `/dashboard` or `/profile` page file. The request explicitly allows the route to live wherever the user account area is, and suggests `apps/web/app/(public)/profile/wallet/page.tsx`.
- Admin wallet files provide a good Shadcn table pattern:
  - `apps/web/src/features/admin-wallets/wallets-table.tsx`
  - `apps/web/src/features/admin-wallets/use-admin-wallet-transactions.ts`
  - `apps/web/src/components/ui/table.tsx`

## Recommended Implementation Strategy

1. Add a dedicated user wallet transactions endpoint rather than expanding `/finance/wallet/summary`.
2. Add a repo-local `JwtAuthGuard` that validates `req.user.id` from the existing middleware, satisfying the phase requirement without changing auth architecture.
3. Keep backend pagination simple: page defaults to 1, pageSize defaults to 20, max pageSize 50.
4. Return a signed `amount` field so the frontend does not duplicate debit/credit logic.
5. Build a new `wallet-history` frontend feature module rather than further enlarging `DashboardView`.
6. Use `/profile/wallet` as the route entry point, with a client component and data hook.

## Pitfalls

- Do not trust a `userId` query parameter for user wallet history.
- Do not expose `Transaction.rawBody`.
- Do not replace existing `WalletSummaryResponse`; multiple reader flows already consume it.
- Do not rely only on `Wallet.depositedBalance` for the requested Kim Te balance; the SePay integration specifically updates `User.kimTe`.
- Do not add broad date/search filtering in this phase; it increases query and UI scope beyond the request.

## Verification Strategy

Backend:
- Unit test guard denial when `req.user` is absent.
- Unit test controller delegates with `req.user.id`, not request query/body user id.
- Unit test service query uses `where: { userId }`.
- Unit test pagination bounds.
- Unit test summary and row mapping.

Frontend:
- Mock wallet history API and assert summary cards.
- Assert rows render date, signed amount, type/status, and description/SePay code.
- Assert empty, loading, and error states.
- Assert pagination invokes the hook/API for the next page.

## Research Complete
