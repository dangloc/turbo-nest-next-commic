import type { SourceChapterContentRow, SourceNovelRow } from './types';

export interface NovelContentRepo {
  upsert(novel: SourceNovelRow): Promise<void>;
}

export interface ChapterContentRepo {
  upsert(chapter: SourceChapterContentRow): Promise<void>;
}

export type ContentMigrationResult = {
  novelsUpserted: number;
  chaptersUpserted: number;
};

export async function migrateNovels(
  rows: SourceNovelRow[],
  deps: { repo: NovelContentRepo },
): Promise<{ novelsUpserted: number }> {
  let novelsUpserted = 0;

  for (const row of rows) {
    await deps.repo.upsert(row);
    novelsUpserted += 1;
  }

  return { novelsUpserted };
}

export async function migrateChapters(
  rows: SourceChapterContentRow[],
  deps: { repo: ChapterContentRepo },
): Promise<{ chaptersUpserted: number }> {
  let chaptersUpserted = 0;

  for (const row of rows) {
    await deps.repo.upsert(row);
    chaptersUpserted += 1;
  }

  return { chaptersUpserted };
}
