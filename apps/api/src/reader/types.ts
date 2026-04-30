export type ReaderSortBy = 'viewCount' | 'updatedAt' | 'createdAt';
export type ReaderDiscoverySortBy = ReaderSortBy | 'recommendationVotes';
export type ReaderSortDir = 'asc' | 'desc';

export interface ReaderDiscoveryQuery {
  q?: string;
  author?: string;
  releaseYear?: string;
  page?: number;
  limit?: number;
  sortBy?: ReaderDiscoverySortBy;
  sortDir?: ReaderSortDir;
  category?: string;
  tag?: string;
  status?: string;
}

export interface BookmarkInput {
  novelId: number;
  chapterId?: number;
  note?: string;
}

export interface BookmarkListQuery {
  page?: number;
  pageSize?: number;
}

export interface PointTransactionListQuery {
  page?: number;
  pageSize?: number;
}

export interface NovelRecommendationStatus {
  novelId: number;
  totalVotes: number;
  dailyLimit: number;
  remainingVotes: number;
  usedVotesToday: number;
  viewerVotesForNovelToday: number;
  voteDate: Date;
}

export interface RecommendNovelInput {
  votes: number;
}

export interface ReadingHistoryInput {
  novelId: number;
  chapterId?: number;
  progressPercent: number;
}

export interface ReaderChapterOpenInput {
  chapterId: number;
  novelId?: number;
  progressPercent?: number;
  clientUpdatedAt?: string;
}

export type ReaderSyncPolicy =
  | 'first-open-create'
  | 'last-write-accept-client'
  | 'last-write-keep-server';

export interface ReaderChapterOpenResult {
  chapterId: number;
  novelId: number;
  firstOpen: boolean;
  progressPercent: number;
  effectiveProgressPercent: number;
  serverAcceptedProgress: boolean;
  conflictDetected: boolean;
  appliedPolicy: ReaderSyncPolicy;
  clientUpdatedAt: Date | null;
  serverLastReadAt: Date;
  lastReadAt: Date;
}

export interface AuthorCatalogQuery {
  page?: number;
  limit?: number;
  sortBy?: ReaderSortBy;
  sortDir?: ReaderSortDir;
}

export interface AuthorCatalogItem {
  id: number;
  title: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  terms: Array<{
    id: number;
    name: string;
    slug: string;
    taxonomy: string;
  }>;
}

export interface AuthorStats {
  totalPublishedNovels: number;
  totalViews: number;
  latestUpdateAt: Date | null;
  followerCount: number;
  viewerFollowsAuthor: boolean;
}

export interface AuthorIdentity {
  id: number;
  displayName: string;
  nickname: string | null;
  penName: string | null;
  avatar: string | null;
  bio: string | null;
}

export interface AuthorFollowResult {
  authorId: number;
  followerCount: number;
  viewerFollowsAuthor: boolean;
}

export interface AuthorProfileResponse {
  author: AuthorIdentity;
  stats: AuthorStats;
  catalog: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    items: AuthorCatalogItem[];
  };
}

export interface ReaderChapterTocItem {
  id: number;
  title: string;
  chapterNumber?: number | null;
}

export interface ReaderChapterContext {
  novelId: number;
  currentChapterId: number;
  previousChapterId: number | null;
  nextChapterId: number | null;
  chapters: ReaderChapterTocItem[];
}
