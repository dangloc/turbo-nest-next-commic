import { loadEtlConfig } from './config';
import { migrateChapters, migrateNovels } from './migrate-content';
import { migrateTransactions } from './migrate-transactions';
import { migrateUsers } from './migrate-users';
import { migrateUserFinancials } from './migrate-user-financials';
import { migrateVipSubscriptions } from './migrate-vip';
import { QuarantineRepository } from './quarantine-repository';
import {
  createEmptyStats,
  formatSummary,
  mergeStats,
  type EtlRunSummary,
} from './summary-report';
import type {
  ChapterRelation,
  SourceChapterContentRow,
  SourceNovelRow,
  SourceProviderRow,
  SourceTermRelationshipRow,
  SourceTermRow,
  SourceTransactionRow,
  SourceUserFinancialSnapshotRow,
  SourceUserRow,
  SourceVipLevelRow,
  SourceVipRow,
  SourceWalletRow,
} from './types';

export type EtlRunnerDeps = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  loadUsers: () => Promise<SourceUserRow[]>;
  loadProviders: () => Promise<SourceProviderRow[]>;
  loadWallets: () => Promise<SourceWalletRow[]>;
  loadUserFinancialSnapshots: () => Promise<SourceUserFinancialSnapshotRow[]>;
  loadVipRows: () => Promise<SourceVipRow[]>;
  loadVipLevels: () => Promise<SourceVipLevelRow[]>;
  loadTransactions: () => Promise<SourceTransactionRow[]>;
  loadNovels: () => Promise<SourceNovelRow[]>;
  loadChapters: () => Promise<SourceChapterContentRow[]>;
  loadChapterRelations: () => Promise<ChapterRelation[]>;
  loadTerms: () => Promise<SourceTermRow[]>;
  loadTermRelationships: () => Promise<SourceTermRelationshipRow[]>;
  userRepo: { upsert: (user: SourceUserRow) => Promise<void> };
  providerRepo: {
    upsert: (input: {
      userId: number;
      provider: string;
      providerId: string;
    }) => Promise<void>;
  };
  walletRepo: {
    upsert: (input: { userId: number; balance: number }) => Promise<void>;
  };
  walletBackfillRepo: {
    backfillFromLegacyBalance: (input: {
      userId: number;
      legacyBalance: number;
    }) => Promise<number>;
  };
  vipLevelRepo: {
    upsert: (input: SourceVipLevelRow) => Promise<void>;
  };
  vipRepo: {
    upsert: (input: {
      userId: number;
      vipLevelId: number;
      packageType: string;
      isActive: boolean;
      purchaseDate: Date;
      expiresAt: Date | null;
    }) => Promise<void>;
  };
  userFinancialRepo: {
    upsertFinancialSnapshot: (input: {
      userId: number;
      balance: number | null;
      vipLevelId: number | null;
    }) => Promise<void>;
    createManyPurchasedChapters: (
      rows: {
        userId: number;
        novelId: number;
        chapterId: number;
        pricePaid: number;
        purchasedAt: Date;
      }[],
      options: { skipDuplicates: boolean },
    ) => Promise<number>;
  };
  transactionRepo: {
    upsert: (input: {
      key: string;
      userId: number;
      amountIn: number;
      amountOut: number;
      accumulated: number;
      type: 'DEPOSIT' | 'PURCHASE_CHAPTER' | 'PURCHASE_VIP' | 'COMBO_PURCHASE';
      transactionDate: Date;
      content: string | null;
    }) => Promise<void>;
  };
  purchasedChapterRepo: {
    createMany: (
      rows: {
        userId: number;
        novelId: number;
        chapterId: number;
        pricePaid: number;
        purchasedAt: Date;
      }[],
      options: { skipDuplicates: boolean },
    ) => Promise<number>;
  };
  termRepo: {
    upsert: (term: SourceTermRow) => Promise<void>;
  };
  novelTermRepo: {
    createMany: (
      rows: { novelId: number; termId: number }[],
      options: { skipDuplicates: boolean },
    ) => Promise<number>;
  };
  novelRepo: {
    upsert: (novel: {
      id: number;
      title: string;
      postContent: string;
      createdAt: Date;
    }) => Promise<void>;
  };
  chapterRepo: {
    upsert: (chapter: {
      id: number;
      novelId: number;
      title: string;
      postContent: string;
      createdAt: Date;
    }) => Promise<void>;
  };
  quarantineRepo?: QuarantineRepository;
  chunkSize?: number;
  transactionUserOverrides?: ReadonlyMap<number, number>;
};

