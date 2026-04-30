import {
  buildContentReconciliationReport,
  buildRerunSafetyReport,
  formatContentReconciliationSummary,
  type ContentReconciliationPayload,
} from '../content-reconciliation-report';

describe('content-reconciliation-report', () => {
  it('returns zero deltas and no mismatches for exact parity', () => {
    const report = buildContentReconciliationReport({
      sourceNovels: [{ id: 1, postContent: 'N1' }],
      targetNovels: [{ id: 1, postContent: 'N1' }],
      sourceChapters: [{ id: 10, novelId: 1, postContent: 'C1' }],
      targetChapters: [{ id: 10, novelId: 1, postContent: 'C1' }],
    });

    expect(report.deltas.novelDelta).toBe(0);
    expect(report.deltas.chapterDelta).toBe(0);
    expect(report.integrity.orphanChapters).toBe(0);
    expect(report.integrity.relationMismatches).toBe(0);
    expect(report.integrity.contentMismatches).toBe(0);
    expect(report.mismatches).toEqual([]);
  });

  it('returns deterministic mismatch ordering for missing records', () => {
    const report = buildContentReconciliationReport({
      sourceNovels: [{ id: 1, postContent: 'N1' }],
      targetNovels: [{ id: 2, postContent: 'N2' }],
      sourceChapters: [{ id: 10, novelId: 1, postContent: 'C1' }],
      targetChapters: [{ id: 20, novelId: 2, postContent: 'C2' }],
    });

    expect(
      report.mismatches.map((x) => `${x.entityType}:${x.id}:${x.reason}`),
    ).toEqual([
      'chapter:10:missing_in_target',
      'chapter:20:missing_in_source',
      'novel:1:missing_in_target',
      'novel:2:missing_in_source',
    ]);
  });

  it('flags missing parent and relation mismatch', () => {
    const report = buildContentReconciliationReport({
      sourceNovels: [{ id: 1, postContent: 'N1' }],
      targetNovels: [{ id: 1, postContent: 'N1' }],
      sourceChapters: [{ id: 10, novelId: 1, postContent: 'C1' }],
      targetChapters: [{ id: 10, novelId: 99, postContent: 'C1' }],
    });

    expect(report.integrity.orphanChapters).toBe(1);
    expect(report.integrity.relationMismatches).toBe(1);
  });

  it('flags content mismatch counts', () => {
    const report = buildContentReconciliationReport({
      sourceNovels: [{ id: 1, postContent: 'N1' }],
      targetNovels: [{ id: 1, postContent: 'N1' }],
      sourceChapters: [{ id: 10, novelId: 1, postContent: 'C1-source' }],
      targetChapters: [{ id: 10, novelId: 1, postContent: 'C1-target' }],
    });

    expect(report.integrity.contentMismatches).toBe(1);
    expect(report.mismatches.some((x) => x.reason === 'content_mismatch')).toBe(
      true,
    );
  });

  it('computes rerun duplicate growth flags', () => {
    const rerunStable = buildRerunSafetyReport({
      beforeRun: { novels: 3, chapters: 20 },
      afterRun: { novels: 3, chapters: 20 },
    });

    expect(rerunStable.duplicateGrowth.novels).toBe(false);
    expect(rerunStable.duplicateGrowth.chapters).toBe(false);

    const rerunGrowth = buildRerunSafetyReport({
      beforeRun: { novels: 3, chapters: 20 },
      afterRun: { novels: 4, chapters: 21 },
    });

    expect(rerunGrowth.duplicateGrowth.novels).toBe(true);
    expect(rerunGrowth.duplicateGrowth.chapters).toBe(true);
  });

  it('formats summary including rerun skipped branch', () => {
    const payload: ContentReconciliationPayload = {
      generatedAt: '2026-04-07T00:00:00.000Z',
      reconciliation: buildContentReconciliationReport({
        sourceNovels: [{ id: 1, postContent: 'N1' }],
        targetNovels: [{ id: 1, postContent: 'N1' }],
        sourceChapters: [{ id: 10, novelId: 1, postContent: 'C1' }],
        targetChapters: [{ id: 10, novelId: 1, postContent: 'C1' }],
      }),
      rerunSafety: { skipped: true, reason: 'ETL_VERIFY_RERUN not enabled' },
    };

    const text = formatContentReconciliationSummary(payload);
    expect(text).toContain('Content Reconciliation Summary');
    expect(text).toContain('Rerun safety: skipped');
  });
});
