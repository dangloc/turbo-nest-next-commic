---
phase: 54-user-wallet-history-ui-api
plan: 01
subsystem: api
tags: [nestjs, auth, prisma, wallet, transactions]
requires:
  - phase: 53-user-topup-package-selection-ui
    provides: user top-up flow context and SePay wallet semantics
provides:
  - AuthMiddleware-compatible JwtAuthGuard for authenticated finance routes
  - Protected GET /finance/wallet/transactions endpoint
  - Self-scoped Prisma wallet transaction pagination
  - User wallet history response contracts
  - Focused backend tests for guard, service, controller, pagination, and mapping
affects: [phase-54-frontend-wallet-history, finance-api, wallet-history]
tech-stack:
  added: []
  patterns:
    - lightweight NestJS guard over AuthMiddleware-populated req.user
    - explicit Prisma select projection for sensitive financial rows
key-files:
  created:
    - apps/api/src/auth/guards/jwt-auth.guard.ts
    - apps/api/src/finance/user-wallet.controller.ts
    - apps/api/src/finance/__tests__/user-wallet-transactions.spec.ts
  modified:
    - apps/api/src/auth/index.ts
    - apps/api/src/finance/types.ts
    - apps/api/src/finance/finance.service.ts
    - apps/api/src/finance/finance.module.ts
key-decisions:
  - "Implemented JwtAuthGuard as a req.user.id guard compatible with the existing session-token AuthMiddleware instead of adding Passport JWT dependencies."
  - "Derived wallet history user scope only from req.user.id; no userId query/body input is accepted."
  - "Capped user wallet transaction pageSize at 50 and used explicit transaction field projection to avoid rawBody exposure."
patterns-established:
  - "User finance routes can use JwtAuthGuard when they require authentication but not role-specific authorization."
  - "Wallet transaction history rows expose signed amount plus raw amountIn/amountOut for frontend display flexibility."
requirements-completed:
  - PHASE-54-AUTH-WALLET-API
  - PHASE-54-SELF-ONLY-ACCESS
  - PHASE-54-TRANSACTION-PAGINATION
  - PHASE-54-WALLET-SUMMARY
duration: 19min
completed: 2026-04-27
---

# Phase 54 Plan 01: User Wallet History API Summary

**Authenticated NestJS wallet history API with self-scoped Prisma pagination, summary payload, and signed transaction row mapping**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-27T07:16:00+07:00
- **Completed:** 2026-04-27T07:35:13+07:00
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- Added `JwtAuthGuard` requiring an AuthMiddleware-populated positive `req.user.id`.
- Added exported wallet transaction query/response contracts with summary, pagination, SePay/reference fields, signed amount, and balance-after fields.
- Implemented `FinanceService.listUserWalletTransactions` with `where: { userId }`, explicit safe field projection, newest-first ordering, max pageSize 50, user summary, and `NotFoundException` for missing users.
- Added `UserWalletController` at `GET /finance/wallet/transactions` and registered it in `FinanceModule`.
- Added focused Jest coverage for auth, contracts, self-only Prisma filters, pagination bounds, mapping behavior, controller metadata, and query parsing.

## Task Commits

1. **Task 1: Add JwtAuthGuard for authenticated user-only finance routes** - `472060d`
2. **Task 2: Define user wallet transaction API contracts** - `334ed7c`
3. **Task 3: Implement FinanceService.listUserWalletTransactions** - `e71770b`
4. **Task 4: Expose GET /finance/wallet/transactions** - `8381e93`

## Files Created/Modified

- `apps/api/src/auth/guards/jwt-auth.guard.ts` - Auth guard requiring positive `req.user.id`.
- `apps/api/src/auth/index.ts` - Exports `JwtAuthGuard`.
- `apps/api/src/finance/types.ts` - Adds user wallet history query/summary/row/response contracts.
- `apps/api/src/finance/finance.service.ts` - Adds `listUserWalletTransactions`.
- `apps/api/src/finance/user-wallet.controller.ts` - Adds protected wallet transaction route.
- `apps/api/src/finance/finance.module.ts` - Registers `UserWalletController`.
- `apps/api/src/finance/__tests__/user-wallet-transactions.spec.ts` - Focused guard, service, contract, and controller coverage.

## Decisions Made

- Used the existing session-token auth model by checking `req.user.id`; no Passport JWT dependency was added.
- Kept the endpoint self-only by accepting only `page` and `pageSize` query params and passing only `req.user.id` to the service.
- Exposed persisted transaction rows as `status: "COMPLETED"` because there is no transaction status column in the current Prisma model.

## Deviations from Plan

None - plan executed as specified.

## Known Stubs

None.

## Threat Flags

None beyond the plan threat model. Mitigations were implemented for auth, self-only access, safe projection, page-size clamping, and numeric-only query normalization.

## Verification

- `npm --prefix apps/api run test -- --runTestsByPath src/finance/__tests__/user-wallet-transactions.spec.ts --runInBand` - passed, 11 tests.
- `npm --prefix apps/api run check-types` - passed.
- `npm --prefix apps/api run build` - passed.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/54-user-wallet-history-ui-api/54-01-SUMMARY.md`.
- Task commits found: `472060d`, `334ed7c`, `e71770b`, `8381e93`.
- No task-specific files remained dirty after the API commits.

## Issues Encountered

The API repository already had many unrelated dirty/untracked files. Only task-specific files were staged for the four implementation commits; unrelated changes were preserved.

## User Setup Required

None.

## Next Phase Readiness

The frontend wallet page can now call `GET /finance/wallet/transactions` for authenticated users and render `summary`, `items`, and pagination metadata directly.

---
*Phase: 54-user-wallet-history-ui-api*
*Completed: 2026-04-27*
