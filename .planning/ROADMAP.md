# Roadmap: WordPress to NestJS Migration v1.7

Milestone: v1.7 - Financial Engine & Payment Integration
Created: 2026-04-08
Status: active

## Phases

### Phase 18: Deposit & Purchase APIs

Goal: Build secure deposit initiation/verification flows and wallet-backed content purchase APIs.

Requirements: PAY-01, PAY-02, WAL-01, WAL-02, PUR-01, PUR-02

Scope:
- Payment gateway intent and verification endpoints (VNPay/MoMo-ready).
- Wallet top-up settlement with immutable transaction logging.
- Chapter purchase flow with wallet deduction and purchased access grant.

Success Criteria:
- Top-up intents and verification callbacks process safely and idempotently.
- Verified deposits update wallet balances and totalDeposited correctly.
- Purchase endpoint blocks duplicates/insufficient funds and grants access atomically.

### Phase 19: Author Withdrawals & Revenue Share

Goal: Implement purchase revenue distribution and withdrawal operations for authors and admins.

Requirements: REV-01, WDR-01, WDR-02, WDR-03

Scope:
- 95/5 revenue split application on purchases.
- Author withdrawal request submission with balance freezing.
- Admin review, approve, and reject endpoints with audit-safe balance transitions.

Success Criteria:
- Revenue split updates author/platform balances deterministically per purchase.
- Authors can submit valid withdrawal requests without overspending earnedBalance.
- Admin workflows resolve requests with consistent status and ledger updates.

## Dependency Graph

Phase 18 (Deposit & Purchase APIs)
  ->
Phase 19 (Author Withdrawals & Revenue Share)

## Progress

| Phase | Requirements | Status | Planned |
|-------|--------------|--------|---------|
| 18 | PAY-01..PUR-02 | Planned | 1-2 plans |
| 19 | REV-01..WDR-03 | Planned | 1-2 plans |

---

Plans:
- [ ] 18-01-PLAN.md — payment intent/verification, wallet top-up settlement, chapter purchase flow

Next: /gsd:execute-phase 18
