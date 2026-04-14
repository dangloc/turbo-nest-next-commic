import type { ApiResult, SessionUser } from "../../lib/api/types";

export interface NovelRecord {
  id: number;
  title: string;
  postContent: string;
  uploaderId: number;
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
}

export interface ChapterFormInput {
  title: string;
  postContent: string;
  chapterNumber?: number;
  priceOverride?: number;
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
