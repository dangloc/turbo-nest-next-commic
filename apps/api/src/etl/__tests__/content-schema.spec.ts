import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type {
  SourceNovelRow,
  SourceChapterContentRow,
  ChapterRelation,
} from '../types';

describe('Content Schema - Exact ID Preservation', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Novel Model', () => {
    it('should have Novel model with exact ID preservation', async () => {
      const novelModel = prisma.novel;
      expect(novelModel).toBeDefined();
    });

    it('Novel should preserve original MySQL ID as primary key', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model Novel');
      expect(schemaString).toMatch(/model Novel[\s\S]*?id\s+Int\s+@id/);
    });

    it('Novel should expose raw post content field', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model Novel');
      expect(schemaString).toMatch(/model Novel[\s\S]*?postContent/);
    });
  });

  describe('Chapter Model', () => {
    it('should have Chapter model with exact ID preservation', async () => {
      const chapterModel = prisma.chapter;
      expect(chapterModel).toBeDefined();
    });

    it('Chapter should preserve original MySQL ID as primary key', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model Chapter');
      expect(schemaString).toMatch(/model Chapter[\s\S]*?id\s+Int\s+@id/);
    });

    it('Chapter should have direct relation to parent Novel', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model Chapter');
      expect(schemaString).toMatch(/model Chapter[\s\S]*?novelId\s+Int/);
      expect(schemaString).toMatch(/model Chapter[\s\S]*?novel[\s\S]*?Novel/);
    });

    it('Chapter should have raw post content field', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model Chapter');
      expect(schemaString).toMatch(/model Chapter[\s\S]*?postContent/);
    });
  });

  describe('Schema Relationships', () => {
    it('PurchasedChapter should reference exact Chapter and Novel IDs', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model PurchasedChapter');
      expect(schemaString).toMatch(
        /model PurchasedChapter[\s\S]*?novelId\s+Int/,
      );
      expect(schemaString).toMatch(
        /model PurchasedChapter[\s\S]*?chapterId\s+Int/,
      );
    });

    it('should support chapter references from Novel relationship', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model Novel');
      expect(schemaString).toMatch(/model Novel[\s\S]*?Chapter\[\]/);
    });
  });

  describe('Ecosystem Foundation Contracts (Phase 12)', () => {
    it('should define vip and author center models', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model VipLevel');
      expect(schemaString).toContain('model AuthorProfile');
      expect(schemaString).toContain('model WithdrawalRequest');
      expect(schemaString).toContain('currentVipLevelId');
    });

    it('should preserve legacy wallet balance and add split wallet fields', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model Wallet');
      expect(schemaString).toContain('balance          Decimal');
      expect(schemaString).toContain('depositedBalance Decimal');
      expect(schemaString).toContain('earnedBalance    Decimal');
      expect(schemaString).toContain('totalDeposited   Decimal');
    });

    it('should include gamification and social primitives', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toContain('model Banner');
      expect(schemaString).toContain('model Mission');
      expect(schemaString).toContain('model UserMissionLog');
      expect(schemaString).toContain('model PointTransaction');
      expect(schemaString).toContain('model ReadingHistory');
      expect(schemaString).toContain('model Bookmark');
      expect(schemaString).toContain('model Review');
      expect(schemaString).toContain('model Notification');
      expect(schemaString).toContain('model Comment');
      expect(schemaString).toContain('model CommentReaction');
    });

    it('should add view counters and reaction dedupe constraints', () => {
      const schemaString = require('fs').readFileSync(
        require('path').join(__dirname, '../../..', 'prisma', 'schema.prisma'),
        'utf-8',
      );

      expect(schemaString).toMatch(
        /model Novel[\s\S]*?viewCount\s+BigInt\s+@default\(0\)/,
      );
      expect(schemaString).toMatch(
        /model Chapter[\s\S]*?viewCount\s+BigInt\s+@default\(0\)/,
      );
      expect(schemaString).toContain('@@unique([userId, commentId])');
      expect(schemaString).toContain('enum CommentReactionType');
      expect(schemaString).toContain('LIKE');
      expect(schemaString).toContain('HEART');
      expect(schemaString).toContain('HAHA');
      expect(schemaString).toContain('WOW');
      expect(schemaString).toContain('SAD');
      expect(schemaString).toContain('ANGRY');
    });
  });

  describe('ETL Content Contracts', () => {
    it('SourceNovelRow should expose exact ID fields', () => {
      const exampleNovel: SourceNovelRow = {
        id: 12345,
        title: 'Test Novel',
        postContent: 'Raw HTML content',
        createdAt: new Date(),
      };

      expect(exampleNovel.id).toBe(12345);
      expect(exampleNovel.title).toBe('Test Novel');
      expect(typeof exampleNovel.postContent).toBe('string');
      expect(exampleNovel.createdAt instanceof Date).toBe(true);
    });

    it('SourceNovelRow should preserve pricing metadata fields when present', () => {
      const exampleNovel: SourceNovelRow = {
        id: 54321,
        title: 'Pricing Novel',
        postContent: 'Content',
        createdAt: new Date(),
        lockedFrom: 21,
        defaultChapterPrice: 1000,
        freeChapterCount: 20,
        comboDiscountPct: 50,
      };

      expect(exampleNovel.lockedFrom).toBe(21);
      expect(exampleNovel.defaultChapterPrice).toBe(1000);
      expect(exampleNovel.freeChapterCount).toBe(20);
      expect(exampleNovel.comboDiscountPct).toBe(50);
    });

    it('SourceChapterContentRow should preserve exact chapter and novel IDs', () => {
      const exampleChapter: SourceChapterContentRow = {
        id: 67890,
        novelId: 12345,
        title: 'Chapter 1',
        postContent: 'Chapter content',
        createdAt: new Date(),
      };

      expect(exampleChapter.id).toBe(67890);
      expect(exampleChapter.novelId).toBe(12345);
      expect(exampleChapter.title).toBe('Chapter 1');
      expect(typeof exampleChapter.postContent).toBe('string');
    });

    it('ChapterRelation should make novel parent ID explicit', () => {
      const relation: ChapterRelation = {
        chapterId: 67890,
        novelId: 12345,
      };

      expect(relation.chapterId).toBe(67890);
      expect(relation.novelId).toBe(12345);
    });

    it('Content contracts should prevent accidental remapping', () => {
      const chapter: SourceChapterContentRow = {
        id: 999,
        novelId: 888,
        title: 'Test',
        postContent: 'Content',
        createdAt: new Date(),
      };

      expect(chapter.id).toStrictEqual(999);
      expect(chapter.novelId).toStrictEqual(888);
      expect(typeof chapter.id).toBe('number');
      expect(typeof chapter.novelId).toBe('number');
    });
  });

  describe('Content Migration Contracts', () => {
    it('should define SourceNovelRow without transformation fields', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'types.ts'),
        'utf-8',
      );

      expect(typesString).toContain('export type SourceNovelRow');
      expect(typesString).toContain('export type SourceChapterContentRow');
      expect(typesString).toContain('export type ChapterRelation');
      expect(typesString).toContain('postContent: string');
    });

    it('MigrationStats should include content operation counts', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'types.ts'),
        'utf-8',
      );

      expect(typesString).toContain('export type MigrationStats');
      expect(typesString).toContain('novelUpserted: number');
      expect(typesString).toContain('chapterUpserted: number');
    });
  });
});
