import {
  buildTaxonomyReconciliationReport,
  buildTaxonomyRerunSafetyReport,
  formatTaxonomyReconciliationSummary,
  type TaxonomyReconciliationPayload,
} from '../taxonomy-reconciliation-report';

describe('taxonomy-reconciliation-report', () => {
  it('returns zero deltas and no mismatches for exact parity', () => {
    const report = buildTaxonomyReconciliationReport({
      sourceTerms: [{ id: 1, slug: 'fantasy', taxonomy: 'category' }],
      targetTerms: [{ id: 1, slug: 'fantasy', taxonomy: 'category' }],
      sourceLinks: [{ novelId: 10, termId: 1 }],
      targetLinks: [{ novelId: 10, termId: 1 }],
    });

    expect(report.deltas.termDelta).toBe(0);
    expect(report.deltas.linkDelta).toBe(0);
    expect(report.integrity.termMismatches).toBe(0);
    expect(report.integrity.linkMismatches).toBe(0);
    expect(report.mismatches).toEqual([]);
  });

  it('returns deterministic mismatch ordering for missing records', () => {
    const report = buildTaxonomyReconciliationReport({
      sourceTerms: [{ id: 1, slug: 'a', taxonomy: 'category' }],
      targetTerms: [{ id: 2, slug: 'b', taxonomy: 'category' }],
      sourceLinks: [{ novelId: 10, termId: 1 }],
      targetLinks: [{ novelId: 11, termId: 2 }],
    });

    expect(
      report.mismatches.map((x) => `${x.kind}:${x.key}:${x.reason}`),
    ).toEqual([
      'link:10:1:missing_in_target',
      'link:11:2:missing_in_source',
      'term:1:missing_in_target',
      'term:2:missing_in_source',
    ]);
  });

  it('flags taxonomy mismatch when slug or taxonomy differs', () => {
    const report = buildTaxonomyReconciliationReport({
      sourceTerms: [{ id: 1, slug: 'fantasy', taxonomy: 'category' }],
      targetTerms: [{ id: 1, slug: 'fantasy-alt', taxonomy: 'post_tag' }],
      sourceLinks: [],
      targetLinks: [],
    });

    expect(
      report.mismatches.some((x) => x.reason === 'taxonomy_mismatch'),
    ).toBe(true);
  });

  it('computes rerun duplicate growth flags', () => {
    const stable = buildTaxonomyRerunSafetyReport({
      beforeRun: { terms: 5, links: 20 },
      afterRun: { terms: 5, links: 20 },
    });

    expect(stable.duplicateGrowth.terms).toBe(false);
    expect(stable.duplicateGrowth.links).toBe(false);

    const growth = buildTaxonomyRerunSafetyReport({
      beforeRun: { terms: 5, links: 20 },
      afterRun: { terms: 6, links: 21 },
    });

    expect(growth.duplicateGrowth.terms).toBe(true);
    expect(growth.duplicateGrowth.links).toBe(true);
  });

  it('formats summary including rerun skipped branch', () => {
    const payload: TaxonomyReconciliationPayload = {
      generatedAt: '2026-04-08T00:00:00.000Z',
      reconciliation: buildTaxonomyReconciliationReport({
        sourceTerms: [{ id: 1, slug: 'a', taxonomy: 'category' }],
        targetTerms: [{ id: 1, slug: 'a', taxonomy: 'category' }],
        sourceLinks: [{ novelId: 10, termId: 1 }],
        targetLinks: [{ novelId: 10, termId: 1 }],
      }),
      rerunSafety: { skipped: true, reason: 'ETL_VERIFY_RERUN not enabled' },
    };

    const text = formatTaxonomyReconciliationSummary(payload);
    expect(text).toContain('Taxonomy Reconciliation Summary');
    expect(text).toContain('Rerun safety: skipped');
  });
});
