import type { ApiResult } from "../../lib/api/types";
import {
  fetchNovelPricing,
  purchaseChapter,
  purchaseNovelCombo,
  type ComboPurchaseResult,
  type NovelPricingResponse,
  type PurchaseChapterResult,
} from "../finance/api";
import {
  buildChapterHref,
  buildNovelHref,
  normalizeChapterId,
  type ReaderChapter,
  type ReaderChapterContext,
  type ReaderNovel,
  type ReaderPurchaseAction,
  type ReadingHistoryEntry,
  type ReadingHistoryUpsertInput,
} from "./types";
import { apiRequest } from "../../lib/api/http";

export {
  buildChapterHref,
  buildNovelHref,
  normalizeChapterId,
};

export interface FirstChapterLookup {
  chapterId: number | null;
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
