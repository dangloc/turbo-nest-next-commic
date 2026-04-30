import { buildSocialMappingVerificationReport } from '../social-mapping-verification-report';

describe('verify-social-mappings', () => {
  it('computes missing and extra mappings deterministically', () => {
    const report = buildSocialMappingVerificationReport({
      sourceGoogleKeys: new Set([
        '1|google|abc',
        '2|google|def',
        '3|google|ghi',
      ]),
      targetGoogleKeys: new Set([
        '1|google|abc',
        '3|google|ghi',
        '4|google|zzz',
      ]),
    });

    expect(report.counts.sourceGoogleMappings).toBe(3);
    expect(report.counts.targetGoogleMappings).toBe(3);
    expect(report.counts.matched).toBe(2);
    expect(report.counts.missingInTarget).toBe(1);
    expect(report.counts.extraInTarget).toBe(1);
    expect(report.missingInTarget).toEqual(['2|google|def']);
    expect(report.extraInTarget).toEqual(['4|google|zzz']);
  });
});
