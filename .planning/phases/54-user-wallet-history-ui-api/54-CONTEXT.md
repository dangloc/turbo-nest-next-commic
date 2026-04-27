# Phase 54: User Wallet History UI & API - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning
**Source:** User-provided plan-phase request plus live codebase analysis

<domain>
## Phase Boundary

Build an authenticated user wallet history experience across backend and frontend:
- Backend API for the logged-in user's own wallet transaction ledger.
- Frontend wallet history page in the public account/profile area.
- Summary display for current Kim Te balance and VIP status.
- Paginated transaction list with loading, empty, and error states.

Out of scope:
- Admin wallet dashboard changes beyond reusing patterns.
- Payment settlement or SePay webhook behavior changes.
- Prisma schema changes unless implementation discovers an unavoidable type gap.
</domain>

<decisions>
## Implementation Decisions

### API Route
- Use `GET /finance/wallet/transactions` as the protected endpoint. This keeps wallet history inside the existing finance module and complements `GET /finance/wallet/summary`.
- The endpoint must not accept a `userId` query param. It must derive the user id only from the authenticated request.
- Response must include summary data plus paginated transaction rows.

### Authentication
- The user requested `JwtAuthGuard`, but the current app has no `JwtAuthGuard`. It uses `AuthMiddleware` to verify the session token and set `req.user`, then `RolesGuard` enforces role metadata.
- Create a lightweight `JwtAuthGuard` in `apps/api/src/auth/guards/jwt-auth.guard.ts` that requires `req.user.id` to be present after `AuthMiddleware`.
- Do not add Passport JWT dependencies or replace the existing session-token mechanism.

### Wallet Semantics
- Use `User.balance`, `User.kimTe`, `User.vipLevelId`, and `User.vipLevel` for the SePay/Kim Te summary requested by this phase.
- Preserve existing `WalletSummaryResponse` and `/finance/wallet/summary` behavior; this phase adds a paginated ledger endpoint instead of changing the summary endpoint's existing shape.
- Because `Transaction` has no persisted status column, expose `status: "COMPLETED"` for persisted ledger rows.

### Frontend Route
- The current checked-in app has no dedicated public `/profile` route. The older account hub lives in `DashboardView` with query sections, but no public `/dashboard` route file is present in the current tree.
- Create `apps/web/app/(public)/profile/wallet/page.tsx` as the explicit user wallet history route requested by the user.
- Add a discoverability link from the existing dashboard wallet section only if the executor confirms `DashboardView` is still reachable in the runtime route set.

### UI
- Reuse local Shadcn-style primitives already present in the repo (`Table`, `Button`, `Badge` if available); do not install new packages.
- On desktop, render a table with transaction date, amount, type/status, and description/SePay code.
- On mobile, preserve readability through the existing table overflow wrapper or a responsive list if the executor finds table density poor.
- Amounts should be formatted as signed Kim Te values, for example `+50.000 Kim Tệ` for credits and `-10.000 Kim Tệ` for debits.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend Finance/Auth
- `apps/api/src/auth/auth.middleware.ts` - session token verification and `req.user` population.
- `apps/api/src/auth/guards/roles.guard.ts` - current guard style and unauthorized behavior.
- `apps/api/src/finance/payment.controller.ts` - existing authenticated finance wallet route.
- `apps/api/src/finance/finance.service.ts` - wallet summary, purchase history, admin wallet query patterns.
- `apps/api/src/finance/types.ts` - finance API contract definitions.
- `apps/api/prisma/schema.prisma` - `User`, `Wallet`, `Transaction`, `VipLevel`, and `TransactionType` fields.

### Frontend Account/Finance
- `apps/web/src/features/finance/api.ts` - authenticated API wrapper pattern.
- `apps/web/src/features/finance/types.ts` - wallet and purchase response contracts.
- `apps/web/src/features/dashboard/dashboard.tsx` - existing wallet/account UI patterns and formatting helpers.
- `apps/web/src/features/admin-wallets/wallets-table.tsx` - Shadcn table usage for wallet transactions.
- `apps/web/app/(public)/top-up/page.tsx` - public route group import pattern.
- `apps/web/src/lib/api/http.ts` - shared `apiRequest` behavior.
- `apps/web/src/lib/auth/session-store.ts` - client session token lookup.

### Prior Planning
- `.planning/phases/37-wallet-and-purchase-history-dashboard/37-01-PLAN.md` - existing user wallet summary and purchase history dashboard phase.
- `.planning/phases/51-admin-wallet-dashboard-live-data-integration/51-01-PLAN.md` - admin transaction pagination API pattern.
- `.planning/phases/51-admin-wallet-dashboard-live-data-integration/51-02-PLAN.md` - admin transaction table pattern.
- `.planning/phases/53-user-topup-package-selection-ui/53-01-SUMMARY.md` - recent top-up flow and SePay checkout context.
</canonical_refs>

<specifics>
## Specific Ideas

- Backend should return:
  - `summary.balance`
  - `summary.kimTe`
  - `summary.vipLevelId`
  - `summary.vipLevelName`
  - `items[]`
  - `page`, `pageSize`, `total`, `totalPages`
- Transaction row should include:
  - transaction date
  - signed amount
  - amountIn and amountOut
  - transaction type
  - status
  - description/content
  - SePay code/reference/gateway when present
  - balance after transaction (`accumulated`)
- Frontend should show:
  - summary cards for Kim Te balance and VIP status
  - transaction history table/list
  - loading, empty, error, and pagination states
</specifics>

<deferred>
## Deferred Ideas

- Full transaction filtering/search by type or date range.
- Export CSV/PDF.
- Real-time wallet refresh or polling.
- Merging `/profile/wallet` into a broader profile/account route system.
</deferred>

---

*Phase: 54-user-wallet-history-ui-api*
*Context gathered: 2026-04-27*
