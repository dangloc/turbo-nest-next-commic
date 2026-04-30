import { makeUserChapterKey, shouldSkipUser } from './idempotence';
import { parsePurchasedChapters } from './parse-wordpress';
import type { QuarantineRepository } from './quarantine-repository';
import type { SourceChapterRow } from './types';

export type PurchasedChapterWrite = {
  userId: number;
  novelId: number;
  chapterId: number;
  pricePaid: number;
  purchasedAt: Date;
};

export interface PurchasedChapterRepo {
  createMany(
    rows: PurchasedChapterWrite[],
    options: { skipDuplicates: boolean },
  ): Promise<number>;
}

export const DEFAULT_PURCHASED_CHAPTER_CHUNK = 1000;

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }
  return out;
}

export async function migratePurchasedChapters(
  rows: SourceChapterRow[],
  deps: {
    repo: PurchasedChapterRepo;
    chunkSize?: number;
    quarantinedUserIds: Set<number>;
    quarantineRepo: QuarantineRepository;
    validNovelIds?: Set<number>;
    validChapterIds?: Set<number>;
  },
): Promise<{ chaptersInserted: number; skippedUsers: number }> {
  let chaptersInserted = 0;
  let skippedUsers = 0;
  const chunkSize = deps.chunkSize ?? DEFAULT_PURCHASED_CHAPTER_CHUNK;

  for (const row of rows) {
    if (shouldSkipUser(row.userId, deps.quarantinedUserIds)) {
      skippedUsers += 1;
      continue;
    }

    const parsed = parsePurchasedChapters(row.userId, row.purchasesRaw);
    if (!parsed.ok) {
      deps.quarantinedUserIds.add(row.userId);
      deps.quarantineRepo.add({
        sourceUserId: row.userId,
        field: '_purchased_chapters',
        reason: parsed.failure.reason,
        raw: parsed.failure.raw,
      });
      skippedUsers += 1;
      continue;
    }

    const deduped = new Map<string, PurchasedChapterWrite>();
    for (const purchase of parsed.value) {
      if (purchase.novelId <= 0 || purchase.chapterId <= 0) {
        continue;
      }

      if (deps.validNovelIds && !deps.validNovelIds.has(purchase.novelId)) {
        continue;
      }

      if (deps.validChapterIds && !deps.validChapterIds.has(purchase.chapterId)) {
        continue;
      }

      const key = makeUserChapterKey(row.userId, purchase.chapterId);
      deduped.set(key, {
        userId: row.userId,
        novelId: purchase.novelId,
        chapterId: purchase.chapterId,
        pricePaid: purchase.pricePaid,
        purchasedAt: purchase.purchasedAt,
      });
    }

    for (const part of chunk([...deduped.values()], chunkSize)) {
      chaptersInserted += await deps.repo.createMany(part, {
        skipDuplicates: true,
      });
    }
  }

  return { chaptersInserted, skippedUsers };
}
