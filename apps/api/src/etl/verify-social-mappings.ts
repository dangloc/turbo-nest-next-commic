import type { RowDataPacket } from 'mysql2/promise';
import { loadEtlConfig } from './config';
import { createMySqlClient } from './mysql-client';
import {
  connectPrisma,
  createPrismaClient,
  disconnectPrisma,
} from './prisma-client';
import {
  buildSocialMappingVerificationReport,
  formatSocialMappingVerificationSummary,
  persistSocialMappingVerificationReport,
} from './social-mapping-verification-report';

type SourceProviderRow = RowDataPacket & Record<string, unknown>;

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function getFirst<T>(
  row: Record<string, unknown>,
  keys: string[],
  fallback: T,
): T {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key] as T;
    }
  }
  return fallback;
}

function makeGoogleKey(userId: number, providerId: string): string {
  return `${userId}|google|${providerId.trim()}`;
}

export async function verifySocialMappings(): Promise<void> {
  const config = loadEtlConfig();
  const mysql = createMySqlClient(config);
  const prisma = createPrismaClient(config);

  try {
    await mysql.connect();
    await connectPrisma(prisma);

    const sourceRows = await mysql.query<SourceProviderRow>(
      'SELECT * FROM wp_social_users',
    );

    const sourceGoogleKeys = new Set<string>();
    for (const row of sourceRows) {
      const userId = asNumber(
        getFirst(row, ['user_id', 'userId', 'uid', 'ID'], 0),
        0,
      );
      const provider = asString(
        getFirst(row, ['provider', 'social_type', 'type'], ''),
        '',
      ).toLowerCase();
      const providerId = asString(
        getFirst(row, ['provider_id', 'social_id', 'identifier'], ''),
        '',
      );

      if (userId > 0 && provider === 'google' && providerId.trim().length > 0) {
        sourceGoogleKeys.add(makeGoogleKey(userId, providerId));
      }
    }

    const targetRows = await prisma.userProvider.findMany({
      where: { provider: 'google' },
      select: {
        userId: true,
        providerId: true,
      },
    });

    const targetGoogleKeys = new Set<string>();
    for (const row of targetRows) {
      targetGoogleKeys.add(makeGoogleKey(row.userId, row.providerId));
    }

    const report = buildSocialMappingVerificationReport({
      sourceGoogleKeys,
      targetGoogleKeys,
    });

    await persistSocialMappingVerificationReport(
      config.runtime.socialMappingVerificationPath,
      report,
    );

    console.log(formatSocialMappingVerificationSummary(report));
    console.log(
      `Social mapping verification output: ${config.runtime.socialMappingVerificationPath}`,
    );
  } finally {
    await disconnectPrisma(prisma);
    await mysql.disconnect();
  }
}

void verifySocialMappings().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Social mapping verification failed: ${message}`);
  process.exitCode = 1;
});
