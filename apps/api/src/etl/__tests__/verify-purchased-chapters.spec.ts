import { buildPurchasedChapterVerificationReport } from '../purchased-chapter-verification-report';

describe('verify-purchased-chapters', () => {
  it('computes totals and mismatch rows deterministically', () => {
    const report = buildPurchasedChapterVerificationReport({
      sourceRows: 3,
      sourceDecodeFailures: 1,
      sourceDecodedByUserId: new Map([
        [3, 2],
        [1, 4],
      ]),
      targetByUserId: new Map([
        [1, 4],
        [2, 3],
        [3, 1],
      ]),
    });

    expect(report.totals.sourceDecoded).toBe(6);
    expect(report.totals.target).toBe(8);
    expect(report.totals.delta).toBe(2);

    expect(report.counts.sourceRows).toBe(3);
    expect(report.counts.sourceDecodeFailures).toBe(1);
    expect(report.counts.mismatches).toBe(2);
    expect(report.mismatches.map((row) => row.userId)).toEqual([2, 3]);
  });
});
