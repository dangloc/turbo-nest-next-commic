import {
  buildTaxonomyVerificationPayload,
  computeTaxonomyRerunSafety,
} from '../verify-taxonomy-reconciliation';

describe('verify-taxonomy-reconciliation', () => {
  it('builds payload with deterministic reconciliation totals', () => {
    const payload = buildTaxonomyVerificationPayload({
      sourceTerms: [{ id: 1, slug: 'fantasy', taxonomy: 'category' }],
      targetTerms: [{ id: 1, slug: 'fantasy', taxonomy: 'category' }],
      sourceLinks: [{ novelId: 10, termId: 1 }],
      targetLinks: [{ novelId: 10, termId: 1 }],
      rerunSafety: { skipped: true, reason: 'ETL_VERIFY_RERUN not enabled' },
    });

    expect(payload.reconciliation.totals.sourceTerms).toBe(1);
    expect(payload.reconciliation.totals.targetTerms).toBe(1);
    expect(payload.reconciliation.totals.sourceLinks).toBe(1);
    expect(payload.reconciliation.totals.targetLinks).toBe(1);
    expect(payload.reconciliation.mismatches).toEqual([]);
  });

  it('computes rerun safety from count snapshots', async () => {
    const snapshots = [
      { terms: 5, links: 20 },
      { terms: 5, links: 20 },
    ];

    const report = await computeTaxonomyRerunSafety({
      getCounts: async () => snapshots.shift() ?? { terms: 0, links: 0 },
      runEtlOnce: async () => undefined,
    });

    expect(report.deltas.terms).toBe(0);
    expect(report.deltas.links).toBe(0);
    expect(report.duplicateGrowth.terms).toBe(false);
    expect(report.duplicateGrowth.links).toBe(false);
  });
});
