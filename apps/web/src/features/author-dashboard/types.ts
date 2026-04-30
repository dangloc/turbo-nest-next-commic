import type { ApiResult, SessionUser } from "../../lib/api/types";

export interface TermRecord {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface TermSubmissionRecord {
  id: number;
  userId: number;
  user: {
    id: number;
    email: string;
    username: string | null;
    nickname: string | null;
  };
  name: string;
  slug: string;
  taxonomy: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedByUserId: number | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface NovelRecord {
  id: number;
  title: string;
  postContent: string;
  uploaderId: number;
  featuredImage: string | null;
  defaultChapterPrice: number;
  freeChapterCount: number;
  comboDiscountPct: number;
  terms: TermRecord[];
}

export interface ChapterRecord {
  id: number;
  novelId: number;
  title: string;
  postContent: string;
  chapterNumber: number | null;
  priceOverride: number | null;
}

export interface NovelFormInput {
  title: string;
  postContent: string;
  defaultChapterPrice?: number;
  freeChapterCount?: number;
  comboDiscountPct?: number;
  featuredImage?: string;
  termIds?: number[];
}

export interface ChapterFormInput {
  title: string;
  postContent: string;
  chapterNumber?: number;
  priceOverride?: number;
}

export type NovelListScope = "all" | "mine" | "others";
export type NovelListSort = "newest" | "oldest" | "title" | "views";

export interface NovelListQuery {
  q?: string;
  scope?: NovelListScope;
  sort?: NovelListSort;
  page?: number;
  pageSize?: number;
}

export interface NovelListPage {
  items: NovelRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export type AuthorDashboardBootstrapResult =
  | {
      kind: "ready";
      user: SessionUser;
    }
  | {
      kind: "redirect";
      to: string;
      reason: "missing_token" | "invalid_session" | "forbidden_role";
    };

export interface AuthorApiError {
  message: string;
  status: number;
}

export type AuthorApiResult<T> = ApiResult<T>;
