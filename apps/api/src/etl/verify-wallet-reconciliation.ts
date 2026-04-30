import type { RowDataPacket } from 'mysql2/promise';
import { loadEtlConfig } from './config';
import { createMySqlClient } from './mysql-client';
import type { MySqlClient } from './mysql-client';
import {
  connectPrisma,
  createPrismaClient,
  disconnectPrisma,
} from './prisma-client';
import {
  buildWalletReconciliationReport,
  formatWalletReconciliationSummary,
  persistWalletReconciliationReport,
} from './reconciliation-report';
import { parseVipPackage } from './parse-wordpress';

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: number): number {
  return Number(value.toFixed(2));
}

type SourceLegacyWalletRow = RowDataPacket & {
  ID: unknown;
  price: unknown;
};

type SourceUserMetaRow = RowDataPacket & {
  user_id: unknown;
  meta_value: unknown;
};

type TableExistsRow = RowDataPacket & {
  has_table: unknown;
};

async function tableExists(
  client: MySqlClient,
  tableName: string,
): Promise<boolean> {
  const rows = await client.query<TableExistsRow>(
    `SELECT 1 AS has_table
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
}

export async function verifyWalletReconciliation(): Promise<void> {
  const config = loadEtlConfig();
  const mysql = createMySqlClient(config);
  const prisma = createPrismaClient(config);

  try {
    await mysql.connect();
    await connectPrisma(prisma);

    const [
      sourceLegacyRows,
      sourceCurrentRows,
      sourceVipLevelRows,
      sourceVipPackageRows,
    ] = await Promise.all([
      mysql.query<SourceLegacyWalletRow>('SELECT ID, price FROM wp_users'),
      mysql.query<SourceUserMetaRow>(
        `SELECT user_id, meta_value
         FROM wp_usermeta
         WHERE meta_key = '_user_balance'
           AND meta_value IS NOT NULL
           AND meta_value <> ''`,
      ),
      mysql.query<SourceUserMetaRow>(
        `SELECT user_id, meta_value
         FROM wp_usermeta
         WHERE meta_key = '_user_vip_level_id'
           AND meta_value IS NOT NULL
           AND meta_value <> ''`,
      ),
      mysql.query<SourceUserMetaRow>(
        `SELECT user_id, meta_value
         FROM wp_usermeta
         WHERE meta_key = 'vip_package'
           AND meta_value IS NOT NULL
           AND meta_value <> ''`,
      ),
    ]);

    const sourceVipRows = (await tableExists(mysql, 'wp_vip_levels'))
      ? await mysql.query<RowDataPacket & { id: unknown }>(
          'SELECT id FROM wp_vip_levels',
        )
      : [];

    const sourceLegacyTotalByUserId = new Map<number, number>();
    for (const row of sourceLegacyRows) {
      sourceLegacyTotalByUserId.set(asNumber(row.ID), asNumber(row.price, 0));
    }

    const sourceCurrentByUserId = new Map<number, number>();
    for (const row of sourceCurrentRows) {
      const userId = asNumber(row.user_id, 0);
      if (userId > 0) {
        sourceCurrentByUserId.set(userId, asNumber(row.meta_value, 0));
      }
    }

    const sourceVipLevelByUserId = new Map<number, number>();
    for (const row of sourceVipLevelRows) {
      const userId = asNumber(row.user_id, 0);
      const vipLevelId = asNumber(row.meta_value, 0);
      if (userId > 0 && vipLevelId > 0) {
        sourceVipLevelByUserId.set(userId, vipLevelId);
      }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        balance: true,
        kimTe: true,
        vipLevelId: true,
        currentVipLevelId: true,
        wallet: {
          select: {
            balance: true,
            depositedBalance: true,
            totalDeposited: true,
          },
        },
      },
    });

    const targetVipRows = await prisma.vipLevel.findMany({
      select: { id: true },
    });

    const targetVipSubscriptions = await prisma.vipSubscription.findMany({
      select: {
        userId: true,
        isActive: true,
      },
    });

    const walletBalanceByUserId = new Map<number, number>();
    const targetCurrentByUserId = new Map<number, number>();
    const targetLegacyTotalByUserId = new Map<number, number>();
    const targetUserBalanceByUserId = new Map<number, number>();
    const targetUserKimTeByUserId = new Map<number, number>();
    const targetVipLevelByUserId = new Map<number, number | null>();

    for (const user of users) {
      walletBalanceByUserId.set(user.id, asNumber(user.wallet?.balance, 0));
      targetCurrentByUserId.set(
        user.id,
        asNumber(user.wallet?.depositedBalance, 0),
      );
      targetLegacyTotalByUserId.set(
        user.id,
        asNumber(user.wallet?.totalDeposited, 0),
      );
      targetUserBalanceByUserId.set(user.id, user.balance);
      targetUserKimTeByUserId.set(user.id, user.kimTe);
      targetVipLevelByUserId.set(
        user.id,
        user.currentVipLevelId ?? user.vipLevelId ?? null,
      );
    }

    const targetCurrentForSourceUsers = new Map<number, number>();
    for (const userId of sourceCurrentByUserId.keys()) {
      targetCurrentForSourceUsers.set(
        userId,
        targetCurrentByUserId.get(userId) ?? 0,
      );
    }

    const currentBalanceMismatches = [...sourceCurrentByUserId.keys()]
      .sort((a, b) => a - b)
      .map((userId) => {
        const sourceBalance = asNumber(sourceCurrentByUserId.get(userId), 0);
        const expectedUserBalance = Math.floor(sourceBalance);
        const walletBalance = asNumber(walletBalanceByUserId.get(userId), 0);
        const depositedBalance = asNumber(
          targetCurrentByUserId.get(userId),
          0,
        );
        const userBalance = asNumber(targetUserBalanceByUserId.get(userId), 0);

        return {
          userId,
          sourceBalance: money(sourceBalance),
          expectedUserBalance,
          userBalance: money(userBalance),
          walletBalance: money(walletBalance),
          depositedBalance: money(depositedBalance),
          userDelta: money(userBalance - expectedUserBalance),
          walletDelta: money(walletBalance - sourceBalance),
          depositedDelta: money(depositedBalance - sourceBalance),
        };
      })
      .filter(
        (row) =>
          row.userDelta !== 0 ||
          row.walletDelta !== 0 ||
          row.depositedDelta !== 0,
      );

    const sourceVipIds = new Set<number>(
      sourceVipRows.map((row) => asNumber(row.id, 0)).filter((id) => id > 0),
    );
    const targetVipIds = new Set<number>(targetVipRows.map((row) => row.id));

    const missingVipIds = [...sourceVipIds]
      .filter((id) => !targetVipIds.has(id))
      .sort((a, b) => a - b);
    const unexpectedVipIds = [...targetVipIds]
      .filter((id) => !sourceVipIds.has(id))
      .sort((a, b) => a - b);

    const vipLevelMismatches = [...sourceVipLevelByUserId.keys()]
      .sort((a, b) => a - b)
      .map((userId) => {
        const sourceVipLevelId = sourceVipLevelByUserId.get(userId) ?? null;
        const targetVipLevelId = targetVipLevelByUserId.get(userId) ?? null;
        return {
          userId,
          sourceVipLevelId,
          targetVipLevelId,
        };
      })
      .filter((row) => row.sourceVipLevelId !== row.targetVipLevelId);

    const sourceActiveVipPackageUserIds = new Set<number>();
    let sourceInvalidActiveVipPackages = 0;
    for (const row of sourceVipPackageRows) {
      const userId = asNumber(row.user_id, 0);
      if (userId <= 0) {
        continue;
      }

      const parsed = parseVipPackage(userId, String(row.meta_value ?? ''));
      if (!parsed.ok) {
        sourceInvalidActiveVipPackages += 1;
        continue;
      }

      const sourceVipLevelId = sourceVipLevelByUserId.get(userId) ?? 0;
      const vipLevelId =
        parsed.value.vipLevelId > 0
          ? parsed.value.vipLevelId
          : sourceVipLevelId > 0
            ? sourceVipLevelId
            : parsed.value.isActive
              ? 1
              : 0;

      if (parsed.value.isActive && vipLevelId > 0) {
        sourceActiveVipPackageUserIds.add(userId);
      } else if (parsed.value.isActive) {
        sourceInvalidActiveVipPackages += 1;
      }
    }

    const targetActiveVipPackageUserIds = new Set(
      targetVipSubscriptions
        .filter((row) => row.isActive)
        .map((row) => row.userId),
    );
    const missingActiveVipPackageUserIds = [...sourceActiveVipPackageUserIds]
      .filter((userId) => !targetActiveVipPackageUserIds.has(userId))
      .sort((a, b) => a - b);
    const unexpectedActiveVipPackageUserIds = [
      ...targetActiveVipPackageUserIds,
    ]
      .filter((userId) => !sourceActiveVipPackageUserIds.has(userId))
      .sort((a, b) => a - b);

    const legacyUserIds = new Set<number>(sourceLegacyTotalByUserId.keys());

    const backfillMismatches = [...legacyUserIds]
      .sort((a, b) => a - b)
      .map((userId) => {
        const legacyTotal = asNumber(sourceLegacyTotalByUserId.get(userId), 0);
        const totalDeposited = asNumber(
          targetLegacyTotalByUserId.get(userId),
          0,
        );
        const userKimTe = asNumber(targetUserKimTeByUserId.get(userId), 0);
        return {
          userId,
          legacyTotal: money(legacyTotal),
          totalDeposited: money(totalDeposited),
          userKimTe: money(userKimTe),
          totalDepositedDelta: money(totalDeposited - legacyTotal),
          userKimTeDelta: money(userKimTe - legacyTotal),
          totalDepositedShortfall: money(Math.max(legacyTotal - totalDeposited, 0)),
          userKimTeShortfall: money(Math.max(legacyTotal - userKimTe, 0)),
        };
      })
      .filter(
        (row) =>
          row.totalDepositedShortfall !== 0 || row.userKimTeShortfall !== 0,
      );

    const sourceLegacyTotal = money(
      [...sourceLegacyTotalByUserId.values()].reduce(
        (sum, value) => sum + asNumber(value, 0),
        0,
      ),
    );
    const targetTotalDepositedTotal = money(
      [...sourceLegacyTotalByUserId.keys()].reduce(
        (sum, userId) =>
          sum + asNumber(targetLegacyTotalByUserId.get(userId), 0),
        0,
      ),
    );
    const targetUserKimTeTotal = money(
      [...sourceLegacyTotalByUserId.keys()].reduce(
        (sum, userId) => sum + asNumber(targetUserKimTeByUserId.get(userId), 0),
        0,
      ),
    );

    const report = {
      ...buildWalletReconciliationReport({
        sourceByUserId: sourceCurrentByUserId,
        targetByUserId: targetCurrentForSourceUsers,
      }),
      currentBalance: {
        sourceField: 'wp_usermeta._user_balance',
        targetFields: [
          'users.balance',
          'wallets.balance',
          'wallets.depositedBalance',
        ],
        mismatches: currentBalanceMismatches,
      },
      vipParity: {
        sourceCount: sourceVipIds.size,
        targetCount: targetVipIds.size,
        missingVipIds,
        unexpectedVipIds,
      },
      vipUserLevelParity: {
        sourceCount: sourceVipLevelByUserId.size,
        targetCount: [...targetVipLevelByUserId.values()].filter(
          (id) => id !== null,
        ).length,
        mismatches: vipLevelMismatches,
      },
      vipSubscriptionParity: {
        sourceActiveUsersWithPackage: sourceActiveVipPackageUserIds.size,
        targetActiveSubscriptions: targetActiveVipPackageUserIds.size,
        sourceInvalidActivePackages: sourceInvalidActiveVipPackages,
        missingActiveUserIds: missingActiveVipPackageUserIds,
        unexpectedActiveUserIds: unexpectedActiveVipPackageUserIds,
      },
      walletBackfill: {
        sourceField: 'wp_users.price',
        targetFields: ['wallets.totalDeposited', 'users.kimTe'],
        sourceLegacyTotal,
        targetTotalDepositedTotal,
        targetUserKimTeTotal,
        targetAdditionalTotalDeposited: money(
          targetTotalDepositedTotal - sourceLegacyTotal,
        ),
        targetAdditionalUserKimTe: money(targetUserKimTeTotal - sourceLegacyTotal),
        totalDepositedDelta: money(
          targetTotalDepositedTotal - sourceLegacyTotal,
        ),
        userKimTeDelta: money(targetUserKimTeTotal - sourceLegacyTotal),
        mismatches: backfillMismatches,
      },
    };

    await persistWalletReconciliationReport(
      config.runtime.walletReconciliationPath,
      report,
    );

    console.log(formatWalletReconciliationSummary(report));
    console.log(
      'Current balance parity (_user_balance): mismatches=' +
        report.currentBalance.mismatches.length,
    );
    console.log(
      'VIP level parity: source=' +
        report.vipUserLevelParity.sourceCount +
        ' target=' +
        report.vipUserLevelParity.targetCount +
        ' mismatches=' +
        report.vipUserLevelParity.mismatches.length,
    );
    console.log(
      'VIP package parity: sourceUsersWithPackage=' +
        report.vipSubscriptionParity.sourceActiveUsersWithPackage +
        ' targetActiveSubscriptions=' +
        report.vipSubscriptionParity.targetActiveSubscriptions +
        ' missing=' +
        report.vipSubscriptionParity.missingActiveUserIds.length +
        ' unexpected=' +
        report.vipSubscriptionParity.unexpectedActiveUserIds.length +
        ' invalidActive=' +
        report.vipSubscriptionParity.sourceInvalidActivePackages,
    );
    console.log(
      'VIP level table parity: source=' +
        report.vipParity.sourceCount +
        ' target=' +
        report.vipParity.targetCount +
        ' missing=' +
        report.vipParity.missingVipIds.length +
        ' unexpected=' +
        report.vipParity.unexpectedVipIds.length,
    );
    console.log(
      'Legacy total baseline: totalDepositedDelta=' +
        report.walletBackfill.totalDepositedDelta.toFixed(2) +
        ' userKimTe=' +
        report.walletBackfill.userKimTeDelta.toFixed(2) +
        ' shortfalls=' +
        report.walletBackfill.mismatches.length,
    );
    console.log(
      'Reconciliation output: ' + config.runtime.walletReconciliationPath,
    );
  } finally {
    await disconnectPrisma(prisma);
    await mysql.disconnect();
  }
}

void verifyWalletReconciliation().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Wallet reconciliation failed: ${message}`);
  process.exitCode = 1;
});
