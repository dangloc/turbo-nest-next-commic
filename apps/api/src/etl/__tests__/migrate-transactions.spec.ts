import {
  mapLegacyTransactionType,
  migrateTransactions,
} from '../migrate-transactions';
import { QuarantineRepository } from '../quarantine-repository';

describe('migrate-transactions', () => {
  it('maps legacy transaction types', () => {
    expect(mapLegacyTransactionType('buy_chapter')).toBe('PURCHASE_CHAPTER');
    expect(mapLegacyTransactionType('vip_upgrade')).toBe('PURCHASE_VIP');
    expect(mapLegacyTransactionType('combo_sale')).toBe('COMBO_PURCHASE');
    expect(mapLegacyTransactionType('recharge')).toBe('DEPOSIT');
  });

  it('deduplicates rerun-equivalent transactions', async () => {
    const writes: string[] = [];
    const now = new Date('2026-04-05T00:00:00.000Z');

    const result = await migrateTransactions(
      [
        {
          userId: 1,
          amountIn: 10,
          amountOut: 0,
          accumulated: 10,
          transactionDate: now,
          typeRaw: 'recharge',
          content: 'wallet topup',
        },
        {
          userId: 1,
          amountIn: 10,
          amountOut: 0,
          accumulated: 10,
          transactionDate: now,
          typeRaw: 'recharge',
          content: 'wallet topup',
        },
      ],
      {
        repo: {
          upsert(tx) {
            writes.push(tx.key);
            return Promise.resolve();
          },
        },
        quarantinedUserIds: new Set(),
        validUserIds: new Set([1]),
        quarantineRepo: new QuarantineRepository(),
      },
    );

    expect(result.transactionsUpserted).toBe(1);
    expect(writes).toHaveLength(1);
  });

  it('quarantines unresolved transaction rows', async () => {
    const quarantineRepo = new QuarantineRepository();
    const result = await migrateTransactions(
      [
        {
          sourceTransactionId: 64,
          userId: 0,
          amountIn: 100,
          amountOut: 0,
          accumulated: 100,
          transactionDate: new Date('2026-04-05T00:00:00.000Z'),
          typeRaw: 'recharge',
          content: 'Loi cong',
          accountNumber: null,
          subAccount: null,
        },
      ],
      {
        repo: {
          upsert() {
            return Promise.resolve();
          },
        },
        quarantinedUserIds: new Set(),
        validUserIds: new Set([1]),
        quarantineRepo,
      },
    );

    expect(result.transactionsUpserted).toBe(0);
    expect(result.skippedUsers).toBe(1);
    expect(quarantineRepo.all()).toHaveLength(1);
    expect(quarantineRepo.all()[0].field).toBe('mapping');
  });

  it('replays unresolved rows when manual override exists', async () => {
    const writes: Array<{ userId: number; key: string }> = [];

    const result = await migrateTransactions(
      [
        {
          sourceTransactionId: 64,
          userId: 0,
          amountIn: 100,
          amountOut: 0,
          accumulated: 100,
          transactionDate: new Date('2026-04-05T00:00:00.000Z'),
          typeRaw: 'recharge',
          content: 'Loi cong',
          accountNumber: null,
          subAccount: null,
        },
      ],
      {
        repo: {
          upsert(tx) {
            writes.push({ userId: tx.userId, key: tx.key });
            return Promise.resolve();
          },
        },
        quarantinedUserIds: new Set(),
        validUserIds: new Set([1]),
        quarantineRepo: new QuarantineRepository(),
        transactionUserOverrides: new Map([[64, 1]]),
      },
    );

    expect(result.transactionsUpserted).toBe(1);
    expect(result.skippedUsers).toBe(0);
    expect(writes).toHaveLength(1);
    expect(writes[0].userId).toBe(1);
  });
});
