import { createHash } from 'node:crypto';

export function makeTransactionIdempotenceKey(input: {
  userId: number;
  type: string;
  transactionDate: Date;
  amountIn: number;
  amountOut: number;
  content: string | null;
}): string {
  const normalized = [
    input.userId,
    input.type,
    input.transactionDate.toISOString(),
    input.amountIn.toFixed(2),
    input.amountOut.toFixed(2),
    input.content ?? '',
  ].join('|');

  return createHash('sha256').update(normalized).digest('hex');
}

export function makeUserChapterKey(userId: number, chapterId: number): string {
  return `${userId}:${chapterId}`;
}

export function shouldSkipUser(
  sourceUserId: number,
  quarantinedUserIds: ReadonlySet<number>,
): boolean {
  return quarantinedUserIds.has(sourceUserId);
}
