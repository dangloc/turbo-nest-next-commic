import { spawnSync } from 'node:child_process';
import { loadEtlConfig } from './config';
import {
  buildTaxonomyReconciliationReport,
  buildTaxonomyRerunSafetyReport,
  formatTaxonomyReconciliationSummary,
  persistTaxonomyReconciliationReport,
  type TaxonomyReconciliationPayload,
  type TaxonomyRerunSafetyReport,
} from './taxonomy-reconciliation-report';
import { createMySqlClient } from './mysql-client';
import {
  connectPrisma,
  createPrismaClient,
  disconnectPrisma,
} from './prisma-client';
import { createSourceLoaders } from './source-mysql-loaders';

function isMissingTableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message
    .toLowerCase()
    .includes('does not exist in the current database');
}

async function safeTargetRows<T>(loader: () => Promise<T[]>): Promise<T[]> {
  try {
    return await loader();
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

async function safeTargetCount(loader: () => Promise<number>): Promise<number> {
  try {
    return await loader();
  } catch (error) {
    if (isMissingTableError(error)) {
      return 0;
    }
    throw error;
  }
}

export type TaxonomyVerificationTerm = {
  id: number;
  slug: string;
  taxonomy: string;
};

export type TaxonomyVerificationLink = {
  novelId: number;
  termId: number;
};

export function buildTaxonomyVerificationPayload(input: {
  sourceTerms: TaxonomyVerificationTerm[];
  targetTerms: TaxonomyVerificationTerm[];
  sourceLinks: TaxonomyVerificationLink[];
  targetLinks: TaxonomyVerificationLink[];
  rerunSafety:
    | { skipped: true; reason: string }
    | { skipped: false; report: TaxonomyRerunSafetyReport };
}): TaxonomyReconciliationPayload {
  return {
    generatedAt: new Date().toISOString(),
    reconciliation: buildTaxonomyReconciliationReport({
      sourceTerms: input.sourceTerms,
      targetTerms: input.targetTerms,
      sourceLinks: input.sourceLinks,
      targetLinks: input.targetLinks,
    }),
    rerunSafety: input.rerunSafety,
  };
}

export async function computeTaxonomyRerunSafety(deps: {
  getCounts: () => Promise<{ terms: number; links: number }>;
  runEtlOnce: () => Promise<void>;
}): Promise<TaxonomyRerunSafetyReport> {
  const beforeRun = await deps.getCounts();
  await deps.runEtlOnce();
  const afterRun = await deps.getCounts();
  return buildTaxonomyRerunSafetyReport({ beforeRun, afterRun });
}

export async function runEtlMigrateOnce(): Promise<void> {
  const result = spawnSync('npm', ['run', 'etl:migrate'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`etl:migrate failed with exit code ${result.status ?? -1}`);
  }
}

async function loadTargetLinks(
  query: <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>,
): Promise<TaxonomyVerificationLink[]> {
  const rows = await query<Array<{ novelId: number; termId: number }>>`
    SELECT "A" as "novelId", "B" as "termId"
    FROM "_NovelToTerm"
  `;

  return rows.map((row) => ({
    novelId: Number(row.novelId),
    termId: Number(row.termId),
  }));
}

async function loadTargetLinkCount(
  query: <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>,
): Promise<number> {
  const rows = await query<Array<{ count: bigint | number | string }>>`
    SELECT COUNT(*)::bigint as "count"
    FROM "_NovelToTerm"
  `;

  if (rows.length === 0) {
    return 0;
  }

  return Number(rows[0].count);
}

export async function verifyTaxonomyReconciliation(): Promise<void> {
  const config = loadEtlConfig();
  const mysql = createMySqlClient(config);
  const prisma = createPrismaClient(config);
  const sourceLoaders = createSourceLoaders(mysql);

  try {
    await mysql.connect();
    await connectPrisma(prisma);

    const [sourceTermsRaw, sourceTermRelationshipsRaw, sourceNovelsRaw] =
      await Promise.all([
        sourceLoaders.loadTerms(),
        sourceLoaders.loadTermRelationships(),
        sourceLoaders.loadNovels(),
      ]);

    const [targetTermsRaw, targetLinksRaw] = await Promise.all([
      safeTargetRows(() =>
        prisma.term.findMany({
          select: { id: true, slug: true, taxonomy: true },
        }),
      ),
      safeTargetRows(() => loadTargetLinks(prisma.$queryRaw.bind(prisma))),
    ]);

    const sourceTerms: TaxonomyVerificationTerm[] = sourceTermsRaw.map(
      (row) => ({
        id: row.id,
        slug: row.slug,
        taxonomy: row.taxonomy,
      }),
    );

    const sourceNovelIds = new Set(sourceNovelsRaw.map((row) => row.id));
    const sourceLinks: TaxonomyVerificationLink[] = sourceTermRelationshipsRaw
      .filter((row) => sourceNovelIds.has(row.novelId))
      .map((row) => ({
        novelId: row.novelId,
        termId: row.termId,
      }));

    const targetTerms: TaxonomyVerificationTerm[] = targetTermsRaw.map(
      (row) => ({
        id: row.id,
        slug: row.slug,
        taxonomy: row.taxonomy,
      }),
    );

    const targetLinks: TaxonomyVerificationLink[] = targetLinksRaw
      .filter((row) => sourceNovelIds.has(row.novelId))
      .map((row) => ({
        novelId: row.novelId,
        termId: row.termId,
      }));

    const shouldRunRerun = process.env.ETL_VERIFY_RERUN === 'true';

    const rerunSafety = shouldRunRerun
      ? {
          skipped: false as const,
          report: await computeTaxonomyRerunSafety({
            getCounts: async () => {
              const [terms, links] = await Promise.all([
                safeTargetCount(() => prisma.term.count()),
                safeTargetCount(() =>
                  loadTargetLinkCount(prisma.$queryRaw.bind(prisma)),
                ),
              ]);
              return { terms, links };
            },
            runEtlOnce: runEtlMigrateOnce,
          }),
        }
      : {
          skipped: true as const,
          reason: 'ETL_VERIFY_RERUN not enabled',
        };

    const payload = buildTaxonomyVerificationPayload({
      sourceTerms,
      targetTerms,
      sourceLinks,
      targetLinks,
      rerunSafety,
    });

    await persistTaxonomyReconciliationReport(
      config.runtime.taxonomyReconciliationPath,
      payload,
    );

    console.log(formatTaxonomyReconciliationSummary(payload));
    console.log(
      `Taxonomy reconciliation output: ${config.runtime.taxonomyReconciliationPath}`,
    );
  } finally {
    await disconnectPrisma(prisma);
    await mysql.disconnect();
  }
}

if (require.main === module) {
  void verifyTaxonomyReconciliation().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Taxonomy reconciliation verification failed: ${message}`);
    process.exitCode = 1;
  });
}
