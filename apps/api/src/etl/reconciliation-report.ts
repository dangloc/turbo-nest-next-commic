import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';

export type WalletBalanceSnapshot = {
  userId: number;
  sourceBalance: number;
  targetBalance: number;
  delta: number;
};

export type WalletReconciliationReport = {
  generatedAt: string;
  totals: {
    source: number;
    target: number;
    delta: number;
  };
  counts: {
    sourceUsers: number;
    targetWallets: number;
    comparedUsers: number;
    mismatches: number;
  };
  mismatches: WalletBalanceSnapshot[];
};

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(value: number): number {
  return Number((value / 100).toFixed(2));
}

function normalizeMoney(value: number): number {
  return fromCents(toCents(value));
}

function normalizeOutputPath(filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }

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

export function buildWalletReconciliationReport(input: {
  sourceByUserId: ReadonlyMap<number, number>;
  targetByUserId: ReadonlyMap<number, number>;
}): WalletReconciliationReport {
  const sourceEntries = [...input.sourceByUserId.entries()].sort(
    (a, b) => a[0] - b[0],
  );
  const targetEntries = [...input.targetByUserId.entries()].sort(
    (a, b) => a[0] - b[0],
  );

  const sourceTotalCents = sourceEntries.reduce(
    (sum, [, value]) => sum + toCents(value),
    0,
  );
  const targetTotalCents = targetEntries.reduce(
    (sum, [, value]) => sum + toCents(value),
    0,
  );

  const userIds = new Set<number>([
    ...input.sourceByUserId.keys(),
    ...input.targetByUserId.keys(),
  ]);

  const mismatches: WalletBalanceSnapshot[] = [...userIds]
    .sort((a, b) => a - b)
    .map((userId) => {
      const sourceBalance = normalizeMoney(
        input.sourceByUserId.get(userId) ?? 0,
      );
      const targetBalance = normalizeMoney(
        input.targetByUserId.get(userId) ?? 0,
      );
      const delta = normalizeMoney(targetBalance - sourceBalance);
      return {
        userId,
        sourceBalance,
        targetBalance,
        delta,
      };
    })
    .filter((row) => toCents(row.delta) !== 0);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      source: fromCents(sourceTotalCents),
      target: fromCents(targetTotalCents),
      delta: fromCents(targetTotalCents - sourceTotalCents),
    },
    counts: {
      sourceUsers: input.sourceByUserId.size,
      targetWallets: input.targetByUserId.size,
      comparedUsers: userIds.size,
      mismatches: mismatches.length,
    },
    mismatches,
  };
}

export async function persistWalletReconciliationReport(
  outputPath: string,
  report: WalletReconciliationReport,
): Promise<void> {
  const resolvedPath = normalizeOutputPath(outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, JSON.stringify(report, null, 2), 'utf8');
}

export function formatWalletReconciliationSummary(
  report: WalletReconciliationReport,
): string {
  return [
    'Wallet Reconciliation Summary',
    `Source total: ${report.totals.source.toFixed(2)}`,
    `Target total: ${report.totals.target.toFixed(2)}`,
    `Delta: ${report.totals.delta.toFixed(2)}`,
    `Compared users: ${report.counts.comparedUsers}`,
    `Mismatches: ${report.counts.mismatches}`,
  ].join('\n');
}
