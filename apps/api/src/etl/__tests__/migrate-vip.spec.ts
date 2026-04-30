import { migrateVipSubscriptions } from '../migrate-vip';
import { QuarantineRepository } from '../quarantine-repository';

describe('migrate-vip', () => {
  it('maps legacy vip_2_months and vip_3_months to the old one/two month durations', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const quarantineRepo = new QuarantineRepository();

    await migrateVipSubscriptions(
      [
        {
          userId: 10,
          vipLevelId: 1,
          vipPackageRaw: JSON.stringify({
            packageType: 'vip_2_months',
            isActive: true,
            purchaseDate: '2026-04-01T00:00:00.000Z',
          }),
        },
        {
          userId: 11,
          vipLevelId: 1,
          vipPackageRaw: JSON.stringify({
            packageType: 'vip_3_months',
            isActive: true,
            purchaseDate: '2026-04-01T00:00:00.000Z',
          }),
        },
      ],
      {
        repo: { upsert },
        quarantinedUserIds: new Set<number>(),
        quarantineRepo,
      },
    );

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].expiresAt).toEqual(
      new Date('2026-05-01T00:00:00.000Z'),
    );
    expect(upsert.mock.calls[1][0].expiresAt).toEqual(
      new Date('2026-06-01T00:00:00.000Z'),
    );
  });

  it('quarantines malformed vip packages without blocking other user financial imports', async () => {
    const quarantineRepo = new QuarantineRepository();
    const quarantinedUserIds = new Set<number>();

    const result = await migrateVipSubscriptions(
      [
        {
          userId: 12,
          vipLevelId: 1,
          vipPackageRaw: 'not-serialized',
        },
      ],
      {
        repo: { upsert: jest.fn().mockResolvedValue(undefined) },
        quarantinedUserIds,
        quarantineRepo,
      },
    );

    expect(result).toEqual({ vipUpserted: 0, skippedUsers: 1 });
    expect(quarantinedUserIds.has(12)).toBe(false);
    expect(quarantineRepo.all()).toHaveLength(1);
  });

  it('skips inactive vip package shells without quarantining the user', async () => {
    const quarantineRepo = new QuarantineRepository();

    const result = await migrateVipSubscriptions(
      [
        {
          userId: 13,
          vipLevelId: 0,
          vipPackageRaw: JSON.stringify({ is_active: false }),
        },
      ],
      {
        repo: { upsert: jest.fn().mockResolvedValue(undefined) },
        quarantinedUserIds: new Set<number>(),
        quarantineRepo,
      },
    );

    expect(result).toEqual({ vipUpserted: 0, skippedUsers: 1 });
    expect(quarantineRepo.all()).toHaveLength(0);
  });
});
