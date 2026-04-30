import { ReaderService } from '../reader.service';

describe('Reader discovery', () => {
  it('returns paginated novel list shape', async () => {
    const prisma = {
      novel: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([{ id: 1, title: 'Novel' }]),
      },
    };
    const service = new ReaderService(prisma as any);

    const result = await service.listNovels({ page: 1, limit: 10 });

    expect(result).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      }),
    );
    expect(result.items).toHaveLength(1);
  });

  it('maps sortBy/sortDir to orderBy and preserves deterministic ordering contract', async () => {
    const prisma = {
      novel: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ReaderService(prisma as any);

    await service.listNovels({ sortBy: 'viewCount', sortDir: 'asc' });

    expect(prisma.novel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { viewCount: 'asc' } }),
    );
  });

  it('uses recommendation vote aggregates when reader picks sort is requested', async () => {
    const prisma = {
      novel: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 8,
            title: 'Novel B',
            postContent: '...',
            featuredImage: null,
            viewCount: 50n,
            createdAt: new Date('2026-04-30T10:00:00.000Z'),
            updatedAt: new Date('2026-04-30T10:00:00.000Z'),
            _count: { chapters: 12 },
            uploader: null,
            terms: [],
          },
          {
            id: 5,
            title: 'Novel A',
            postContent: '...',
            featuredImage: null,
            viewCount: 100n,
            createdAt: new Date('2026-04-29T10:00:00.000Z'),
            updatedAt: new Date('2026-04-29T10:00:00.000Z'),
            _count: { chapters: 24 },
            uploader: null,
            terms: [],
          },
        ]),
      },
      novelRecommendationVote: {
        groupBy: jest.fn().mockResolvedValue([
          { novelId: 8, _sum: { votes: 17 } },
          { novelId: 5, _sum: { votes: 9 } },
        ]),
      },
    };
    const service = new ReaderService(prisma as any);

    const result = await service.listNovels({
      sortBy: 'recommendationVotes',
      sortDir: 'desc',
      page: 1,
      limit: 10,
    });

    expect(prisma.novelRecommendationVote.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['novelId'],
        orderBy: [{ _sum: { votes: 'desc' } }, { novelId: 'desc' }],
      }),
    );
    expect(prisma.novel.count).toHaveBeenCalledWith({
      where: {
        recommendationVotes: {
          some: {},
        },
      },
    });
    expect(result.items).toEqual([
      expect.objectContaining({ id: 8, recommendationVotes: 17 }),
      expect.objectContaining({ id: 5, recommendationVotes: 9 }),
    ]);
  });

  it('applies term-backed filters with the production taxonomies', async () => {
    const prisma = {
      novel: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ReaderService(prisma as any);

    await service.listNovels({
      author: 'kim-dung',
      category: 'fantasy',
      tag: 'hot',
      status: 'ongoing',
      releaseYear: '2026',
    });

    const args = prisma.novel.findMany.mock.calls[0][0];
    const whereJson = JSON.stringify(args.where);

    expect(args.where).toBeDefined();
    expect(whereJson).toContain('tac_gia');
    expect(whereJson).toContain('kim-dung');
    expect(whereJson).toContain('the_loai');
    expect(whereJson).toContain('fantasy');
    expect(whereJson).toContain('post_tag');
    expect(whereJson).toContain('hot');
    expect(whereJson).toContain('trang_thai');
    expect(whereJson).toContain('ongoing');
    expect(whereJson).toContain('nam_phat_hanh');
    expect(whereJson).toContain('2026');
  });

  it('applies text search across title and content', async () => {
    const prisma = {
      novel: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ReaderService(prisma as any);

    await service.listNovels({ q: 'kiem hiep' });

    const args = prisma.novel.findMany.mock.calls[0][0];
    expect(JSON.stringify(args.where)).toContain('kiem hiep');
    expect(JSON.stringify(args.where)).toContain('postContent');
  });
});
