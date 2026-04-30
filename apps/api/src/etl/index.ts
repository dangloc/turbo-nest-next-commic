import { loadEtlConfig } from './config';
import { executeEtl } from './etl-runner';
import { createMySqlClient } from './mysql-client';
import {
  connectPrisma,
  createPrismaClient,
  disconnectPrisma,
} from './prisma-client';
import { createPrismaRepositories } from './prisma-repositories';
import { QuarantineRepository } from './quarantine-repository';
import { formatSummary } from './summary-report';
import { createSourceLoaders } from './source-mysql-loaders';
import { loadTransactionUserOverrides } from './transaction-overrides';

export async function runEtlCli(): Promise<void> {
  const config = loadEtlConfig();
  const mysql = createMySqlClient(config);
  const prisma = createPrismaClient(config);
  const sourceLoaders = createSourceLoaders(mysql);
  const repos = createPrismaRepositories(prisma);
  const quarantineRepo = new QuarantineRepository();
  const transactionUserOverrides = loadTransactionUserOverrides(
    config.runtime.transactionOverridesPath,
  );

  const summary = await executeEtl({
    connect: async () => {
      await mysql.connect();
      await connectPrisma(prisma);
    },
    disconnect: async () => {
      await disconnectPrisma(prisma);
      await mysql.disconnect();
    },
    loadUsers: sourceLoaders.loadUsers,
    loadProviders: sourceLoaders.loadProviders,
    loadWallets: sourceLoaders.loadWallets,
    loadUserFinancialSnapshots: sourceLoaders.loadUserFinancialSnapshots,
    loadVipRows: sourceLoaders.loadVipRows,
    loadVipLevels: sourceLoaders.loadVipLevels,
    loadTransactions: sourceLoaders.loadTransactions,
    loadNovels: sourceLoaders.loadNovels,
    loadChapters: sourceLoaders.loadChapters,
    loadChapterRelations: sourceLoaders.loadChapterRelations,
    loadTerms: sourceLoaders.loadTerms,
    loadTermRelationships: sourceLoaders.loadTermRelationships,
    userRepo: repos.userRepo,
    providerRepo: repos.providerRepo,
    walletRepo: repos.walletRepo,
    walletBackfillRepo: repos.walletBackfillRepo,
    vipLevelRepo: repos.vipLevelRepo,
    vipRepo: repos.vipRepo,
    userFinancialRepo: repos.userFinancialRepo,
    transactionRepo: repos.transactionRepo,
    purchasedChapterRepo: repos.purchasedChapterRepo,
    novelRepo: repos.novelRepo,
    chapterRepo: repos.chapterRepo,
    termRepo: repos.termRepo,
    novelTermRepo: repos.novelTermRepo,
    chunkSize: config.runtime.chunkSize,
    quarantineRepo,
    transactionUserOverrides,
  });

  await quarantineRepo.persist(config.runtime.quarantinePath);

  console.log(formatSummary(summary));
  console.log(`Quarantine output: ${config.runtime.quarantinePath}`);
  console.log(`Transaction overrides loaded: ${transactionUserOverrides.size}`);
}

void runEtlCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ETL failed: ${message}`);
  process.exitCode = 1;
});
