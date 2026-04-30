import { migrateUsers } from '../migrate-users';

describe('migrateUsers', () => {
  it('upserts allowed users and skips quarantined users', async () => {
    const usersUpserted: number[] = [];
    const providersUpserted: string[] = [];
    const walletsUpserted: number[] = [];

    const result = await migrateUsers(
      {
        users: [
          {
            id: 1,
            email: 'a@example.com',
            password: 'hash-a',
            nickname: 'A',
            avatar: null,
            role: 'USER',
          },
          {
            id: 2,
            email: 'b@example.com',
            password: 'hash-b',
            nickname: 'B',
            avatar: null,
            role: 'USER',
          },
        ],
        providers: [
          { userId: 1, provider: 'google', providerId: 'ga' },
          { userId: 2, provider: 'google', providerId: 'gb' },
        ],
        wallets: [
          { userId: 1, balance: 100 },
          { userId: 2, balance: 200 },
        ],
      },
      {
        userRepo: {
          upsert(user) {
            usersUpserted.push(user.id);
            return Promise.resolve();
          },
        },
        providerRepo: {
          upsert(provider) {
            providersUpserted.push(provider.providerId);
            return Promise.resolve();
          },
        },
        walletRepo: {
          upsert(wallet) {
            walletsUpserted.push(wallet.userId);
            return Promise.resolve();
          },
        },
        quarantinedUserIds: new Set([2]),
      },
    );

    expect(result.processedUsers).toBe(2);
    expect(result.skippedUsers).toBe(1);
    expect(result.usersUpserted).toBe(1);
    expect(usersUpserted).toEqual([1]);
    expect(providersUpserted).toEqual(['ga']);
    expect(walletsUpserted).toEqual([1]);
  });
});
