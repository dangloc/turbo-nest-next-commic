import type { RowDataPacket } from 'mysql2/promise';
import { loadEtlConfig } from './config';
import { createMySqlClient } from './mysql-client';
import { createSourceLoaders } from './source-mysql-loaders';
import { parsePurchasedChapters } from './parse-wordpress';
import {
  connectPrisma,
  createPrismaClient,
  disconnectPrisma,
} from './prisma-client';
import {
  buildPurchasedChapterVerificationReport,
  formatPurchasedChapterVerificationSummary,
  persistPurchasedChapterVerificationReport,
} from './purchased-chapter-verification-report';

type SourceChapterMetaRow = RowDataPacket & {
  user_id: unknown;
  meta_value: unknown;
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export async function verifyPurchasedChapterReconciliation(): Promise<void> {
  const config = loadEtlConfig();
  const mysql = createMySqlClient(config);
  const prisma = createPrismaClient(config);
  const sourceLoaders = createSourceLoaders(mysql);

  try {
    await mysql.connect();
    await connectPrisma(prisma);

    const [sourceRows, sourceNovelsRaw, sourceChaptersRaw, targetUsers] =
      await Promise.all([
        mysql.query<SourceChapterMetaRow>(
          `SELECT user_id, meta_value
           FROM wp_usermeta
           WHERE meta_key = '_purchased_chapters'
             AND meta_value IS NOT NULL
             AND meta_value <> ''`,
        ),
        sourceLoaders.loadNovels(),
        sourceLoaders.loadChapters(),
        prisma.user.findMany({ select: { id: true } }),
      ]);

    const sourceNovelIds = new Set(sourceNovelsRaw.map((row) => row.id));
    const sourceChapterIds = new Set(
      sourceChaptersRaw
        .filter((row) => sourceNovelIds.has(row.novelId))
        .map((row) => row.id),
    );
    const targetUserIds = new Set(targetUsers.map((row) => row.id));

    let decodeFailures = 0;
    const sourceDecodedByUserId = new Map<number, number>();

    for (const row of sourceRows) {
      const userId = asNumber(row.user_id, 0);
      if (userId <= 0) continue;

      const parsed = parsePurchasedChapters(userId, asString(row.meta_value));
      if (!parsed.ok) {
        decodeFailures += 1;
        continue;
      }

      if (!targetUserIds.has(userId)) {
        continue;
      }

      const uniqueEligiblePurchases = new Set<string>();
      for (const purchase of parsed.value) {
        if (
          sourceNovelIds.has(purchase.novelId) &&
          sourceChapterIds.has(purchase.chapterId)
        ) {
          uniqueEligiblePurchases.add(`${userId}:${purchase.chapterId}`);
        }
      }

      const existing = sourceDecodedByUserId.get(userId) ?? 0;
      sourceDecodedByUserId.set(
        userId,
        existing + uniqueEligiblePurchases.size,
      );
    }

    const targetRows = await prisma.purchasedChapter.findMany({
      select: {
        userId: true,
        chapterId: true,
      },
    });

    const targetByUserId = new Map<number, number>();
    for (const row of targetRows) {
      if (!sourceChapterIds.has(row.chapterId)) {
        continue;
      }

      targetByUserId.set(row.userId, (targetByUserId.get(row.userId) ?? 0) + 1);
    }

    const report = buildPurchasedChapterVerificationReport({
      sourceRows: sourceRows.length,
      sourceDecodeFailures: decodeFailures,
      sourceDecodedByUserId,
      targetByUserId,
    });

    await persistPurchasedChapterVerificationReport(
      config.runtime.purchasedChapterReconciliationPath,
      report,
    );

    console.log(formatPurchasedChapterVerificationSummary(report));
    console.log(
      `Purchased chapter reconciliation output: ${config.runtime.purchasedChapterReconciliationPath}`,
    );
  } finally {
    await disconnectPrisma(prisma);
    await mysql.disconnect();
  }
}

void verifyPurchasedChapterReconciliation().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Purchased chapter reconciliation failed: ${message}`);
  process.exitCode = 1;
});
