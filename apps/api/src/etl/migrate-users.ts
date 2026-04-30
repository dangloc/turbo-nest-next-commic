import { shouldSkipUser } from './idempotence';
import { migrateProviders, type ProviderRepo } from './migrate-providers';
import { migrateWallets, type WalletRepo } from './migrate-wallets';
import type {
  SourceProviderRow,
  SourceUserRow,
  SourceWalletRow,
} from './types';

export interface UserRepo {
  upsert(user: SourceUserRow): Promise<void>;
}

export type UserBatch = {
  users: SourceUserRow[];
  providers: SourceProviderRow[];
  wallets: SourceWalletRow[];
};

export type UserMigrationResult = {
  processedUsers: number;
  skippedUsers: number;
  usersUpserted: number;
  providersUpserted: number;
  walletsUpserted: number;
};

export async function migrateUsers(
  batch: UserBatch,
  deps: {
    userRepo: UserRepo;
    providerRepo: ProviderRepo;
    walletRepo: WalletRepo;
    quarantinedUserIds: ReadonlySet<number>;
  },
): Promise<UserMigrationResult> {
  const allowedUsers = batch.users.filter(
    (user) => !shouldSkipUser(user.id, deps.quarantinedUserIds),
  );

  for (const user of allowedUsers) {
    await deps.userRepo.upsert(user);
  }

  const allowedUserIds = new Set(allowedUsers.map((u) => u.id));

  const allowedProviders = batch.providers.filter((p) =>
    allowedUserIds.has(p.userId),
  );
  const allowedWallets = batch.wallets.filter((w) =>
    allowedUserIds.has(w.userId),
  );

  const providersUpserted = await migrateProviders(
    allowedProviders,
    deps.providerRepo,
  );
  const walletsUpserted = await migrateWallets(allowedWallets, deps.walletRepo);

  return {
    processedUsers: batch.users.length,
    skippedUsers: batch.users.length - allowedUsers.length,
    usersUpserted: allowedUsers.length,
    providersUpserted,
    walletsUpserted,
  };
}
