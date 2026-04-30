import {
  buildContentVerificationPayload,
  computeRerunSafety,
} from '../verify-content-reconciliation';

describe('verify-content-reconciliation', () => {
  it('builds payload with reconciliation deltas and integrity counters', () => {
    const payload = buildContentVerificationPayload({
      sourceNovels: [{ id: 1, postContent: 'N1' }],
      targetNovels: [{ id: 1, postContent: 'N1' }],
      sourceChapters: [{ id: 10, novelId: 1, postContent: 'C1' }],
      targetChapters: [{ id: 10, novelId: 1, postContent: 'C1x' }],
      rerunSafety: { skipped: true, reason: 'test' },
    });

    expect(payload.reconciliation.deltas.novelDelta).toBe(0);
    expect(payload.reconciliation.deltas.chapterDelta).toBe(0);
    expect(payload.reconciliation.integrity.contentMismatches).toBe(1);
    expect(payload.rerunSafety.skipped).toBe(true);
  });

  it('computes rerun safety with no duplicate growth for stable rerun', async () => {
    const snapshots = [
      { novels: 3, chapters: 10 },
      { novels: 3, chapters: 10 },
    ];
    let index = 0;
    let runs = 0;

    const report = await computeRerunSafety({
      getCounts: async () => {
        const value = snapshots[index];
        index += 1;
        return value;
      },
      runEtlOnce: async () => {
        runs += 1;
      },
    });

    expect(runs).toBe(1);
    expect(report.deltas.novels).toBe(0);
    expect(report.deltas.chapters).toBe(0);
    expect(report.duplicateGrowth.novels).toBe(false);
    expect(report.duplicateGrowth.chapters).toBe(false);
  });

  it('computes rerun safety duplicate growth when counts increase', async () => {
    const snapshots = [
      { novels: 3, chapters: 10 },
      { novels: 4, chapters: 12 },
    ];
    let index = 0;

    const report = await computeRerunSafety({
      getCounts: async () => {
        const value = snapshots[index];
        index += 1;
        return value;
      },
      runEtlOnce: async () => {},
    });

    expect(report.duplicateGrowth.novels).toBe(true);
    expect(report.duplicateGrowth.chapters).toBe(true);
  });
});
