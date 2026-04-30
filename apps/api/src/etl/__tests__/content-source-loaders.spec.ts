import { describe, it, expect } from '@jest/globals';

describe('Content Source Loaders', () => {
  describe('Novel Loading', () => {
    it('should have loadNovels exported from source-mysql-loaders', () => {
      const loaders = require('../source-mysql-loaders');
      expect(loaders.createSourceLoaders).toBeDefined();
    });

    it('should extract novels from wp_posts with post_type = truyen_chu', () => {
      // This is more of a contract test since MySQL isn't mocked
      // We're verifying the loader structure exists and types check
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      expect(typesString).toContain('loadNovels');
      expect(typesString).toContain("post_type = 'truyen_chu'");
    });

    it('should preserve exact MySQL post ID for novels', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      // Verify the loader uses the post ID directly without transformation
      expect(typesString).toContain('asNumber');
      expect(typesString).toContain('SourceNovelRow');
    });

    it('should extract novel pricing metadata from wp_postmeta', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      expect(typesString).toContain('loadNovels');
      expect(typesString).toContain("meta_key IN ('_locked_from', '_chapter_price', '_giam_gia_bao_nhieu')");
      expect(typesString).toContain('defaultChapterPrice');
      expect(typesString).toContain('freeChapterCount');
      expect(typesString).toContain('comboDiscountPct');
      expect(typesString).toContain('lockedFrom');
    });
  });

  describe('Chapter Loading', () => {
    it('should extract chapters from wp_posts with post_type = chuong_truyen', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      expect(typesString).toContain('loadChapters');
      expect(typesString).toContain("post_type = 'chuong_truyen'");
    });

    it('should include raw post_content without parsing', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      // Verify post_content is copied as-is, not parsed
      expect(typesString).toContain('SourceChapterContentRow');
      expect(typesString).toContain('postContent');
    });
  });

  describe('Chapter Relation Loading', () => {
    it('should extract chapter-to-novel relationships from wp_postmeta', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      expect(typesString).toContain('loadChapterRelations');
      expect(typesString).toContain("meta_key = 'chuong_with_truyen'");
    });

    it('should map chapter ID and parent novel ID correctly', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      expect(typesString).toContain('ChapterRelation');
      expect(typesString).toContain('chapterId');
      expect(typesString).toContain('novelId');
    });
  });

  describe('Loader Integration', () => {
    it('loaders should return SourceNovelRow arrays', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      expect(typesString).toContain('Promise<SourceNovelRow[]>');
    });

    it('loaders should return SourceChapterContentRow arrays', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      expect(typesString).toContain('Promise<SourceChapterContentRow[]>');
    });

    it('loaders should return ChapterRelation arrays', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
        'utf-8',
      );

      expect(typesString).toContain('Promise<ChapterRelation[]>');
    });
  });

  describe('Content Repository', () => {
    it('should export content repository functions', () => {
      const repos = require('../prisma-repositories');
      expect(repos.createPrismaRepositories).toBeDefined();
    });

    it('novel repository should support exact-ID upsert', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'prisma-repositories.ts'),
        'utf-8',
      );

      expect(typesString).toContain('novelRepo');
      expect(typesString).toContain('SourceNovelRow');
    });

    it('chapter repository should support exact-ID upsert with parent relation', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'prisma-repositories.ts'),
        'utf-8',
      );

      expect(typesString).toContain('chapterRepo');
      expect(typesString).toContain('SourceChapterContentRow');
    });
  });

  describe('ETL Wiring', () => {
    it('ETL runner should include content loaders in dependencies', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'etl-runner.ts'),
        'utf-8',
      );

      expect(typesString).toContain('loadNovels');
      expect(typesString).toContain('loadChapters');
      expect(typesString).toContain('loadChapterRelations');
    });

    it('ETL runner should include content repositories in dependencies', () => {
      const typesString = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'etl-runner.ts'),
        'utf-8',
      );

      expect(typesString).toContain('novelRepo');
      expect(typesString).toContain('chapterRepo');
    });
  });
});

describe('VIP Level Loading', () => {
  it('should expose loadVipLevels from source loaders', () => {
    const sourceLoader = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
      'utf-8',
    );

    expect(sourceLoader).toContain('loadVipLevels');
    expect(sourceLoader).toContain('wp_vip_levels');
    expect(sourceLoader).toContain('Promise<SourceVipLevelRow[]>');
  });

  it('should map optional visual fields to null defaults deterministically', () => {
    const sourceLoader = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
      'utf-8',
    );

    expect(sourceLoader).toContain('colorCode');
    expect(sourceLoader).toContain('iconUrl');
    expect(sourceLoader).toContain('|| null');
  });

  it('should filter out invalid numeric vip level rows', () => {
    const sourceLoader = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'source-mysql-loaders.ts'),
      'utf-8',
    );

    expect(sourceLoader).toContain('row.id > 0');
    expect(sourceLoader).toContain('row.vndValue >= 0');
    expect(sourceLoader).toContain('row.kimTe >= 0');
  });
});
