import { executeEtl } from '../etl-runner';
import type {
  SourceChapterContentRow,
  SourceNovelRow,
  SourceProviderRow,
  SourceTransactionRow,
  SourceUserFinancialSnapshotRow,
  SourceUserRow,
  SourceWalletRow,
} from '../types';

describe('etl integration: content migration', () => {
  function buildBaseDeps(input: {
    novels: SourceNovelRow[];
    chapters: SourceChapterContentRow[];
  }) {
    const novelCalls: SourceNovelRow[] = [];
    const chapterCalls: SourceChapterContentRow[] = [];

    const users: SourceUserRow[] = [
      {
        id: 1,
        email: 'u@example.com',
        password: 'hash',
        nickname: 'user',
        avatar: null,
        role: 'USER',
      },
    ];

    const providers: SourceProviderRow[] = [
      { userId: 1, provider: 'google', providerId: 'g-1' },
    ];

    const wallets: SourceWalletRow[] = [{ userId: 1, balance: 500 }];

    const financialSnapshots: SourceUserFinancialSnapshotRow[] = [
      {
        userId: 1,
        userBalanceRaw: '500',
        userVipLevelIdRaw: '1',
        purchasedChaptersRaw: null,
      },
    ];

    const transactions: SourceTransactionRow[] = [
      {
        userId: 1,
        amountIn: 500,
        amountOut: 0,
        accumulated: 500,
        transactionDate: new Date('2026-04-01T00:00:00.000Z'),
        typeRaw: 'recharge',
        content: 'topup',
      },
    ];

    return {
      deps: {
        connect: async () => {},
        disconnect: async () => {},
        loadUsers: async () => users,
        loadProviders: async () => providers,
        loadWallets: async () => wallets,
        loadUserFinancialSnapshots: async () => financialSnapshots,
        loadVipRows: async () => [],
        loadVipLevels: async () => [
          {
            id: 1,
            name: 'VIP 1',
            vndValue: 100000,
            kimTe: 1000,
            colorCode: null,
            iconUrl: null,
          },
        ],
        loadTransactions: async () => transactions,
        loadNovels: async () => input.novels,
        loadChapters: async () => input.chapters,
        loadChapterRelations: async () =>
          input.chapters.map((c) => ({ chapterId: c.id, novelId: c.novelId })),
        loadTerms: async () => [],
        loadTermRelationships: async () => [],
        userRepo: { upsert: async () => {} },
        providerRepo: { upsert: async () => {} },
        walletRepo: { upsert: async () => {} },
        walletBackfillRepo: { backfillFromLegacyBalance: async () => 0 },
        vipLevelRepo: { upsert: async () => {} },
        vipRepo: { upsert: async () => {} },
        userFinancialRepo: {
          upsertFinancialSnapshot: async () => undefined,
          createManyPurchasedChapters: async (rows: unknown[]) => rows.length,
        },
        transactionRepo: { upsert: async () => {} },
        purchasedChapterRepo: {
          createMany: async (rows: unknown[]) => rows.length,
        },
        termRepo: { upsert: async () => {} },
        novelTermRepo: { createMany: async (rows: unknown[]) => rows.length },
        novelRepo: {
          upsert: async (novel: SourceNovelRow) => {
            novelCalls.push(novel);
          },
        },
        chapterRepo: {
          upsert: async (chapter: SourceChapterContentRow) => {
            chapterCalls.push(chapter);
          },
        },
      },
      novelCalls,
      chapterCalls,
    };
  }

  it('imports novels preserving exact IDs and raw content', async () => {
    const novels: SourceNovelRow[] = [
      {
        id: 12345,
        title: 'Test Novel',
        postContent: '<p>Raw HTML content</p>',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    const { deps, novelCalls } = buildBaseDeps({ novels, chapters: [] });
    const summary = await executeEtl(deps);

    expect(novelCalls).toHaveLength(1);
    expect(novelCalls[0]).toEqual(novels[0]);
    expect(summary.stats.novelUpserted).toBe(1);
    expect(summary.stats.chapterUpserted).toBe(0);
  });

  it('imports chapters preserving parent novelId', async () => {
    const novels: SourceNovelRow[] = [
      {
        id: 12345,
        title: 'Parent Novel',
        postContent: '<p>Novel</p>',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    const chapters: SourceChapterContentRow[] = [
      {
        id: 2001,
        novelId: 12345,
        title: 'Chapter 1',
        postContent: '<p>Chapter body</p>',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ];

    const { deps, chapterCalls } = buildBaseDeps({ novels, chapters });
    const summary = await executeEtl(deps);

    expect(chapterCalls).toHaveLength(1);
    expect(chapterCalls[0].id).toBe(2001);
    expect(chapterCalls[0].novelId).toBe(12345);
    expect(chapterCalls[0].postContent).toBe('<p>Chapter body</p>');
    expect(summary.stats.novelUpserted).toBe(1);
    expect(summary.stats.chapterUpserted).toBe(1);
  });

  it('imports multiple novels and chapters and reports aggregated content stats', async () => {
    const novels: SourceNovelRow[] = [
      {
        id: 10,
        title: 'N1',
        postContent: '<p>N1</p>',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 11,
        title: 'N2',
        postContent: '<p>N2</p>',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    const chapters: SourceChapterContentRow[] = [
      {
        id: 101,
        novelId: 10,
        title: 'C1',
        postContent: '<p>C1</p>',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
      {
        id: 102,
        novelId: 11,
        title: 'C2',
        postContent: '<p>C2</p>',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    ];

    const { deps, novelCalls, chapterCalls } = buildBaseDeps({
      novels,
      chapters,
    });
    const summary = await executeEtl(deps);

    expect(novelCalls).toHaveLength(2);
    expect(chapterCalls).toHaveLength(2);
    expect(summary.stats.novelUpserted).toBe(2);
    expect(summary.stats.chapterUpserted).toBe(2);
  });
});
