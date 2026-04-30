import { makeUserChapterKey, shouldSkipUser } from './idempotence';
import { parsePurchasedChapters } from './parse-wordpress';
import type { QuarantineRepository } from './quarantine-repository';
import type { SourceUserFinancialSnapshotRow } from './types';

export type UserFinancialPurchaseWrite = {
  userId: number;
  novelId: number;
  chapterId: number;
  pricePaid: number;
  purchasedAt: Date;
};

export interface UserFinancialRepo {
  upsertFinancialSnapshot(input: {
    userId: number;
    balance: number | null;
    vipLevelId: number | null;
  }): Promise<void>;

  createManyPurchasedChapters(
    rows: UserFinancialPurchaseWrite[],
    options: { skipDuplicates: boolean },
  ): Promise<number>;
}

function toInteger(raw: string | null | undefined): number {
  if (raw == null) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(raw: string | null | undefined): number {
  if (raw == null) {
    return 0;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function chunk<T>(rows: T[], size: number): T[][] {
  if (size <= 0) {
    return [rows];
  }

  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }
  return out;
}

export async function migrateUserFinancials(
  rows: SourceUserFinancialSnapshotRow[],
  deps: {
    repo: UserFinancialRepo;
    quarantineRepo: QuarantineRepository;
    quarantinedUserIds: Set<number>;
    validUserIds: ReadonlySet<number>;
    chunkSize?: number;
  },
): Promise<{
  financialsUpdated: number;
  chaptersInserted: number;
  skippedUsers: number;
}> {
  let financialsUpdated = 0;
  let chaptersInserted = 0;
  let skippedUsers = 0;

  const chunkSize = deps.chunkSize ?? 1000;

  for (const row of rows) {
    if (!deps.validUserIds.has(row.userId)) {
      skippedUsers += 1;
      continue;
    }

    if (shouldSkipUser(row.userId, deps.quarantinedUserIds)) {
      skippedUsers += 1;
      continue;
    }

    const balance =
      row.userBalanceRaw == null || row.userBalanceRaw.trim() === ''
        ? null
        : toNumber(row.userBalanceRaw);
    const vipLevel = toInteger(row.userVipLevelIdRaw);

    await deps.repo.upsertFinancialSnapshot({
      userId: row.userId,
      balance,
      vipLevelId: vipLevel > 0 ? vipLevel : null,
    });
    financialsUpdated += 1;

    const purchasesRaw = row.purchasedChaptersRaw?.trim();
    if (!purchasesRaw) {
      continue;
    }

    const parsed = parsePurchasedChapters(row.userId, purchasesRaw);
    if (!parsed.ok) {
      deps.quarantineRepo.add({
        sourceUserId: row.userId,
        field: '_purchased_chapters',
        reason: parsed.failure.reason,
        raw: parsed.failure.raw,
      });
      continue;
    }

    const deduped = new Map<string, UserFinancialPurchaseWrite>();
    for (const purchase of parsed.value) {
      if (purchase.novelId <= 0 || purchase.chapterId <= 0) {
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

    const writes = [...deduped.values()];
    for (const part of chunk(writes, chunkSize)) {
      chaptersInserted += await deps.repo.createManyPurchasedChapters(part, {
        skipDuplicates: true,
      });
    }
  }

  return {
    financialsUpdated,
    chaptersInserted,
    skippedUsers,
  };
}
