import type { SourceProviderRow } from './types';

export type ProviderUpsertInput = {
  userId: number;
  provider: string;
  providerId: string;
};

export interface ProviderRepo {
  upsert(input: ProviderUpsertInput): Promise<void>;
}

export async function migrateProviders(
  rows: SourceProviderRow[],
  repo: ProviderRepo,
): Promise<number> {
  for (const row of rows) {
    await repo.upsert({
      userId: row.userId,
      provider: row.provider,
      providerId: row.providerId,
    });
  }
  return rows.length;
}
