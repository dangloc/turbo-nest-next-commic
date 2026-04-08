import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import {
  buildChapterHref,
  buildNovelHref,
  normalizeChapterId,
  type ReaderChapter,
  type ReaderNovel,
  type ReadingHistoryEntry,
  type ReadingHistoryUpsertInput,
} from "./types";

export {
  buildChapterHref,
  buildNovelHref,
  normalizeChapterId,
};

export async function fetchNovelById(novelId: number): Promise<ApiResult<ReaderNovel | null>> {
  return apiRequest<ReaderNovel | null>(`/novels/${novelId}`, {
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
