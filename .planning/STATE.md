# GSD Workflow State

**Current Phase:** 25-wallet-top-up-and-chapter-purchases  
**Current Milestone:** 6 (Monetization MVP)  
**Status:** Executing Wave 2 of Phase 25

---

## Progress

### Completed Phases
- Phase 01: Project setup & core auth (Completed)
- Phase 02: Discovery/reader flow (Completed)
- Phase 03: Verification (Completed)
- Phase 04-16: Infrastructure & platform (Completed)
- Phase 17: Social features (Completed)
- Phase 18: Deposit/purchase APIs (Completed)
- Phase 19: Author withdrawals (Completed)
- Phase 20: Frontend auth integration (Completed)
- Phase 21-23: Reader/author flows (Completed)
- Phase 24: Dashboard foundation (Completed)

### Active Phase: Phase 25 (Monetization MVP)

**Wave 1 ✅ COMPLETE**
- Plan 25-01: Wallet top-up + balance dashboard
  - Task 1: Backend wallet summary API (DONE)
  - Task 2: Dashboard wallet UI with forms & history (DONE)
  - Commits: f32283f (API), 893150a (Web), 108e68c (Docs)

**Wave 2 IN PROGRESS**
- Plan 25-02: Chapter purchases & reader unlock
  - Task 1: Reader purchase endpoint + unlock propagation (pending)
  - Task 2: Dashboard purchases section UI (pending)

---

## Decisions

From Phase 25 planning (gsd:discuss-phase):

### Locked (Must Implement)
- **D-01:** Wallet summary shows deposited/earned/total balances
- **D-02:** Top-up flow: initiate → verify provider → settle & refresh balance
- **D-03:** Transaction list displays with normalized status labels
- **D-04:** Dashboard wallet is default section (homepage link from phase 24)
- **D-05:** Reader purchase immediately unlocks chapter (no approval flow)
- **D-06:** Purchase deducts from deposited balance only (not earned)
- **D-07:** Dashboard purchases section shows unlock status per novel

### Deferred (Phase 25 Wave 2 and beyond)
- Profile/settings section (Phase 26)
- Notification center (Phase 27)
- Payment webhook receivers (future integration phase)
- Withdrawal approval UI (author-only, phase 19+)

### Claude's Discretion (Chosen Approaches)
- Wallet reference generation: `topup-{timestamp}` auto-generation when empty
- Transaction labeling: Content prefix matching (TOPUP:, PURCHASE_BUYER:, etc.)
- Currency formatting: Vietnamese locale (vi-VN) with VND symbol, no decimals
- Verify form design: Checkbox for success flag (mockable provider responses)

---

## Requirements Status

### Phase 25 Requirements

- **WAL-01 ✅** Wallet dashboard display (top-up flow + balances)
  - Wave 1 Plan 25-01 implemented
  - User can see current balances with clear formatting
  - User can initiate top-up via form with provider selection
  - User can verify settlement and refresh balances
  - Status: Complete

- **WAL-02 ✅** Wallet backend support (summary + transaction history)
  - Wave 1 Plan 25-01 implemented
  - `GET /finance/wallet/summary` endpoint returns correct payload
  - Normalized balances + labeled transactions with timestamps
  - Status: Complete

- **PUR-01 ⏳** Reader chapter purchase (pending)
  - Wave 2 Plan 25-02 in progress
  - Requires: `/reader/novels/{novelId}/chapters/{chapterId}/purchase` endpoint
  - Wallet deduction + unlock record creation + VIP rate calculation
  - Status: Planning → Execution

- **PUR-02 ⏳** Purchase visibility in dashboard (pending)
  - Wave 2 Plan 25-02 in progress
  - Shows reader's purchased chapters by novel with unlock dates
  - Status: Planning → Execution

---

## Known Blockers

None currently. Wave 1 completed cleanly.

---

## Next Steps

1. Load and execute Phase 25 Wave 2 Plan (25-02)
   - Reader purchase endpoint + unlock propagation
   - Dashboard purchases section UI
   - Verify + commit per-task

2. Generate Phase 25 completion summary & update milestone tracker

3. Proceed to Phase 26 (if planned) or handle any backlog items

---

## Notes

- Both API and Web repos have been updated with atomic commits
- All tests passing for Wave 1: 8/8 finance payment tests, 0 lint warnings
- TypeScript checking clean on both API and Web workspaces
- Phase 25 Wave 1 establishes finance contracts for Wave 2 purchase/unlock work
