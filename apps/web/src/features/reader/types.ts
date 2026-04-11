export interface ReaderNovel {
  id: number;
  title: string;
  postContent: string;
  viewCount: number | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReaderChapter {
  id: number;
  novelId: number;
  title: string;
  postContent: string;
  viewCount: number | string;
}

export interface ReaderChapterTocItem {
  id: number;
  title: string;
}

export interface ReaderChapterContext {
  novelId: number;
  currentChapterId: number;
  previousChapterId: number | null;
  nextChapterId: number | null;
  chapters: ReaderChapterTocItem[];
}

export interface ReadingHistoryEntry {
  id: number;
  userId: number;
  novelId: number;
  chapterId: number | null;
  progressPercent: number;
  lastReadAt: string;
}

export interface ReadingHistoryUpsertInput {
  novelId: number;
  chapterId?: number;
  progressPercent: number;
}

export interface ReaderNavigationContext {
  novelId: number;
  chapterId: number;
}

export interface ReaderPurchaseAction {
  chapterId: number;
  novelId: number;
}

export type ReaderPurchaseStatus =
  | "purchased"
  | "already_owned"
  | "free_chapter"
  | "insufficient_balance";

export function normalizeChapterId(value: string | number | null | undefined) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null;
  }

  return normalized;
}

export function normalizeNovelId(value: string | number | null | undefined) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null;
  }

  return normalized;
}

export function buildNovelHref(novelId: number) {
  return `/novels/${novelId}`;
}

export function buildChapterHref(chapterId: number, novelId?: number) {
  if (novelId) {
    return `/reader/chapters/${chapterId}?novelId=${novelId}`;
  }

  return `/reader/chapters/${chapterId}`;
}
