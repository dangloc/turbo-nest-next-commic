import { makeTransactionIdempotenceKey, shouldSkipUser } from './idempotence';
import type { QuarantineRepository } from './quarantine-repository';
import type { SourceTransactionRow } from './types';

export type NormalizedTransactionType =
  | 'DEPOSIT'
  | 'PURCHASE_CHAPTER'
  | 'PURCHASE_VIP'
  | 'COMBO_PURCHASE';

export type TransactionUpsertInput = {
  key: string;
  userId: number;
  amountIn: number;
  amountOut: number;
  accumulated: number;
  type: NormalizedTransactionType;
  transactionDate: Date;
  content: string | null;
};

export interface TransactionRepo {
  upsert(input: TransactionUpsertInput): Promise<void>;
}

export function mapLegacyTransactionType(
  raw: string,
): NormalizedTransactionType {
  const value = raw.toLowerCase();
  if (value.includes('chapter')) return 'PURCHASE_CHAPTER';
  if (value.includes('vip')) return 'PURCHASE_VIP';
  if (value.includes('combo')) return 'COMBO_PURCHASE';
  return 'DEPOSIT';
}

export async function migrateTransactions(
  rows: SourceTransactionRow[],
  deps: {
    repo: TransactionRepo;
    quarantinedUserIds: ReadonlySet<number>;
    validUserIds: ReadonlySet<number>;
    quarantineRepo: QuarantineRepository;
    transactionUserOverrides?: ReadonlyMap<number, number>;
  },
): Promise<{ transactionsUpserted: number; skippedUsers: number }> {
  let transactionsUpserted = 0;
  let skippedUsers = 0;
  const seenKeys = new Set<string>();

  for (const row of rows) {
    const overrideUserId =
      row.sourceTransactionId && deps.transactionUserOverrides
        ? deps.transactionUserOverrides.get(row.sourceTransactionId)
        : undefined;

    const effectiveUserId = overrideUserId ?? row.userId;

    if (effectiveUserId <= 0 || !deps.validUserIds.has(effectiveUserId)) {
      deps.quarantineRepo.add({
        sourceUserId: effectiveUserId > 0 ? effectiveUserId : -1,
        field: 'mapping',
        reason: 'Unresolved transaction user mapping',
        raw: {
          sourceTransactionId: row.sourceTransactionId ?? null,
          content: row.content,
          accountNumber: row.accountNumber ?? null,
          subAccount: row.subAccount ?? null,
          typeRaw: row.typeRaw,
          amountIn: row.amountIn,
          amountOut: row.amountOut,
          transactionDate: row.transactionDate.toISOString(),
        },
      });
      skippedUsers += 1;
      continue;
    }

    if (shouldSkipUser(effectiveUserId, deps.quarantinedUserIds)) {
      skippedUsers += 1;
      continue;
    }

    const type = mapLegacyTransactionType(row.typeRaw);
    const key = makeTransactionIdempotenceKey({
      userId: effectiveUserId,
      type,
      transactionDate: row.transactionDate,
      amountIn: row.amountIn,
      amountOut: row.amountOut,
      content: row.content,
    });

    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    await deps.repo.upsert({
      key,
      userId: effectiveUserId,
      amountIn: row.amountIn,
      amountOut: row.amountOut,
      accumulated: row.accumulated,
      type,
      transactionDate: row.transactionDate,
      content: row.content,
    });
    transactionsUpserted += 1;
  }

  return { transactionsUpserted, skippedUsers };
}
