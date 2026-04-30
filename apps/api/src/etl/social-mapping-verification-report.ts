import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';

export type SocialMappingVerificationReport = {
  generatedAt: string;
  counts: {
    sourceGoogleMappings: number;
    targetGoogleMappings: number;
    matched: number;
    missingInTarget: number;
    extraInTarget: number;
  };
  missingInTarget: string[];
  extraInTarget: string[];
};

function normalizeOutputPath(filePath: string): string {
  if (isAbsolute(filePath)) return filePath;

  const normalizedPath = normalize(filePath);
  const cwd = normalize(process.cwd());
  const appApiPrefix = `apps${sep}api${sep}`;

  if (
    cwd.endsWith(`${sep}apps${sep}api`) &&
    normalizedPath.startsWith(appApiPrefix)
  ) {
    return resolve(cwd, normalizedPath.slice(appApiPrefix.length));
  }

  return resolve(cwd, normalizedPath);
}

export function buildSocialMappingVerificationReport(input: {
  sourceGoogleKeys: ReadonlySet<string>;
  targetGoogleKeys: ReadonlySet<string>;
}): SocialMappingVerificationReport {
  const missingInTarget = [...input.sourceGoogleKeys]
    .filter((key) => !input.targetGoogleKeys.has(key))
    .sort();

  const extraInTarget = [...input.targetGoogleKeys]
    .filter((key) => !input.sourceGoogleKeys.has(key))
    .sort();

  const matched = input.sourceGoogleKeys.size - missingInTarget.length;

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      sourceGoogleMappings: input.sourceGoogleKeys.size,
      targetGoogleMappings: input.targetGoogleKeys.size,
      matched,
      missingInTarget: missingInTarget.length,
      extraInTarget: extraInTarget.length,
    },
    missingInTarget,
    extraInTarget,
  };
}

export async function persistSocialMappingVerificationReport(
  outputPath: string,
  report: SocialMappingVerificationReport,
): Promise<void> {
  const resolvedPath = normalizeOutputPath(outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, JSON.stringify(report, null, 2), 'utf8');
}

export function formatSocialMappingVerificationSummary(
  report: SocialMappingVerificationReport,
): string {
  return [
    'Google Social Mapping Verification Summary',
    `Source google mappings: ${report.counts.sourceGoogleMappings}`,
    `Target google mappings: ${report.counts.targetGoogleMappings}`,
    `Matched: ${report.counts.matched}`,
    `Missing in target: ${report.counts.missingInTarget}`,
    `Extra in target: ${report.counts.extraInTarget}`,
  ].join('\n');
}
