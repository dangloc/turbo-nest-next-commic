import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise';
import type { EtlConfig } from './types';

export type MySqlQueryResult<T> = Promise<T[]>;

export interface MySqlClient {
  connect(): Promise<void>;
  query<T extends RowDataPacket>(
    sql: string,
    params?: unknown[],
  ): MySqlQueryResult<T>;
  disconnect(): Promise<void>;
}

export function createMySqlClient(config: EtlConfig): MySqlClient {
  let pool: Pool | null = null;

  return {
    async connect() {
      if (pool) {
        return;
      }

      pool = createPool({
        host: config.source.host,
        port: config.source.port,
        user: config.source.user,
        password: config.source.password,
        database: config.source.database,
        waitForConnections: true,
        connectionLimit: 8,
      });

      await pool.query('SELECT 1');
    },

    async query<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
      if (!pool) {
        throw new Error('MySQL client is not connected');
      }

      const [rows] = await pool.query<T[]>(sql, params);
      return rows;
    },

    async disconnect() {
      if (!pool) {
        return;
      }

      await pool.end();
      pool = null;
    },
  };
}
