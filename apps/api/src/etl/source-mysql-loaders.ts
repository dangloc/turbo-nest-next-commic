import type { RowDataPacket } from 'mysql2/promise';
import type { MySqlClient } from './mysql-client';
import type {
  ChapterRelation,
  SourceChapterContentRow,
  SourceChapterRow,
  SourceNovelRow,
  SourceProviderRow,
  SourceTermRelationshipRow,
  SourceTermRow,
  SourceTransactionRow,
  SourceUserRow,
  SourceVipLevelRow,
  SourceVipRow,
  SourceWalletRow,
  SourceUserFinancialSnapshotRow,
} from './types';

type AnyRow = RowDataPacket & Record<string, unknown>;

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asDate(value: unknown): Date {
  const date = new Date(asString(value, new Date(0).toISOString()));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
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

function normalizeEmail(raw: string, userId: number): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) {
    return `wp-user-${userId}@migrated.local`;
  }
  return trimmed;
}

function normalizeLookupToken(value: unknown): string {
  return asString(value, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function tableExists(
  client: MySqlClient,
  tableName: string,
): Promise<boolean> {
  const rows = await client.query<AnyRow>(
    `SELECT 1 AS has_table
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
}

export function createSourceLoaders(client: MySqlClient) {
  return {
    async loadUsers(): Promise<SourceUserRow[]> {
      const users = await client.query<AnyRow>('SELECT * FROM wp_users');
      const metaRows = await client.query<AnyRow>(
        `SELECT user_id, meta_key, meta_value
         FROM wp_usermeta
         WHERE meta_key IN ('nickname', 'avatar', 'wp_user_avatar', 'wp_capabilities')`,
      );

      const metaByUser = new Map<number, Record<string, string>>();
      for (const row of metaRows) {
        const userId = asNumber(row.user_id);
        const key = asString(row.meta_key);
        const value = asString(row.meta_value);
        if (!metaByUser.has(userId)) {
          metaByUser.set(userId, {});
        }
        metaByUser.get(userId)![key] = value;
      }

      const emailCount = new Map<string, number>();

      return users.map((row) => {
        const id = asNumber(getFirst(row, ['ID', 'id'], 0));
        const meta = metaByUser.get(id) ?? {};
        const capabilities = meta.wp_capabilities ?? '';
        const role: 'USER' | 'ADMIN' = capabilities.includes('administrator')
          ? 'ADMIN'
          : 'USER';

        const baseEmail = normalizeEmail(
          asString(getFirst(row, ['user_email', 'email'], '')),
          id,
        );
        const seen = emailCount.get(baseEmail) ?? 0;
        emailCount.set(baseEmail, seen + 1);
        const email = seen === 0 ? baseEmail : `${baseEmail}+dup${seen}`;

        return {
          id,
          email,
          password: asString(getFirst(row, ['user_pass', 'password'], '')),
          nickname:
            (meta.nickname ??
              asString(
                getFirst(row, ['display_name', 'user_nicename'], ''),
                '',
              )) ||
            null,
          avatar: meta.wp_user_avatar ?? meta.avatar ?? null,
          role,
        };
      });
    },

    async loadProviders(): Promise<SourceProviderRow[]> {
      if (!(await tableExists(client, 'wp_social_users'))) {
        return [];
      }

      const rows = await client.query<AnyRow>('SELECT * FROM wp_social_users');
      return rows
        .map((row) => ({
          userId: asNumber(
            getFirst(row, ['user_id', 'userId', 'uid', 'ID'], 0),
          ),
          provider: asString(
            getFirst(row, ['provider', 'social_type', 'type'], 'google'),
          ),
          providerId: asString(
            getFirst(row, ['provider_id', 'social_id', 'identifier'], ''),
          ),
        }))
        .filter((row) => row.userId > 0 && row.providerId.length > 0);
    },

    async loadWallets(): Promise<SourceWalletRow[]> {
      const rows = await client.query<AnyRow>('SELECT ID, price FROM wp_users');

      return rows.map((row) => ({
        userId: asNumber(row.ID),
        balance: asNumber(row.price, 0),
      }));
    },

    async loadUserFinancialSnapshots(): Promise<SourceUserFinancialSnapshotRow[]> {
      const rows = await client.query<AnyRow>(
        `SELECT
           user_id,
           MAX(CASE WHEN meta_key = '_user_balance' THEN meta_value END) AS user_balance,
           MAX(CASE WHEN meta_key = '_user_vip_level_id' THEN meta_value END) AS user_vip_level_id,
           MAX(CASE WHEN meta_key = '_purchased_chapters' THEN meta_value END) AS purchased_chapters
         FROM wp_usermeta
         WHERE meta_key IN ('_user_balance', '_user_vip_level_id', '_purchased_chapters')
         GROUP BY user_id`,
      );

      return rows.map((row) => ({
        userId: asNumber(row.user_id),
        userBalanceRaw:
          row.user_balance == null ? null : asString(row.user_balance, ''),
        userVipLevelIdRaw:
          row.user_vip_level_id == null
            ? null
            : asString(row.user_vip_level_id, ''),
        purchasedChaptersRaw:
          row.purchased_chapters == null
            ? null
            : asString(row.purchased_chapters, ''),
      }));
    },

    async loadVipRows(): Promise<SourceVipRow[]> {
      const rows = await client.query<AnyRow>(
        `SELECT
           pkg.user_id,
           pkg.meta_value,
           COALESCE(MAX(vip_level.meta_value), '0') AS vip_level_id
         FROM wp_usermeta pkg
         LEFT JOIN wp_usermeta vip_level
           ON vip_level.user_id = pkg.user_id
          AND vip_level.meta_key = '_user_vip_level_id'
         WHERE pkg.meta_key = 'vip_package'
           AND pkg.meta_value IS NOT NULL
           AND pkg.meta_value <> ''
         GROUP BY pkg.user_id, pkg.meta_value`,
      );

      return rows.map((row) => ({
        userId: asNumber(row.user_id),
        vipLevelId: asNumber(row.vip_level_id, 0),
        vipPackageRaw: asString(row.meta_value),
      }));
    },

    async loadVipLevels(): Promise<SourceVipLevelRow[]> {
      if ((await tableExists(client, 'wp_vip_levels')) === false) {
        return [];
      }
      const rows = await client.query<AnyRow>('SELECT * FROM wp_vip_levels');
      return rows
        .map((row) => ({
          id: asNumber(getFirst(row, ['id', 'ID', 'vip_level_id'], 0), 0),
          name: asString(getFirst(row, ['name', 'title', 'vip_name'], ''), ''),
          vndValue: asNumber(
            getFirst(row, ['vnd_value', 'vndValue', 'money', 'price'], 0),
            0,
          ),
          kimTe: asNumber(getFirst(row, ['kim_te', 'kimTe', 'k_te'], 0), 0),
          colorCode:
            asString(
              getFirst(row, ['color_code', 'colorCode', 'color'], ''),
              '',
            ).trim() || null,
          iconUrl:
            asString(
              getFirst(row, ['icon_url', 'iconUrl', 'icon'], ''),
              '',
            ).trim() || null,
        }))
        .filter((row) => row.id > 0 && row.vndValue >= 0 && row.kimTe >= 0);
    },
    async loadTransactions(): Promise<SourceTransactionRow[]> {
      if (!(await tableExists(client, 'tb_transactions'))) {
        return [];
      }

      const users = await client.query<AnyRow>(
        'SELECT ID, user_login, display_name, user_nicename FROM wp_users',
      );

      const lookup = new Map<string, number>();
      for (const user of users) {
        const userId = asNumber(user.ID, 0);
        if (userId <= 0) continue;
        const keys = [user.user_login, user.display_name, user.user_nicename];
        for (const key of keys) {
          const token = normalizeLookupToken(key);
          if (token.length >= 3 && !lookup.has(token)) {
            lookup.set(token, userId);
          }
        }
      }

      const rows = await client.query<AnyRow>('SELECT * FROM tb_transactions');
      return rows.map((row) => {
        const content =
          asString(
            getFirst(
              row,
              ['transaction_content', 'content', 'description', 'note'],
              '',
            ),
            '',
          ) || null;

        const direct = asNumber(getFirst(row, ['user_id', 'userId', 'uid'], 0));
        let inferredUserId = direct > 0 ? direct : 0;

        if (inferredUserId === 0 && content) {
          const tokens = content
            .split(/\s+/)
            .map(normalizeLookupToken)
            .filter((token) => token.length >= 3);

          for (let i = tokens.length - 1; i >= 0; i -= 1) {
            const mapped = lookup.get(tokens[i]);
            if (mapped) {
              inferredUserId = mapped;
              break;
            }
          }
        }

        return {
          sourceTransactionId: asNumber(getFirst(row, ['id', 'ID'], 0)),
          userId: inferredUserId,
          amountIn: asNumber(
            getFirst(row, ['amount_in', 'coin_in', 'in_coin'], 0),
          ),
          amountOut: asNumber(
            getFirst(row, ['amount_out', 'coin_out', 'out_coin'], 0),
          ),
          accumulated: asNumber(
            getFirst(row, ['accumulated', 'total_after', 'balance_after'], 0),
          ),
          transactionDate: asDate(
            getFirst(
              row,
              ['transaction_date', 'created_at', 'createdAt'],
              new Date(0),
            ),
          ),
          typeRaw: asString(
            getFirst(row, ['type', 'transaction_type', 'kind'], 'deposit'),
          ),
          content,
          accountNumber:
            asString(getFirst(row, ['account_number'], ''), '') || null,
          subAccount: asString(getFirst(row, ['sub_account'], ''), '') || null,
        };
      });
    },

    async loadPurchasedChapters(): Promise<SourceChapterRow[]> {
      const rows = await client.query<AnyRow>(
        `SELECT user_id, meta_value
         FROM wp_usermeta
         WHERE meta_key = '_purchased_chapters' AND meta_value IS NOT NULL AND meta_value <> ''`,
      );

      return rows.map((row) => ({
        userId: asNumber(row.user_id),
        purchasesRaw: asString(row.meta_value),
      }));
    },

    async loadNovels(): Promise<SourceNovelRow[]> {
      const rows = await client.query<AnyRow>(
        `SELECT ID, post_title, post_content, post_date
         FROM wp_posts
         WHERE post_type = 'truyen_chu' AND post_status = 'publish'`,
      );

      const pricingRows = await client.query<AnyRow>(
        `SELECT post_id, meta_key, meta_value
         FROM wp_postmeta
         WHERE meta_key IN ('_locked_from', '_chapter_price', '_giam_gia_bao_nhieu')`,
      );

      const pricingByNovel = new Map<
        number,
        {
          lockedFrom?: number;
          defaultChapterPrice?: number;
          freeChapterCount?: number;
          comboDiscountPct?: number;
        }
      >();

      for (const row of pricingRows) {
        const novelId = asNumber(row.post_id);
        if (novelId <= 0) {
          continue;
        }

        const key = asString(row.meta_key);
        const value = asNumber(row.meta_value, 0);
        const current = pricingByNovel.get(novelId) ?? {};

        if (key === '_locked_from') {
          const lockedFrom = value > 0 ? value : 0;
          current.lockedFrom = lockedFrom > 0 ? lockedFrom : undefined;
          current.freeChapterCount = lockedFrom > 0 ? Math.max(lockedFrom - 1, 0) : 0;
        } else if (key === '_chapter_price') {
          current.defaultChapterPrice = value >= 0 ? value : 0;
        } else if (key === '_giam_gia_bao_nhieu') {
          current.comboDiscountPct = value >= 0 ? value : 0;
        }

        pricingByNovel.set(novelId, current);
      }

      return rows.map((row) => {
        const id = asNumber(row.ID);
        const pricing = pricingByNovel.get(id) ?? {};
        return {
          id,
          title: asString(getFirst(row, ['post_title', 'title'], '')),
          postContent: asString(getFirst(row, ['post_content', 'content'], '')),
          createdAt: asDate(
            getFirst(row, ['post_date', 'createdAt'], new Date(0)),
          ),
          lockedFrom: pricing.lockedFrom ?? null,
          defaultChapterPrice: pricing.defaultChapterPrice ?? 0,
          freeChapterCount: pricing.freeChapterCount ?? 0,
          comboDiscountPct: pricing.comboDiscountPct ?? 0,
        };
      });
    },

    async loadChapters(): Promise<SourceChapterContentRow[]> {
      const rows = await client.query<AnyRow>(
        `SELECT ID, post_title, post_content, post_date
         FROM wp_posts
         WHERE post_type = 'chuong_truyen' AND post_status = 'publish'`,
      );

      const relations = await client.query<AnyRow>(
        `SELECT post_id, meta_value
         FROM wp_postmeta
         WHERE meta_key = 'chuong_with_truyen'`,
      );

      const relationMap = new Map<number, number>();
      for (const rel of relations) {
        const chapterId = asNumber(rel.post_id);
        const novelId = asNumber(rel.meta_value, 0);
        if (novelId > 0) {
          relationMap.set(chapterId, novelId);
        }
      }

      return rows
        .map((row) => {
          const chapterId = asNumber(row.ID);
          const novelId = relationMap.get(chapterId) ?? 0;
          return {
            id: chapterId,
            novelId,
            title: asString(getFirst(row, ['post_title', 'title'], '')),
            postContent: asString(
              getFirst(row, ['post_content', 'content'], ''),
            ),
            createdAt: asDate(
              getFirst(row, ['post_date', 'createdAt'], new Date(0)),
            ),
          };
        })
        .filter((row) => row.novelId > 0);
    },

    async loadChapterRelations(): Promise<ChapterRelation[]> {
      const rows = await client.query<AnyRow>(
        `SELECT post_id, meta_value
         FROM wp_postmeta
         WHERE meta_key = 'chuong_with_truyen'`,
      );

      return rows
        .map((row) => ({
          chapterId: asNumber(row.post_id),
          novelId: asNumber(row.meta_value, 0),
        }))
        .filter((row) => row.chapterId > 0 && row.novelId > 0);
    },

    async loadTerms(): Promise<SourceTermRow[]> {
      if (!(await tableExists(client, 'wp_terms'))) {
        return [];
      }

      const rows = await client.query<AnyRow>(
        `SELECT
           t.term_id,
           t.name,
           t.slug,
           COALESCE(tt.taxonomy, 'uncategorized') AS taxonomy
         FROM wp_terms t
         LEFT JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
         WHERE t.term_id > 0`,
      );

      return rows
        .map((row) => ({
          id: asNumber(row.term_id, 0),
          name: asString(row.name, ''),
          slug: asString(row.slug, ''),
          taxonomy: asString(row.taxonomy, 'uncategorized'),
        }))
        .filter((row) => row.id > 0 && row.name.length > 0);
    },

    async loadTermRelationships(): Promise<SourceTermRelationshipRow[]> {
      if (!(await tableExists(client, 'wp_term_relationships'))) {
        return [];
      }

      const rows = await client.query<AnyRow>(
        `SELECT
           tr.object_id,
           tr.term_taxonomy_id,
           tt.term_id
         FROM wp_term_relationships tr
         INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
         WHERE tr.object_id > 0 AND tt.term_id > 0`,
      );

      return rows
        .map((row) => ({
          novelId: asNumber(row.object_id, 0),
          termTaxonomyId: asNumber(row.term_taxonomy_id, 0),
          termId: asNumber(row.term_id, 0),
        }))
        .filter(
          (row) => row.novelId > 0 && row.termTaxonomyId > 0 && row.termId > 0,
        );
    },
  };
}
