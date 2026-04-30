export type EtlConfig = {
  source: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  target: {
    databaseUrl: string;
  };
  runtime: {
    chunkSize: number;
    quarantinePath: string;
    transactionOverridesPath: string;
    walletReconciliationPath: string;
    purchasedChapterReconciliationPath: string;
    socialMappingVerificationPath: string;
    contentReconciliationPath: string;
    taxonomyReconciliationPath: string;
  };
};

export type ParseFailure = {
  sourceUserId: number;
  field: 'vip_package' | '_purchased_chapters';
  reason: string;
  raw: unknown;
};

export type ParsedVipPackage = {
  vipLevelId: number;
  packageType: string;
  isActive: boolean;
  purchaseDate: Date;
  expiresAt: Date | null;
};

export type ParsedChapterPurchase = {
  novelId: number;
  chapterId: number;
  pricePaid: number;
  purchasedAt: Date;
};

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: ParseFailure };

export type QuarantineEntry = {
  sourceUserId: number;
  reason: string;
  field: 'mapping' | 'vip_package' | '_purchased_chapters' | 'runtime';
  raw: unknown;
  createdAt: string;
};

export type SourceUserRow = {
  id: number;
  email: string;
  password: string;
  nickname: string | null;
  avatar: string | null;
  role: 'USER' | 'ADMIN';
};

export type SourceProviderRow = {
  userId: number;
  provider: string;
  providerId: string;
};

export type SourceWalletRow = {
  userId: number;
  balance: number;
};

export type SourceUserFinancialSnapshotRow = {
  userId: number;
  userBalanceRaw: string | null;
  userVipLevelIdRaw: string | null;
  purchasedChaptersRaw: string | null;
};

export type SourceVipRow = {
  userId: number;
  vipLevelId: number;
  vipPackageRaw: string;
};

export type SourceTransactionRow = {
  sourceTransactionId?: number;
  userId: number;
  amountIn: number;
  amountOut: number;
  accumulated: number;
  transactionDate: Date;
  typeRaw: string;
  content: string | null;
  accountNumber?: string | null;
  subAccount?: string | null;
};

export type SourceChapterRow = {
  userId: number;
  purchasesRaw: string;
};

/** Novel content row extracted from WordPress wp_posts table (post_type = 'truyen_chu'). */
export type SourceNovelRow = {
  /** Original MySQL post ID from wp_posts.ID — preserved directly in PostgreSQL. */
  id: number;
  /** Novel title from wp_posts.post_title. */
  title: string;
  /** Raw post content from wp_posts.post_content — no parsing, stored as-is. */
  postContent: string;
  /** WordPress post creation timestamp. */
  createdAt: Date;
  /** Optional chapter lock threshold from wp_postmeta.meta_key = '_locked_from'. */
  lockedFrom?: number | null;
  /** Default chapter price from wp_postmeta.meta_key = '_chapter_price'. */
  defaultChapterPrice?: number;
  /** Free chapter count derived from lockedFrom for pricing calculations. */
  freeChapterCount?: number;
  /** Combo discount percentage from wp_postmeta.meta_key = '_giam_gia_bao_nhieu'. */
  comboDiscountPct?: number;
};

/** Chapter content row extracted from WordPress wp_posts table (post_type = 'chuong_truyen'). */
export type SourceChapterContentRow = {
  /** Original MySQL post ID from wp_posts.ID — preserved directly in PostgreSQL. */
  id: number;
  /** Parent novel ID extracted from wp_postmeta where meta_key = 'chuong_with_truyen'. */
  novelId: number;
  /** Chapter title from wp_posts.post_title. */
  title: string;
  /** Raw post content from wp_posts.post_content — no parsing, stored as-is. */
  postContent: string;
  /** WordPress post creation timestamp. */
  createdAt: Date;
};

/** Explicit chapter-to-novel relationship extracted from WordPress wp_postmeta. */
export type ChapterRelation = {
  /** Chapter ID from wp_posts.ID where post_type = 'chuong_truyen'. */
  chapterId: number;
  /** Parent novel ID from wp_postmeta.meta_value where meta_key = 'chuong_with_truyen'. */
  novelId: number;
};

export type MigrationStats = {
  processedUsers: number;
  skippedUsers: number;
  usersUpserted: number;
  providersUpserted: number;
  walletsUpserted: number;
  vipUpserted: number;
  transactionsUpserted: number;
  chaptersInserted: number;
  novelUpserted: number;
  chapterUpserted: number;
  quarantinedUsers: number;
};

export const DEFAULT_CHUNK_SIZE = 1000;

export type SourceVipLevelRow = {
  id: number;
  name: string;
  vndValue: number;
  kimTe: number;
  colorCode: string | null;
  iconUrl: string | null;
};

/** Taxonomy term extracted from WordPress wp_terms and wp_term_taxonomy. */
export type SourceTermRow = {
  /** Original MySQL term_id from wp_terms.term_id - preserved directly as Term.id. */
  id: number;
  /** Term name from wp_terms.name. */
  name: string;
  /** Term slug from wp_terms.slug. */
  slug: string;
  /** Taxonomy type from wp_term_taxonomy.taxonomy (e.g., category, post_tag). */
  taxonomy: string;
};

/** Novel-to-term relationship extracted from WordPress wp_term_relationships. */
export type SourceTermRelationshipRow = {
  /** Novel (object) ID from wp_term_relationships.object_id. */
  novelId: number;
  /** Term taxonomy ID from wp_term_relationships.term_taxonomy_id. */
  termTaxonomyId: number;
  /** Preserved term ID from wp_term_taxonomy.term_id. */
  termId: number;
};
