import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';

export type PurchasedChapterMismatch = {
  userId: number;
  sourceDecodedCount: number;
  targetCount: number;
  delta: number;
};

export type PurchasedChapterVerificationReport = {
  generatedAt: string;
  totals: {
    sourceDecoded: number;
    target: number;
    delta: number;
  };
  counts: {
    sourceRows: number;
    sourceDecodedUsers: number;
    sourceDecodeFailures: number;
    targetUsers: number;
    comparedUsers: number;
    mismatches: number;
  };
  mismatches: PurchasedChapterMismatch[];
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

export function buildPurchasedChapterVerificationReport(input: {
  sourceRows: number;
  sourceDecodeFailures: number;
  sourceDecodedByUserId: ReadonlyMap<number, number>;
  targetByUserId: ReadonlyMap<number, number>;
}): PurchasedChapterVerificationReport {
  const sourceTotal = [...input.sourceDecodedByUserId.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const targetTotal = [...input.targetByUserId.values()].reduce(
    (sum, value) => sum + value,
    0,
  );

  const userIds = new Set<number>([
    ...input.sourceDecodedByUserId.keys(),
    ...input.targetByUserId.keys(),
  ]);

  const mismatches: PurchasedChapterMismatch[] = [...userIds]
    .sort((a, b) => a - b)
    .map((userId) => {
      const sourceDecodedCount = input.sourceDecodedByUserId.get(userId) ?? 0;
      const targetCount = input.targetByUserId.get(userId) ?? 0;
      return {
        userId,
        sourceDecodedCount,
        targetCount,
        delta: targetCount - sourceDecodedCount,
      };
    })
    .filter((row) => row.delta !== 0);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      sourceDecoded: sourceTotal,
      target: targetTotal,
      delta: targetTotal - sourceTotal,
    },
    counts: {
      sourceRows: input.sourceRows,
      sourceDecodedUsers: input.sourceDecodedByUserId.size,
      sourceDecodeFailures: input.sourceDecodeFailures,
      targetUsers: input.targetByUserId.size,
      comparedUsers: userIds.size,
      mismatches: mismatches.length,
    },
    mismatches,
  };
}

export async function persistPurchasedChapterVerificationReport(
  outputPath: string,
  report: PurchasedChapterVerificationReport,
): Promise<void> {
  const resolvedPath = normalizeOutputPath(outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, JSON.stringify(report, null, 2), 'utf8');
}

export function formatPurchasedChapterVerificationSummary(
  report: PurchasedChapterVerificationReport,
): string {
  return [
    'Purchased Chapter Reconciliation Summary',
    `Source decoded total: ${report.totals.sourceDecoded}`,
    `Target total: ${report.totals.target}`,
    `Delta: ${report.totals.delta}`,
    `Source decode failures: ${report.counts.sourceDecodeFailures}`,
    `Compared users: ${report.counts.comparedUsers}`,
    `Mismatches: ${report.counts.mismatches}`,
  ].join('\n');
}
