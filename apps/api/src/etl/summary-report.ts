import type { MigrationStats } from './types';

export type EtlRunSummary = {
  stats: MigrationStats;
  quarantineReasons: Record<string, number>;
};

export function createEmptyStats(): MigrationStats {
  return {
    processedUsers: 0,
    skippedUsers: 0,
    usersUpserted: 0,
    providersUpserted: 0,
    walletsUpserted: 0,
    vipUpserted: 0,
    transactionsUpserted: 0,
    chaptersInserted: 0,
    novelUpserted: 0,
    chapterUpserted: 0,
    quarantinedUsers: 0,
  };
}

export function mergeStats(
  base: MigrationStats,
  incoming: Partial<MigrationStats>,
): MigrationStats {
  return {
    processedUsers: base.processedUsers + (incoming.processedUsers ?? 0),
    skippedUsers: base.skippedUsers + (incoming.skippedUsers ?? 0),
    usersUpserted: base.usersUpserted + (incoming.usersUpserted ?? 0),
    providersUpserted:
      base.providersUpserted + (incoming.providersUpserted ?? 0),
    walletsUpserted: base.walletsUpserted + (incoming.walletsUpserted ?? 0),
    vipUpserted: base.vipUpserted + (incoming.vipUpserted ?? 0),
    transactionsUpserted:
      base.transactionsUpserted + (incoming.transactionsUpserted ?? 0),
    chaptersInserted: base.chaptersInserted + (incoming.chaptersInserted ?? 0),
    novelUpserted: base.novelUpserted + (incoming.novelUpserted ?? 0),
    chapterUpserted: base.chapterUpserted + (incoming.chapterUpserted ?? 0),
    quarantinedUsers: base.quarantinedUsers + (incoming.quarantinedUsers ?? 0),
  };
}

export function formatSummary(summary: EtlRunSummary): string {
  const lines = [
    'ETL Migration Summary',
    `Processed users: ${summary.stats.processedUsers}`,
    `Skipped users: ${summary.stats.skippedUsers}`,
    `Users upserted: ${summary.stats.usersUpserted}`,
    `Providers upserted: ${summary.stats.providersUpserted}`,
    `Wallets upserted: ${summary.stats.walletsUpserted}`,
    `VIP upserted: ${summary.stats.vipUpserted}`,
    `Transactions upserted: ${summary.stats.transactionsUpserted}`,
    `Chapters inserted: ${summary.stats.chaptersInserted}`,
    `Novels upserted: ${summary.stats.novelUpserted}`,
    `Chapters upserted: ${summary.stats.chapterUpserted}`,
    `Quarantined users: ${summary.stats.quarantinedUsers}`,
    '',
    'Quarantine Reasons:',
    ...Object.entries(summary.quarantineReasons).map(
      ([reason, count]) => `  ${reason}: ${count}`,
    ),
  ];
  return lines.join('\n');
}
