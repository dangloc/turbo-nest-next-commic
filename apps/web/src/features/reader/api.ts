import type { ApiResult } from "../../lib/api/types";
import {
  fetchNovelPricing,
  fetchWalletSummary,
  purchaseChapter,
  purchaseNovelCombo,
  type ComboPurchaseResult,
  type NovelPricingResponse,
  type PurchaseChapterResult,
  type WalletSummaryResponse,
} from "../finance/api";
import {
  buildChapterHref,
  buildNovelHref,
  normalizeChapterId,
  type BookmarkEntry,
  type BookmarkListResponse,
  type NovelRecommendationStatus,
  type ReaderChapter,
  type ReaderChapterContext,
  type ReaderNovel,
  type ReaderPurchaseAction,
  type ReadingHistoryEntry,
  type ReadingHistoryUpsertInput,
  type ReaderChapterOpenInput,
  type ReaderChapterOpenResult,
} from "./types";
import { apiRequest } from "../../lib/api/http";

export {
  buildChapterHref,
  buildNovelHref,
  fetchWalletSummary,
  normalizeChapterId,
};

export type { WalletSummaryResponse };

export interface FirstChapterLookup {
  chapterId: number | null;
}

export interface ChapterLikeStatus {
  chapterId: number;
  liked: boolean;
  totalLikes: number;
  pointsAwarded: number;
  alreadyLiked: boolean;
}

export async function fetchNovelById(novelId: number): Promise<ApiResult<ReaderNovel | null>> {
  return apiRequest<ReaderNovel | null>(`/novels/${novelId}`, {
    method: "GET",
  });
}

export async function fetchFirstChapterByNovelId(
  novelId: number,
): Promise<ApiResult<FirstChapterLookup>> {
  return apiRequest<FirstChapterLookup>(`/novels/${novelId}/first-chapter`, {
    method: "GET",
  });
}

export async function fetchChaptersByNovelId(
  novelId: number,
): Promise<ApiResult<ReaderChapter[]>> {
  return apiRequest<ReaderChapter[]>(`/novels/${novelId}/chapters`, {
    method: "GET",
  });
}

export async function fetchChapterById(
  chapterId: number,
): Promise<ApiResult<ReaderChapter>> {
  return apiRequest<ReaderChapter>(`/reader/chapters/${chapterId}`, {
    method: "GET",
  });
}

export async function fetchChapterContextById(
  chapterId: number,
  novelId?: number,
): Promise<ApiResult<ReaderChapterContext>> {
  const suffix = novelId ? `?novelId=${novelId}` : "";
  return apiRequest<ReaderChapterContext>(`/reader/chapters/${chapterId}/context${suffix}`, {
    method: "GET",
  });
}

export async function fetchChapterLikeStatus(
  chapterId: number,
  token?: string,
): Promise<ApiResult<ChapterLikeStatus>> {
  return apiRequest<ChapterLikeStatus>(`/reader/me/chapters/${chapterId}/like`, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function likeReaderChapter(
  chapterId: number,
  token?: string,
): Promise<ApiResult<ChapterLikeStatus>> {
  return apiRequest<ChapterLikeStatus>(`/reader/me/chapters/${chapterId}/like`, {
    method: "POST",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

function authHeaders(token?: string) {
  if (!token) {
    return undefined;
  }

  return {
    authorization: `Bearer ${token}`,
  };
}

export async function fetchReadingHistory(
  token?: string,
  novelId?: number,
): Promise<ApiResult<ReadingHistoryEntry[]>> {
  const suffix = novelId ? `?novelId=${novelId}` : "";
  return apiRequest<ReadingHistoryEntry[]>(`/reader/me/reading-history${suffix}`, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function fetchBookmarks(
  page = 1,
  pageSize = 10,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<BookmarkListResponse>> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const params = new URLSearchParams({
    page: String(safePage),
    pageSize: String(safePageSize),
  });

  return apiRequest<BookmarkListResponse>(`/reader/me/bookmarks?${params.toString()}`, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function fetchBookmarkEntries(
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<BookmarkEntry[]>> {
  return apiRequest<BookmarkEntry[]>("/reader/me/bookmarks", {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function addBookmark(
  input: { novelId: number; chapterId?: number; note?: string },
  token?: string,
): Promise<ApiResult<BookmarkEntry>> {
  return apiRequest<BookmarkEntry>("/reader/me/bookmarks", {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function removeBookmark(
  bookmarkId: number,
  token?: string,
): Promise<ApiResult<{ deleted: true }>> {
  return apiRequest<{ deleted: true }>(`/reader/me/bookmarks/${bookmarkId}`, {
    method: "DELETE",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function fetchNovelRecommendationStatus(
  novelId: number,
  token?: string,
): Promise<ApiResult<NovelRecommendationStatus>> {
  return apiRequest<NovelRecommendationStatus>(`/reader/me/novels/${novelId}/recommendations`, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function recommendNovel(
  novelId: number,
  votes: number,
  token?: string,
): Promise<ApiResult<NovelRecommendationStatus>> {
  return apiRequest<NovelRecommendationStatus>(`/reader/me/novels/${novelId}/recommendations`, {
    method: "POST",
    headers: authHeaders(token),
    body: { votes },
    includeCredentials: true,
  });
}

export async function upsertReadingHistory(
  input: ReadingHistoryUpsertInput,
  token?: string,
): Promise<ApiResult<ReadingHistoryEntry>> {
  return apiRequest<ReadingHistoryEntry>("/reader/me/reading-history", {
    method: "PUT",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function syncReaderChapterOpen(
  input: ReaderChapterOpenInput,
  token?: string,
): Promise<ApiResult<ReaderChapterOpenResult>> {
  return apiRequest<ReaderChapterOpenResult>("/reader/me/chapter-opens", {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function purchaseReaderChapter(
  action: ReaderPurchaseAction,
  token?: string,
): Promise<ApiResult<PurchaseChapterResult>> {
  return purchaseChapter(action, token);
}

export async function fetchReaderNovelPricing(
  novelId: number,
  token?: string,
): Promise<ApiResult<NovelPricingResponse>> {
  return fetchNovelPricing(novelId, token);
}

export async function purchaseReaderNovelCombo(
  novelId: number,
  token?: string,
): Promise<ApiResult<ComboPurchaseResult>> {
  return purchaseNovelCombo(novelId, token);
}
