import { executeEtl } from '../etl-runner';

describe('etl-runner', () => {
  it('runs migration stages with financial snapshot import and taxonomy writes', async () => {
    const callOrder: string[] = [];

    const summary = await executeEtl({
      connect: () => {
        callOrder.push('connect');
        return Promise.resolve();
      },
      disconnect: () => {
        callOrder.push('disconnect');
        return Promise.resolve();
      },
      loadUsers: () =>
        Promise.resolve([
          {
            id: 1,
            email: 'u@example.com',
            password: 'hash',
            nickname: 'user',
            avatar: null,
            role: 'USER',
          },
        ]),
      loadProviders: () =>
        Promise.resolve([{ userId: 1, provider: 'google', providerId: 'g-1' }]),
      loadWallets: () => Promise.resolve([{ userId: 1, balance: 500 }]),
      loadUserFinancialSnapshots: () =>
        Promise.resolve([
          {
            userId: 1,
            userBalanceRaw: '500',
            userVipLevelIdRaw: '1',
            purchasedChaptersRaw: JSON.stringify([
              {
                novelId: 1,
                chapterId: 1,
                pricePaid: 10,
                purchasedAt: '2026-04-02T00:00:00.000Z',
              },
            ]),
          },
        ]),
      loadVipRows: () => Promise.resolve([]),
      loadVipLevels: () =>
        Promise.resolve([
          {
            id: 1,
            name: 'VIP 1',
            vndValue: 100000,
            kimTe: 1000,
            colorCode: null,
            iconUrl: null,
          },
        ]),
      loadTransactions: () =>
        Promise.resolve([
          {
            userId: 1,
            amountIn: 500,
            amountOut: 0,
            accumulated: 500,
            transactionDate: new Date('2026-04-01T00:00:00.000Z'),
            typeRaw: 'recharge',
            content: 'topup',
          },
        ]),
      loadNovels: () =>
        Promise.resolve([
          {
            id: 1,
            title: 'Novel 1',
            postContent: 'Body',
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
          },
        ]),
      loadChapters: () =>
        Promise.resolve([
          {
            id: 1,
            novelId: 1,
            title: 'Chapter 1',
            postContent: 'Body',
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
          },
        ]),
      loadChapterRelations: () => Promise.resolve([]),
      loadTerms: () =>
        Promise.resolve([
          { id: 11, name: 'Fantasy', slug: 'fantasy', taxonomy: 'category' },
        ]),
      loadTermRelationships: () =>
        Promise.resolve([
          { novelId: 1, termTaxonomyId: 101, termId: 11 },
          { novelId: 999, termTaxonomyId: 101, termId: 11 },
        ]),
      userRepo: {
        upsert() {
          callOrder.push('users');
          return Promise.resolve();
        },
      },
      providerRepo: {
        upsert() {
          callOrder.push('providers');
          return Promise.resolve();
        },
      },
      walletRepo: {
        upsert() {
          callOrder.push('wallets');
          return Promise.resolve();
        },
      },
      walletBackfillRepo: {
        backfillFromLegacyBalance() {
          callOrder.push('wallet-backfill');
          return Promise.resolve(1);
        },
      },
      vipLevelRepo: {
        upsert() {
          callOrder.push('vip-levels');
          return Promise.resolve();
        },
      },
      vipRepo: {
        upsert() {
          callOrder.push('vip-subscriptions');
          return Promise.resolve();
        },
      },
      userFinancialRepo: {
        upsertFinancialSnapshot() {
          callOrder.push('financial-upsert');
          return Promise.resolve();
        },
        createManyPurchasedChapters(rows) {
          callOrder.push('financial-purchases');
          return Promise.resolve(rows.length);
        },
      },
      transactionRepo: {
        upsert() {
          callOrder.push('transactions');
          return Promise.resolve();
        },
      },
      purchasedChapterRepo: {
        createMany(rows) {
          callOrder.push('legacy-chapters');
          return Promise.resolve(rows.length);
        },
      },
      termRepo: {
        upsert() {
          callOrder.push('terms');
          return Promise.resolve();
        },
      },
      novelTermRepo: {
        createMany(rows) {
          callOrder.push(`term-links:${rows.length}`);
          return Promise.resolve(rows.length);
        },
      },
      novelRepo: {
        upsert() {
          callOrder.push('novels');
          return Promise.resolve();
        },
      },
      chapterRepo: {
        upsert() {
          callOrder.push('content-chapters');
          return Promise.resolve();
        },
      },
      chunkSize: 1000,
    });

    expect(summary.stats.processedUsers).toBe(1);
    expect(summary.stats.usersUpserted).toBe(1);
    expect(summary.stats.chaptersInserted).toBe(1);
    expect(summary.stats.transactionsUpserted).toBe(1);
    expect(callOrder[0]).toBe('connect');
    expect(callOrder.includes('users')).toBe(true);
    expect(callOrder.includes('wallets')).toBe(true);
    expect(callOrder.includes('wallet-backfill')).toBe(true);
    expect(callOrder.includes('vip-levels')).toBe(true);
    expect(callOrder.includes('financial-upsert')).toBe(true);
    expect(callOrder.includes('financial-purchases')).toBe(true);
    expect(callOrder.includes('terms')).toBe(true);
    expect(callOrder.indexOf('financial-purchases')).toBeGreaterThan(
      callOrder.indexOf('content-chapters'),
    );
    expect(callOrder.includes('term-links:1')).toBe(true);
    expect(callOrder.at(-1)).toBe('disconnect');
  });

  it('keeps taxonomy link writes rerun-safe with skipDuplicates', async () => {
    const seen = new Set<string>();

    const depsFactory = () => ({
      connect: async () => undefined,
      disconnect: async () => undefined,
      loadUsers: async () => [],
      loadProviders: async () => [],
      loadWallets: async () => [],
      loadUserFinancialSnapshots: async () => [],
      loadVipRows: async () => [],
      loadVipLevels: async () => [],
      loadTransactions: async () => [],
      loadNovels: async () => [
        {
          id: 1,
          title: 'Novel 1',
          postContent: 'Body',
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      ],
      loadChapters: async () => [],
      loadChapterRelations: async () => [],
      loadTerms: async () => [
        { id: 11, name: 'Tag', slug: 'tag', taxonomy: 'post_tag' },
      ],
      loadTermRelationships: async () => [
        { novelId: 1, termTaxonomyId: 100, termId: 11 },
      ],
      userRepo: { upsert: async () => undefined },
      providerRepo: { upsert: async () => undefined },
      walletRepo: { upsert: async () => undefined },
      walletBackfillRepo: {
        backfillFromLegacyBalance: async () => 0,
      },
      vipLevelRepo: { upsert: async () => undefined },
      vipRepo: { upsert: async () => undefined },
      userFinancialRepo: {
        upsertFinancialSnapshot: async () => undefined,
        createManyPurchasedChapters: async () => 0,
      },
      transactionRepo: { upsert: async () => undefined },
      purchasedChapterRepo: { createMany: async () => 0 },
      termRepo: { upsert: async () => undefined },
      novelTermRepo: {
        createMany: async (
          rows: { novelId: number; termId: number }[],
          options: { skipDuplicates: boolean },
        ) => {
          let inserted = 0;
          for (const row of rows) {
            const key = `${row.novelId}:${row.termId}`;
            if (options.skipDuplicates && seen.has(key)) {
              continue;
            }
            seen.add(key);
            inserted += 1;
          }
          return inserted;
        },
      },
      novelRepo: { upsert: async () => undefined },
      chapterRepo: { upsert: async () => undefined },
    });

    await executeEtl(depsFactory());
    expect(seen.size).toBe(1);

    await executeEtl(depsFactory());
    expect(seen.size).toBe(1);
  });
});