export async function executeEtl(deps: EtlRunnerDeps): Promise<EtlRunSummary> {
  await deps.connect();
  const quarantineRepo = deps.quarantineRepo ?? new QuarantineRepository();
  const quarantinedUserIds = new Set<number>();

  try {
    const [
      users,
      providers,
      wallets,
      userFinancialSnapshots,
      vipRows,
      vipLevels,
      transactions,
      novels,
      chapters,
      _chapterRelations,
      terms,
      termRelationships,
    ] = await Promise.all([
      deps.loadUsers(),
      deps.loadProviders(),
      deps.loadWallets(),
      deps.loadUserFinancialSnapshots(),
      deps.loadVipRows(),
      deps.loadVipLevels(),
      deps.loadTransactions(),
      deps.loadNovels(),
      deps.loadChapters(),
      deps.loadChapterRelations(),
      deps.loadTerms(),
      deps.loadTermRelationships(),
    ]);

    const validUserIds = new Set(users.map((u) => u.id));

    let stats = createEmptyStats();

    const usersResult = await migrateUsers(
      { users, providers, wallets },
      {
        userRepo: deps.userRepo,
        providerRepo: deps.providerRepo,
        walletRepo: deps.walletRepo,
        quarantinedUserIds,
      },
    );

    stats = mergeStats(stats, usersResult);

    await Promise.all(vipLevels.map((row) => deps.vipLevelRepo.upsert(row)));

    const vipResult = await migrateVipSubscriptions(
      vipRows.filter((row) => validUserIds.has(row.userId)),
      {
        repo: deps.vipRepo,
        quarantineRepo,
        quarantinedUserIds,
      },
    );
    stats = mergeStats(stats, vipResult);

    const walletBackfilled = (
      await Promise.all(
        wallets
          .filter((wallet) => validUserIds.has(wallet.userId))
          .map((wallet) =>
            deps.walletBackfillRepo.backfillFromLegacyBalance({
              userId: wallet.userId,
              legacyBalance: wallet.balance,
            }),
          ),
      )
    ).reduce((sum, count) => sum + count, 0);

    stats = mergeStats(stats, {
      walletsUpserted: walletBackfilled,
    });

    const txResult = await migrateTransactions(transactions, {
      repo: deps.transactionRepo,
      quarantinedUserIds,
      validUserIds,
      quarantineRepo,
      transactionUserOverrides: deps.transactionUserOverrides,
    });
    stats = mergeStats(stats, txResult);

    const novelsResult = await migrateNovels(novels, {
      repo: deps.novelRepo,
    });

    const loadedNovelIds = new Set(novels.map((row) => row.id));

    await Promise.all(terms.map((term) => deps.termRepo.upsert(term)));
    const loadedTermIds = new Set(terms.map((row) => row.id));

    const taxonomyLinks = termRelationships
      .filter(
        (row) =>
          loadedNovelIds.has(row.novelId) && loadedTermIds.has(row.termId),
      )
      .map((row) => ({ novelId: row.novelId, termId: row.termId }));

    await deps.novelTermRepo.createMany(taxonomyLinks, {
      skipDuplicates: true,
    });

    const chaptersWithExistingNovel = chapters.filter((row) =>
      loadedNovelIds.has(row.novelId),
    );

    const chaptersResult = await migrateChapters(chaptersWithExistingNovel, {
      repo: deps.chapterRepo,
    });

    stats = mergeStats(stats, {
      novelUpserted: novelsResult.novelsUpserted,
      chapterUpserted: chaptersResult.chaptersUpserted,
    });

    const financialRows = userFinancialSnapshots.filter((row) =>
      validUserIds.has(row.userId),
    );

    // Purchased chapter rows require novels/chapters to exist first for FK safety.
    const financialResult = await migrateUserFinancials(financialRows, {
      repo: deps.userFinancialRepo,
      quarantineRepo,
      quarantinedUserIds,
      validUserIds,
      chunkSize: deps.chunkSize,
    });
    stats = mergeStats(stats, {
      walletsUpserted: financialResult.financialsUpdated,
      vipUpserted: financialResult.financialsUpdated,
      chaptersInserted: financialResult.chaptersInserted,
      skippedUsers: financialResult.skippedUsers,
    });

    stats = mergeStats(stats, {
      quarantinedUsers: quarantineRepo.all().length,
    });

    const reasons = quarantineRepo
      .all()
      .reduce<Record<string, number>>((acc, row) => {
        acc[row.field] = (acc[row.field] ?? 0) + 1;
        return acc;
      }, {});

    return {
      stats,
      quarantineReasons: reasons,
    };
  } finally {
    await deps.disconnect();
  }
}

export async function runAndPrint(deps: EtlRunnerDeps): Promise<void> {
  const summary = await executeEtl(deps);
  console.log(formatSummary(summary));
}

export function getRuntimeChunkSizeFromEnv(): number {
  return loadEtlConfig().runtime.chunkSize;
}
