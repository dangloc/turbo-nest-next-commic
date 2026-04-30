import { spawnSync } from 'node:child_process';
import { loadEtlConfig } from './config';
import {
  buildContentReconciliationReport,
  buildRerunSafetyReport,
  formatContentReconciliationSummary,
  persistContentReconciliationReport,
  type ContentReconciliationPayload,
  type RerunSafetyReport,
} from './content-reconciliation-report';
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

export type ContentVerificationNovel = {
  id: number;
  postContent: string;
};

export type ContentVerificationChapter = {
  id: number;
  novelId: number;
  postContent: string;
};

export function buildContentVerificationPayload(input: {
  sourceNovels: ContentVerificationNovel[];
  targetNovels: ContentVerificationNovel[];
  sourceChapters: ContentVerificationChapter[];
  targetChapters: ContentVerificationChapter[];
  rerunSafety:
    | { skipped: true; reason: string }
    | { skipped: false; report: RerunSafetyReport };
}): ContentReconciliationPayload {
  return {
    generatedAt: new Date().toISOString(),
    reconciliation: buildContentReconciliationReport({
      sourceNovels: input.sourceNovels,
      targetNovels: input.targetNovels,
      sourceChapters: input.sourceChapters,
      targetChapters: input.targetChapters,
    }),
    rerunSafety: input.rerunSafety,
  };
}

export async function computeRerunSafety(deps: {
  getCounts: () => Promise<{ novels: number; chapters: number }>;
  runEtlOnce: () => Promise<void>;
}): Promise<RerunSafetyReport> {
  const beforeRun = await deps.getCounts();
  await deps.runEtlOnce();
  const afterRun = await deps.getCounts();
  return buildRerunSafetyReport({ beforeRun, afterRun });
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

export async function verifyContentReconciliation(): Promise<void> {
  const config = loadEtlConfig();
  const mysql = createMySqlClient(config);
  const prisma = createPrismaClient(config);
  const sourceLoaders = createSourceLoaders(mysql);

  try {
    await mysql.connect();
    await connectPrisma(prisma);

    const [sourceNovelsRaw, sourceChaptersRaw] = await Promise.all([
      sourceLoaders.loadNovels(),
      sourceLoaders.loadChapters(),
    ]);

    const [targetNovelsRaw, targetChaptersRaw] = await Promise.all([
      safeTargetRows(() =>
        prisma.novel.findMany({
          select: { id: true, postContent: true },
        }),
      ),
      safeTargetRows(() =>
        prisma.chapter.findMany({
          select: { id: true, novelId: true, postContent: true },
        }),
      ),
    ]);

    const sourceNovelIds = new Set(sourceNovelsRaw.map((row) => row.id));
    const migratableSourceChaptersRaw = sourceChaptersRaw.filter((row) =>
      sourceNovelIds.has(row.novelId),
    );
    const migratableSourceChapterIds = new Set(
      migratableSourceChaptersRaw.map((row) => row.id),
    );

    const targetNovelsInSourceScope = targetNovelsRaw.filter((row) =>
      sourceNovelIds.has(row.id),
    );
    const targetChaptersInSourceScope = targetChaptersRaw.filter((row) =>
      migratableSourceChapterIds.has(row.id),
    );

    const sourceNovels: ContentVerificationNovel[] = sourceNovelsRaw.map(
      (row) => ({
        id: row.id,
        postContent: row.postContent,
      }),
    );

    const sourceChapters: ContentVerificationChapter[] =
      migratableSourceChaptersRaw.map((row) => ({
        id: row.id,
        novelId: row.novelId,
        postContent: row.postContent,
      }));

    const targetNovels: ContentVerificationNovel[] =
      targetNovelsInSourceScope.map((row) => ({
        id: row.id,
        postContent: row.postContent,
      }));

    const targetChapters: ContentVerificationChapter[] =
      targetChaptersInSourceScope.map((row) => ({
        id: row.id,
        novelId: row.novelId,
        postContent: row.postContent,
      }));

    const shouldRunRerun = process.env.ETL_VERIFY_RERUN === 'true';

    const rerunSafety = shouldRunRerun
      ? {
          skipped: false as const,
          report: await computeRerunSafety({
            getCounts: async () => {
              const [novels, chapters] = await Promise.all([
                safeTargetCount(() => prisma.novel.count()),
                safeTargetCount(() => prisma.chapter.count()),
              ]);
              return { novels, chapters };
            },
            runEtlOnce: runEtlMigrateOnce,
          }),
        }
      : {
          skipped: true as const,
          reason: 'ETL_VERIFY_RERUN not enabled',
        };

    const payload = buildContentVerificationPayload({
      sourceNovels,
      targetNovels,
      sourceChapters,
      targetChapters,
      rerunSafety,
    });

    await persistContentReconciliationReport(
      config.runtime.contentReconciliationPath,
      payload,
    );

    console.log(formatContentReconciliationSummary(payload));
    console.log(
      `Content reconciliation output: ${config.runtime.contentReconciliationPath}`,
    );
  } finally {
    await disconnectPrisma(prisma);
    await mysql.disconnect();
  }
}

if (require.main === module) {
  void verifyContentReconciliation().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Content reconciliation verification failed: ${message}`);
    process.exitCode = 1;
  });
}
