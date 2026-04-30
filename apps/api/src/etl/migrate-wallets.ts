import type { SourceWalletRow } from './types';

export type WalletUpsertInput = {
  userId: number;
  balance: number;
};

export interface WalletRepo {
  upsert(input: WalletUpsertInput): Promise<void>;
}

export async function migrateWallets(
  rows: SourceWalletRow[],
  repo: WalletRepo,
): Promise<number> {
  for (const row of rows) {
    await repo.upsert({
      userId: row.userId,
      balance: row.balance,
    });
  }
  return rows.length;
}
