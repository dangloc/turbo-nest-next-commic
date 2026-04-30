import { serialize } from 'php-serialize';
import { createSourceLoaders } from '../source-mysql-loaders';
import { QuarantineRepository } from '../quarantine-repository';
import { migrateUserFinancials } from '../migrate-user-financials';

describe('migrate-user-financials', () => {
  it('uses one wp_usermeta pivot query for financial snapshot extraction', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        user_id: 1,
        user_balance: '200',
        user_vip_level_id: '3',
        purchased_chapters: 'a:0:{}',
      },
    ]);

    const loaders = createSourceLoaders({ query } as any);
    const rows = await loaders.loadUserFinancialSnapshots();

    expect(rows).toEqual([
      {
        userId: 1,
        userBalanceRaw: '200',
        userVipLevelIdRaw: '3',
        purchasedChaptersRaw: 'a:0:{}',
      },
    ]);

    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("MAX(CASE WHEN meta_key = '_user_balance' THEN meta_value END)");
    expect(sql).toContain("MAX(CASE WHEN meta_key = '_user_vip_level_id' THEN meta_value END)");
    expect(sql).toContain("MAX(CASE WHEN meta_key = '_purchased_chapters' THEN meta_value END)");
    expect(sql).toContain('GROUP BY user_id');
    expect(sql).not.toContain('wp_users.price');
    expect(sql).not.toContain('wp_users u');
    expect(sql).not.toContain('u.vip_level_id');
  });

  it('parses integer financial values and bulk inserts unserialized purchases', async () => {
    const quarantineRepo = new QuarantineRepository();
    const upsertFinancialSnapshot = jest.fn().mockResolvedValue(undefined);
    const createManyPurchasedChapters = jest.fn().mockResolvedValue(1);

    const serialized = serialize({
      0: {
        truyen_id: 9,
        chapter_id: 3,
        price: '15',
        purchase_date: '2026-04-10T00:00:00.000Z',
      },
    });

    const result = await migrateUserFinancials(
      [
        {
          userId: 7,
          userBalanceRaw: '1200.88',
          userVipLevelIdRaw: '2',
          purchasedChaptersRaw: serialized,
        },
      ],
      {
        repo: {
          upsertFinancialSnapshot,
          createManyPurchasedChapters,
        },
        quarantineRepo,
        quarantinedUserIds: new Set<number>(),
        validUserIds: new Set<number>([7]),
      },
    );

    expect(upsertFinancialSnapshot).toHaveBeenCalledWith({
      userId: 7,
      balance: 1200.88,
      vipLevelId: 2,
    });
    expect(createManyPurchasedChapters).toHaveBeenCalledTimes(1);
    expect(createManyPurchasedChapters.mock.calls[0][1]).toEqual({
      skipDuplicates: true,
    });

    const inserted = createManyPurchasedChapters.mock.calls[0][0][0];
    expect(inserted.userId).toBe(7);
    expect(inserted.novelId).toBe(9);
    expect(inserted.chapterId).toBe(3);
    expect(inserted.pricePaid).toBe(15);
    expect(inserted.purchasedAt).toBeInstanceOf(Date);

    expect(result).toEqual({
      financialsUpdated: 1,
      chaptersInserted: 1,
      skippedUsers: 0,
    });
  });
});
