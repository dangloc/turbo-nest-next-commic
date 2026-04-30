import { buildWalletReconciliationReport } from '../reconciliation-report';

describe('verify-wallet-reconciliation', () => {
  it('computes totals and mismatches with deterministic order', () => {
    const report = buildWalletReconciliationReport({
      sourceByUserId: new Map([
        [3, 10],
        [1, 20],
      ]),
      targetByUserId: new Map([
        [1, 20],
        [3, 8],
        [2, 5],
      ]),
    });

    expect(report.totals.source).toBe(30);
    expect(report.totals.target).toBe(33);
    expect(report.totals.delta).toBe(3);

    expect(report.counts.comparedUsers).toBe(3);
    expect(report.counts.mismatches).toBe(2);
    expect(report.mismatches.map((row) => row.userId)).toEqual([2, 3]);
  });

  it('normalizes floating values to two decimals', () => {
    const report = buildWalletReconciliationReport({
      sourceByUserId: new Map([[1, 10.006]]),
      targetByUserId: new Map([[1, 10.004]]),
    });

    expect(report.totals.source).toBe(10.01);
    expect(report.totals.target).toBe(10);
    expect(report.totals.delta).toBe(-0.01);
    expect(report.counts.mismatches).toBe(1);
  });
});

describe('verify-wallet-reconciliation script contracts', () => {
  it('includes VIP source parity query', () => {
    const file = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'verify-wallet-reconciliation.ts'),
      'utf-8',
    );
    expect(file).toContain('SELECT id FROM wp_vip_levels');
    expect(file).toContain('vipParity');
  });

  it('includes wallet split backfill integrity checks', () => {
    const file = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'verify-wallet-reconciliation.ts'),
      'utf-8',
    );
    expect(file).toContain("meta_key = '_user_balance'");
    expect(file).toContain('wp_usermeta._user_balance');
    expect(file).toContain('depositedBalance');
    expect(file).toContain('totalDeposited');
    expect(file).toContain('users.balance');
    expect(file).toContain('users.kimTe');
    expect(file).toContain('walletBackfill');
  });
});
