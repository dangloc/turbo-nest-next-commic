export type ChapterOrderCandidate = {
  id: number;
  title?: string | null;
  chapterNumber?: number | null;
};

function normalizeChapterTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getChapterNumberFromTitle(
  title: string | null | undefined,
): number | null {
  if (!title) {
    return null;
  }

  const normalized = normalizeChapterTitle(title);
  const match = normalized.match(
    /\b(?:chuong|chapter)\s*[:#.-]?\s*(\d+(?:[.,]\d+)?)/,
  );
  if (!match?.[1]) {
    return null;
  }

  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getSafeChapterNumber(chapter: ChapterOrderCandidate): number {
  const value = Number(chapter.chapterNumber);
  return Number.isFinite(value) && value > 0
    ? value
    : Number.MAX_SAFE_INTEGER;
}

export function compareChaptersByReadableOrder(
  a: ChapterOrderCandidate,
  b: ChapterOrderCandidate,
): number {
  const titleNumberA = getChapterNumberFromTitle(a.title);
  const titleNumberB = getChapterNumberFromTitle(b.title);

  if (
    titleNumberA !== null &&
    titleNumberB !== null &&
    titleNumberA !== titleNumberB
  ) {
    return titleNumberA - titleNumberB;
  }

  if (titleNumberA !== null && titleNumberB === null) {
    return -1;
  }

  if (titleNumberA === null && titleNumberB !== null) {
    return 1;
  }

  const chapterNumberA = getSafeChapterNumber(a);
  const chapterNumberB = getSafeChapterNumber(b);
  if (chapterNumberA !== chapterNumberB) {
    return chapterNumberA - chapterNumberB;
  }

  return a.id - b.id;
}

export function sortChaptersByReadableOrder<T extends ChapterOrderCandidate>(
  chapters: T[],
): T[] {
  return [...chapters].sort(compareChaptersByReadableOrder);
}
