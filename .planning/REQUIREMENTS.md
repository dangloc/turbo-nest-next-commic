# Requirements: v1.7 Financial Engine & Payment Integration

Milestone: v1.7
Defined: 2026-04-08
Core Value: Deliver secure, auditable payment and wallet APIs for deposits, purchases, withdrawals, and platform revenue sharing.

## v1.7 Requirements

### Deposit & Purchase APIs (Phase 18)

- [ ] PAY-01: Create endpoint to initiate external top-up payment intents with gateway-ready metadata (provider, amount, reference, return/callback URLs).
- [ ] PAY-02: Create payment verification endpoint that validates gateway callbacks and enforces idempotent processing per provider transaction reference.
- [ ] WAL-01: On verified top-up, increment `wallet.depositedBalance` and `wallet.totalDeposited`, and append an immutable `Transaction` audit row.
- [ ] WAL-02: Trigger VIP tier upgrade evaluation after successful top-up based on `totalDeposited` thresholds in `VipLevel`.
- [ ] PUR-01: Create purchase API for chapter access that deducts from `wallet.depositedBalance`, records purchase in `purchased_chapters`, and logs a transaction.
- [ ] PUR-02: Purchase flow enforces insufficient-funds and duplicate-purchase safety under concurrent requests.

### Author Withdrawals & Revenue Share (Phase 19)

- [ ] REV-01: On chapter purchase, apply 95/5 split (95% author earnings, 5% platform fee) using auditable wallet/ledger updates.
- [ ] WDR-01: Authenticated author endpoint to submit `WithdrawalRequest` and freeze requested `earnedBalance` amount.
- [ ] WDR-02: Admin APIs to list pending/processed withdrawal requests with filters and payout context.
- [ ] WDR-03: Admin approve/reject workflows update balances, request status, and transaction audit trails deterministically.

## Traceability

| Requirement | Category | Phase | Status |
|-------------|----------|-------|--------|
| PAY-01 | Payments | 18 | Planned |
| PAY-02 | Payments | 18 | Planned |
| WAL-01 | Wallet | 18 | Planned |
| WAL-02 | Wallet/VIP | 18 | Planned |
| PUR-01 | Purchase | 18 | Planned |
| PUR-02 | Purchase | 18 | Planned |
| REV-01 | Revenue Split | 19 | Planned |
| WDR-01 | Withdrawals | 19 | Planned |
| WDR-02 | Withdrawals | 19 | Planned |
| WDR-03 | Withdrawals | 19 | Planned |

---

v1.7 requirements baseline created.
