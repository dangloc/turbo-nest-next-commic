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

export interface ReaderChapterOpenInput {
  chapterId: number;
  novelId?: number;
  progressPercent?: number;
  clientUpdatedAt?: string;
}

export type ReaderSyncPolicy =
  | "first-open-create"
  | "last-write-accept-client"
  | "last-write-keep-server";

export interface ReaderChapterOpenResult {
  chapterId: number;
  novelId: number;
  firstOpen: boolean;
  progressPercent: number;
  effectiveProgressPercent: number;
  serverAcceptedProgress: boolean;
  conflictDetected: boolean;
  appliedPolicy: ReaderSyncPolicy;
  clientUpdatedAt: string | null;
  serverLastReadAt: string;
  lastReadAt: string;
}

export type ReaderFontSizeOption = "sm" | "md" | "lg";

export type ReaderThemeMode = "light" | "dark";

export type ReaderFontFamilyOption = "serif" | "sans" | "mono";

export type ReaderLineHeightOption = "compact" | "comfortable" | "airy";

export type ReaderContentWidthOption = "narrow" | "standard" | "wide";

export interface ReaderTypographyPreferences {
  fontSize: ReaderFontSizeOption;
  themeMode: ReaderThemeMode;
  fontFamily: ReaderFontFamilyOption;
  lineHeight: ReaderLineHeightOption;
  contentWidth: ReaderContentWidthOption;
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
