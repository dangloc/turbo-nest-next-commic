# Phase 25 Plan 01 Summary: Wallet Top-Up & Balance Dashboard

**Status:** Complete ✅  
**Requirements Addressed:** WAL-01, WAL-02  
**Phase:** 25-wallet-top-up-and-chapter-purchases  
**Plan:** 01 of 02  
**Wave:** 1 of 2

---

## What Was Built

Delivered end-to-end wallet top-up + balance dashboard experience by wiring backend wallet summary endpoints with frontend finance module and dashboard wallet section.

### Backend Accomplishments (Task 1)

- **Wallet Summary API** (`GET /finance/wallet/summary`):
  - Authenticated endpoint returning user's deposited/earned/total balances
  - Recent 20 transactions with normalized labels (Top-up settled, Chapter purchase, etc.)
  - Proper null handling + deterministic defaults for users without wallet rows
  
- **Finance Service Enhancements**:
  - `getWalletSummary()` fetches wallet + recent transactions in parallel
  - `toTransactionLabel()` normalizes transaction type + content into user-friendly labels
  - Safe nullable content handling with optional chaining

- **Payment Controller Updates**:
  - Preserved existing `POST /finance/payments/initiate` and `POST /finance/payments/verify` routes
  - Added new `GET /finance/wallet/summary` endpoint with RolesGuard protection
  - All 8 payment/wallet tests pass; API typechecks without errors

### Frontend Accomplishments (Task 2)

- **Finance Module** (`src/features/finance/`):
  - `types.ts`: Wallet summary, top-up request/response, verify request/response contracts
  - `api.ts`: Query wrappers wrapping `initiateTopUp`, `verifyTopUp`, `fetchWalletSummary` with Bearer auth
  - Reusable finance contracts for future purchase/unlock work

- **Dashboard Wallet Section**:
  - Three balance cards showing deposited/earned/total balances with VND currency formatting
  - Top-up initiate form: amount + provider (VNPAY/MOMO) + reference with auto-generation
  - Provider checkout link when top-up pending
  - Verify form: accept provider transaction ID + success checkbox, refresh balances on settlement
  - Recent transaction list (last 20) with label, direction, amount, and timestamp
  - Refresh button to manually reload wallet data
  - Inline status/error messages for user actions

- **Dashboard API Updates**:
  - `toCards()` updated to show wallet/purchases messaging with adjusted values  
  - Session bootstrap unchanged; preserved redirect/auth flow from phase 24

- **Styling**:
  - Responsive wallet grid (3 cols → 1 col on mobile)
  - Form cards with inputs, select, checkbox, button interactions
  - Transaction list with flex alignment and color-coded direction/amount
  - Error/message states with distinct colors

### Verification

- **Backend:** `npm test --workspace=api -- --runInBand src/finance/__tests__/payment.spec.ts` → 8/8 pass
- **Backend:** `npm run check-types --workspace=api` → no errors
- **Frontend:** `npm run lint --workspace=web` → 0 warnings
- **Frontend:** `npm run check-types --workspace=web` → no errors

---

## Commits

### API Repository
- **f32283f** — `feat(25-01): add wallet summary finance endpoint`
  - Types: `WalletSummaryItem`, `WalletSummaryResponse`, `InitiateTopUpResponse`, `VerifyTopUpResponse`
  - Service: `getWalletSummary()`, enhanced `toTransactionLabel()`
  - Controller: `GET /finance/wallet/summary`
  - Tests: 8 assertions covering wallet defaults, labeled transactions, controller passthrough

### Main Repository
- **893150a** — `feat(25-01): add dashboard wallet UI with top-up and balance history`
  - Finance types + API wrappers
  - Dashboard wallet section render with initiate/verify forms + transaction list
  - Dashboard API helpers updated with wallet/purchases messaging
  - Global styles for wallet cards, forms, transaction list, responsive breakpoints

---

## Key Wiring

| From | To | Via | Pattern |
|------|----|----|---------|
| Dashboard wallet section | `/finance/wallet/summary` | `fetchWalletSummary()` | Loads balances on section activation |
| Dashboard wallet section | `/finance/payments/initiate` | `initiateTopUp()` | Top-up amount/provider → pending state + redirect link |
| Dashboard wallet section | `/finance/payments/verify` | `verifyTopUp()` | Transaction ID + success → balance refresh |
| Finance API wrappers | Bearer auth | `getSessionToken()` | Implicit auth headers from session storage |
| Dashboard wallet refresh | wallet state | `loadWalletSummary()` | Manual/post-settlement re-fetch |

---

## User Flow

1. **Signed-in user** navigates to `/dashboard?section=wallet`
2. **Wallet loads** via `bootstrapDashboardSession()` (phase 24 pattern preserved)
3. **Balances render** from initial `fetchWalletSummary()`
4. **Top-up initiate**: Enter amount/provider → submit → receive reference + redirect URL
5. **Provider checkout**: Click link or use reference in external payment flow
6. **Verify settlement**: Enter provider transaction ID → submit → balance updates immediately
7. **Transaction history**: Auto-renders with labels, direction, amounts, timestamps

---

## Notes

- **Wallet defaults:** Users with no wallet row return 0 for all balances; no error state
- **Transaction labels:** Determined by type + content prefix; fallback to type name
- **Auth pattern:** Leverages session storage Bearer token from phase 20/24
- **Responsive:** 3-col balance grid → 1 col on mobile; form cards stack on mobile
- **Deterministic:** Provider intents auto-generate references (timestamp-based); idempotency keys ensure single settlement
- **Pending state:** Redirect link expires after 15 minutes; UI shows countdown until expiry

---

## WAL-01 & WAL-02 Coverage

✅ **WAL-01 — Wallet dashboard display** (top-up flow + balances)
- Users can see current wallet balances with clear formatting
- Users can initiate top-up via form with provider selection
- Users can verify provider settlement and refresh balances

✅ **WAL-02 — Wallet backend support** (summary + transaction history)
- Authenticated `/finance/wallet/summary` endpoint returns required payload
- Balances normalized to numbers; transactions include labels + direction
- Recent transaction history preserved with timestamps and descriptions

---

## Next: Wave 2 (Plan 25-02)

Plan 25-02 executes Phase 25 Wave 2 with chapter purchase/unlock flows:
- Reader purchase endpoint with wallet balance validation
- Unlock propagation to reader's purchased chapters list
- Dashboard purchases section showing unlock status + recent activity
- Wave 2 depends on Wave 1 wallet summary wiring (WAL-01/WAL-02 established)
