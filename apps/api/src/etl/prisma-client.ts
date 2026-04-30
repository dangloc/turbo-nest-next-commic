import { PrismaClient } from '@prisma/client';
import type { EtlConfig } from './types';

export interface PrismaClientPort {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

export function createPrismaClient(config: EtlConfig): PrismaClient {
  const PrismaCtor = PrismaClient as unknown as new (args: {
    datasources: { db: { url: string } };
  }) => PrismaClient;

  return new PrismaCtor({
    datasources: {
      db: {
        url: config.target.databaseUrl,
      },
    },
  });
}

export async function connectPrisma(client: PrismaClientPort): Promise<void> {
  await client.$connect();
}

export async function disconnectPrisma(
  client: PrismaClientPort,
): Promise<void> {
  await client.$disconnect();
}
