# Retrospective: GSD Workflow Reflection

---

## Milestone: v1.9 — Full Reader Productization

**Shipped:** 2026-04-09  
**Phases:** 3 (Dashboard Foundation, Wallet Top-Up & Chapter Purchases, Profile Management)  
**Plans:** 4 (1 + 2 + 1)  
**Timeline:** ~2 days (2026-04-08 to 2026-04-09)

### What Was Built

- Dashboard shell with session guards, unified section navigation, and account-centric module structure.
- Wallet top-up flow with VNPAY/MOMO provider integration and payment verification UX.
- Chapter purchase flow with clear confirmation, insufficient-balance error handling, and immediate unlock.
- Profile management dashboard with account identity visibility and update contracts.
- Purchases section showing transaction history and spending summary.
- Transaction history display in wallet section.

### What Worked

1. **Feature-local module pattern (types/api/view split)** established in phases 24-26 reduced friction across feature work. Consistent with existing discovery/reader/social modules.
2. **Session-first architecture** (AppContext + token storage + fetchSession fallback) enabled multi-phase dashboard work without auth regressions.
3. **Dashboard section routing via ?section={id}** proved stable and enabled parallel section development before dedicated child routes needed.
4. **Deterministic purchase status mapping** (including explicit insufficient_balance) prevented silent failures and clarified error UX paths.
5. **Immediate post-purchase refresh** (no page reload) proved session/context sync works end-to-end.

### What Was Inefficient

1. **Phase 27 (Notifications) deferred to v1.10** → The original roadmap included it in v1.9 but was scoped out. Better to have clarified scope earlier.
2. **Dashboard card numbering** — Initial summary card design required small tweaks after first phase; could have been tighter upfront.

### Patterns Established

- Dashboard section routing via query params (generalizable pattern for multi-section hubs).
- Feature import/export wiring for auth-required endpoints (Bearer token + session sync).
- VND currency formatting in wallet section (reusable for future payment surfaces).
- Transaction label normalization at API layer (supports consistent ledger displays across frontend).

### Key Lessons

1. **Scope clarity matters.** Phase 27 should have been deferred in the original roadmap, not during execution.
2. **Session sync is powerful.** AppContext updates on profile/wallet changes eliminate "is this my latest data?" friction.
3. **Deterministic error paths reduce support load.** Explicit insufficient_balance mapping beats generic errors.
4. **Dashboard as a hub works well.** Section routing scales better than separate pages.

### Cost Observations

- Model mix: Sonnet for plan/execute (high reliability needed).
- Sessions: 1 main session (plan + execute-26 + execute-25-wave2 + complete-milestone).
- Efficiency: ~8h elapsed across GSD workflow phases for 3 full phases (dashboard, wallet, profile) + 1 bonus phase (purchases section).

---

## Cross-Milestone Trends

| Trend | v1.6 | v1.7 | v1.8 | v1.9 |
|-------|------|------|------|------|
| **Avg Phase Duration** | 2h | 3h | 1.5h | <1h |
| **Phases per Milestone** | 2 | 2 | 4 | 3 |
| **Plans per Phase** | 1 | 1.5 | 1.25 | 1.33 |
| **Key Rework Issues** | Type exports | API versioning | Session bootstrap | Deferred scope |
| **Architectural Decisions** | Comment nesting | Revenue split | Auth guards | Section routing |

### Observations Over Time

1. **Planning fidelity improving:** v1.6-7 had more rework; v1.8-9 plans executed more cleanly.
2. **Phase duration shrinking:** Early versions (v1.6-7) averaged 2-3h; recent versions 1-1.5h. Suggests maturing developer velocity and better upfront planning.
3. **Modularity paying dividends:** Feature-local structure (types/api/view) scaling well; reduces cross-file dependencies.
4. **Session management stable:** Post-v1.8, session auth regressions near zero.

---

*Latest update: 2026-04-09 after v1.9 completion*
