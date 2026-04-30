import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_CHUNK_SIZE, type EtlConfig } from './types';

const requiredVars = [
  'WP_MYSQL_HOST',
  'WP_MYSQL_PORT',
  'WP_MYSQL_USER',
  'WP_MYSQL_PASSWORD',
  'WP_MYSQL_DATABASE',
  'DATABASE_URL',
] as const;

const filePreferredVars = new Set<string>(requiredVars);

function normalizeEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function applyEnvFile(filePath: string, env: NodeJS.ProcessEnv): void {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key) {
      continue;
    }

    // For ETL connection keys, prefer project .env values over inherited shell env.
    if (env[key] !== undefined && !filePreferredVars.has(key)) {
      continue;
    }

    const value = trimmed.slice(eqIndex + 1);
    env[key] = normalizeEnvValue(value);
  }
}

function loadEnvFiles(env: NodeJS.ProcessEnv): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../../.env.local'),
  ];

  for (const filePath of candidates) {
    applyEnvFile(filePath, env);
  }
}

export function loadEtlConfig(env: NodeJS.ProcessEnv = process.env): EtlConfig {
  loadEnvFiles(env);

  const missing = requiredVars.filter((key) => env[key] === undefined);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const port = Number(env.WP_MYSQL_PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('WP_MYSQL_PORT must be a positive integer');
  }

  const chunkSizeRaw = env.ETL_CHAPTER_CHUNK_SIZE;
  const chunkSize = chunkSizeRaw ? Number(chunkSizeRaw) : DEFAULT_CHUNK_SIZE;
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error(
      'ETL_CHAPTER_CHUNK_SIZE must be a positive integer when set',
    );
  }

  return {
    source: {
      host: env.WP_MYSQL_HOST!,
      port,
      user: env.WP_MYSQL_USER!,
      password: env.WP_MYSQL_PASSWORD!,
      database: env.WP_MYSQL_DATABASE!,
    },
    target: {
      databaseUrl: env.DATABASE_URL!,
    },
    runtime: {
      chunkSize,
      quarantinePath:
        env.ETL_QUARANTINE_PATH ?? 'apps/api/tmp/etl-quarantine.json',
      transactionOverridesPath:
        env.ETL_TRANSACTION_OVERRIDES_PATH ??
        'apps/api/tmp/etl-transaction-overrides.json',
      walletReconciliationPath:
        env.ETL_WALLET_RECONCILIATION_PATH ??
        'apps/api/tmp/wallet-reconciliation.json',
      purchasedChapterReconciliationPath:
        env.ETL_PURCHASE_RECONCILIATION_PATH ??
        'apps/api/tmp/purchased-chapter-reconciliation.json',
      socialMappingVerificationPath:
        env.ETL_SOCIAL_VERIFICATION_PATH ??
        'apps/api/tmp/social-mapping-verification.json',
      contentReconciliationPath:
        env.ETL_CONTENT_RECONCILIATION_PATH ??
        'apps/api/tmp/content-reconciliation.json',
      taxonomyReconciliationPath:
        env.ETL_TAXONOMY_RECONCILIATION_PATH ??
        'apps/api/tmp/taxonomy-reconciliation.json',
    },
  };
}
