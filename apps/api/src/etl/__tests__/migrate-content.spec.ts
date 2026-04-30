import { migrateChapters, migrateNovels } from '../migrate-content';
import type { SourceChapterContentRow, SourceNovelRow } from '../types';

describe('migrate-content', () => {
  describe('migrateNovels', () => {
    it('upserts each novel row and returns count', async () => {
      const rows: SourceNovelRow[] = [
        {
          id: 101,
          title: 'Novel A',
          postContent: '<p>A</p>',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 102,
          title: 'Novel B',
          postContent: '<p>B</p>',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ];

      const calls: SourceNovelRow[] = [];
      const result = await migrateNovels(rows, {
        repo: {
          upsert: async (row) => {
            calls.push(row);
          },
        },
      });

      expect(calls).toEqual(rows);
      expect(result).toEqual({ novelsUpserted: 2 });
    });

    it('returns zero when no novels exist', async () => {
      let called = false;

      const result = await migrateNovels([], {
        repo: {
          upsert: async () => {
            called = true;
          },
        },
      });

      expect(called).toBe(false);
      expect(result).toEqual({ novelsUpserted: 0 });
    });
  });

  describe('migrateChapters', () => {
    it('upserts each chapter row and preserves parent novelId', async () => {
      const rows: SourceChapterContentRow[] = [
        {
          id: 201,
          novelId: 101,
          title: 'Chapter 1',
          postContent: '<p>C1</p>',
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
        },
        {
          id: 202,
          novelId: 101,
          title: 'Chapter 2',
          postContent: '<p>C2</p>',
          createdAt: new Date('2026-01-04T00:00:00.000Z'),
        },
      ];

      const calls: SourceChapterContentRow[] = [];
      const result = await migrateChapters(rows, {
        repo: {
          upsert: async (row) => {
            calls.push(row);
          },
        },
      });

      expect(calls).toEqual(rows);
      expect(calls[0].novelId).toBe(101);
      expect(calls[1].novelId).toBe(101);
      expect(result).toEqual({ chaptersUpserted: 2 });
    });

    it('returns zero when no chapters exist', async () => {
      let called = false;

      const result = await migrateChapters([], {
        repo: {
          upsert: async () => {
            called = true;
          },
        },
      });

      expect(called).toBe(false);
      expect(result).toEqual({ chaptersUpserted: 0 });
    });
  });
});
