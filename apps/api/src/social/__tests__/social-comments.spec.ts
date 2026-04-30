import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SocialCommentsController } from '../social-comments.controller';
import { SocialService } from '../social.service';

describe('Social comments', () => {
  const prisma = {
    comment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    novel: {
      findUnique: jest.fn(),
    },
    chapter: {
      findUnique: jest.fn(),
    },
    pointTransaction: {
      findFirst: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
  } as any;

  let service: SocialService;
  let controller: SocialCommentsController;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.pointTransaction.findFirst.mockResolvedValue({ id: 1 });
    prisma.pointTransaction.aggregate.mockResolvedValue({
      _sum: { amount: 0 },
    });
    service = new SocialService(prisma);
    controller = new SocialCommentsController(service);
  });

  function commentRecord(overrides: Partial<any>) {
    return {
      id: 1,
      userId: 9,
      novelId: null,
      chapterId: null,
      parentId: null,
      content: 'Comment',
      createdAt: new Date('2026-04-08T10:00:00.000Z'),
      updatedAt: new Date('2026-04-08T10:00:00.000Z'),
      user: {
        id: 9,
        nickname: 'Reader',
        avatar: null,
        role: 'USER',
      },
      reactions: [],
      ...overrides,
    };
  }

  it('summarizes reactions and includes the viewer reaction in comment payloads', async () => {
    prisma.comment.findMany.mockResolvedValue([
      commentRecord({
        id: 10,
        novelId: 15,
        content: 'Root with reactions',
        reactions: [
          { userId: 42, type: 'LIKE' },
          { userId: 51, type: 'LIKE' },
          { userId: 64, type: 'HEART' },
        ],
      }),
    ]);

    const tree = await service.listComments({ novelId: 15 }, 42);

    expect(tree[0]).toMatchObject({
      id: 10,
      reactionCount: 3,
      viewerReaction: 'LIKE',
      reactions: [
        { type: 'LIKE', count: 2 },
        { type: 'HEART', count: 1 },
      ],
    });
  });

  it('returns nested tree for novel scope with deterministic reply ordering', async () => {
    prisma.comment.findMany.mockResolvedValue([
      commentRecord({ id: 3, parentId: 2, content: 'Reply 2.1' }),
      commentRecord({
        id: 1,
        parentId: null,
        content: 'Root A',
        createdAt: new Date('2026-04-08T10:00:00.000Z'),
      }),
      commentRecord({
        id: 4,
        parentId: 2,
        content: 'Reply 2.2',
        createdAt: new Date('2026-04-08T10:03:00.000Z'),
      }),
      commentRecord({
        id: 2,
        parentId: 1,
        content: 'Reply 1.1',
        createdAt: new Date('2026-04-08T10:01:00.000Z'),
      }),
    ]);

    const tree = await service.listComments({ novelId: 15 });

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      id: 1,
      parentId: null,
      content: 'Root A',
      replies: [
        {
          id: 2,
          parentId: 1,
          content: 'Reply 1.1',
          replies: [
            { id: 3, parentId: 2, content: 'Reply 2.1', replies: [] },
            { id: 4, parentId: 2, content: 'Reply 2.2', replies: [] },
          ],
        },
      ],
    });

    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { novelId: 15, chapterId: undefined },
      }),
    );
  });

  it('rejects ambiguous scope inputs and mixed novel/chapter queries', async () => {
    await expect(
      service.listComments({ novelId: 15, chapterId: 22 }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.listComments({})).rejects.toThrow(BadRequestException);
  });

  it('creates top-level comments, validates reply scope, and rejects mismatches', async () => {
    prisma.novel.findUnique.mockResolvedValue({ id: 15 });
    prisma.chapter.findUnique.mockResolvedValue({ id: 77 });
    prisma.comment.findUnique.mockResolvedValue({
      id: 21,
      novelId: 15,
      chapterId: null,
      parentId: null,
    });
    prisma.comment.create
      .mockResolvedValueOnce(
        commentRecord({
          id: 30,
          novelId: 15,
          parentId: null,
          content: 'Fresh comment',
        }),
      )
      .mockResolvedValueOnce(
        commentRecord({
          id: 31,
          novelId: 15,
          parentId: 21,
          content: 'Reply',
        }),
      );

    await expect(
      service.createComment(42, { content: 'Fresh comment', novelId: 15 }),
    ).resolves.toMatchObject({
      id: 30,
      novelId: 15,
      chapterId: null,
      parentId: null,
      author: { id: 9 },
    });

    await expect(
      service.createComment(42, {
        content: 'Reply',
        parentId: 21,
        novelId: 15,
      }),
    ).resolves.toMatchObject({
      id: 31,
      parentId: 21,
      novelId: 15,
      chapterId: null,
      author: { id: 9 },
    });

    await expect(
      service.createComment(42, {
        content: 'Mismatch',
        parentId: 21,
        chapterId: 77,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.novel.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 15 } }),
    );
  });

  it('exposes guarded write metadata and blocks unauthenticated create attempts', async () => {
    const roles = Reflect.getMetadata(ROLES_KEY, controller.createComment);
    expect(roles).toEqual(['USER', 'AUTHOR', 'ADMIN']);
    expect(
      Reflect.getMetadata(ROLES_KEY, controller.upsertNovelReview),
    ).toEqual(['USER', 'AUTHOR', 'ADMIN']);

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['USER', 'AUTHOR', 'ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const unauthenticatedContext = {
      getHandler: () => 'handler',
      getClass: () => 'classRef',
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };

    await expect(
      guard.canActivate(unauthenticatedContext as any),
    ).rejects.toThrow('Authentication required');
  });

  it('passes parsed novelId scope through the controller', async () => {
    prisma.comment.findMany.mockResolvedValue([]);

    await expect(
      controller.listComments('15', undefined, { user: { id: 42 } }),
    ).resolves.toEqual([]);
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { novelId: 15, chapterId: undefined },
      }),
    );
  });

  it('returns novel review summary with average and viewer review', async () => {
    const createdAt = new Date('2026-04-27T10:00:00.000Z');
    prisma.novel.findUnique.mockResolvedValue({ id: 15 });
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.333333 },
      _count: { rating: 3 },
    });
    prisma.review.findUnique.mockResolvedValue({
      id: 12,
      userId: 42,
      novelId: 15,
      rating: 5,
      content: 'Worth reading',
      createdAt,
      updatedAt: createdAt,
    });

    await expect(
      controller.getNovelReviewSummary(15, { user: { id: 42 } }),
    ).resolves.toEqual({
      novelId: 15,
      averageRating: 4.33,
      ratingCount: 3,
      viewerReview: expect.objectContaining({
        id: 12,
        userId: 42,
        novelId: 15,
        rating: 5,
      }),
    });

    expect(prisma.review.aggregate).toHaveBeenCalledWith({
      where: { novelId: 15 },
      _avg: { rating: true },
      _count: { rating: true },
    });
    expect(prisma.review.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_novelId: {
            userId: 42,
            novelId: 15,
          },
        },
      }),
    );
  });

  it('lists novel reviews with reviewer metadata', async () => {
    const createdAt = new Date('2026-04-27T10:00:00.000Z');
    prisma.novel.findUnique.mockResolvedValue({ id: 15 });
    prisma.review.count.mockResolvedValue(1);
    prisma.review.findMany.mockResolvedValue([
      {
        id: 22,
        userId: 9,
        novelId: 15,
        rating: 5,
        content: 'Detailed review',
        createdAt,
        updatedAt: createdAt,
        user: { id: 9, nickname: 'Reader', avatar: null },
      },
    ]);

    await expect(controller.listNovelReviews(15, '1', '5')).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 22,
          rating: 5,
          user: expect.objectContaining({ id: 9 }),
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1,
    });

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { novelId: 15 },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 5,
      }),
    );
  });

  it('rejects invalid novel review ratings', async () => {
    await expect(
      service.upsertNovelReview(42, 15, { rating: 6, content: 'Too high' }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.review.upsert).not.toHaveBeenCalled();
  });

  it('upserts one review per user and returns refreshed summary', async () => {
    const createdAt = new Date('2026-04-27T10:00:00.000Z');
    prisma.novel.findUnique.mockResolvedValue({ id: 15 });
    prisma.review.upsert.mockResolvedValue({
      id: 12,
      userId: 42,
      novelId: 15,
      rating: 4,
      content: 'Updated review',
      createdAt,
      updatedAt: createdAt,
    });
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    });
    prisma.review.findUnique.mockResolvedValue({
      id: 12,
      userId: 42,
      novelId: 15,
      rating: 4,
      content: 'Updated review',
      createdAt,
      updatedAt: createdAt,
    });

    await expect(
      service.upsertNovelReview(42, 15, {
        rating: 4,
        content: ' Updated review ',
      }),
    ).resolves.toMatchObject({
      novelId: 15,
      averageRating: 4.5,
      ratingCount: 2,
      viewerReview: {
        id: 12,
        userId: 42,
        novelId: 15,
        rating: 4,
        content: 'Updated review',
      },
    });

    expect(prisma.review.upsert).toHaveBeenCalledWith({
      where: {
        userId_novelId: {
          userId: 42,
          novelId: 15,
        },
      },
      update: {
        rating: 4,
        content: 'Updated review',
      },
      create: {
        userId: 42,
        novelId: 15,
        rating: 4,
        content: 'Updated review',
      },
    });
  });

  it('awards the daily review mission once after a novel review', async () => {
    prisma.novel.findUnique.mockResolvedValue({ id: 15 });
    prisma.review.upsert.mockResolvedValue({
      id: 12,
      userId: 42,
      novelId: 15,
      rating: 5,
      content: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 5 },
      _count: { rating: 1 },
    });
    prisma.review.findUnique.mockResolvedValue(null);
    prisma.pointTransaction.findFirst.mockResolvedValue(null);
    prisma.pointTransaction.aggregate.mockResolvedValue({
      _sum: { amount: 1000 },
    });

    await service.upsertNovelReview(42, 15, { rating: 5 });

    expect(prisma.pointTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 42,
          amount: 500,
          balanceAfter: 1500,
          reason: 'NOVEL_REVIEW',
        }),
      }),
    );
  });

  it('awards the daily comment mission once after a comment', async () => {
    prisma.novel.findUnique.mockResolvedValue({ id: 15 });
    prisma.comment.create.mockResolvedValue(
      commentRecord({
        id: 40,
        userId: 42,
        novelId: 15,
        content: 'Mission comment',
      }),
    );
    prisma.pointTransaction.findFirst.mockResolvedValue(null);
    prisma.pointTransaction.aggregate.mockResolvedValue({
      _sum: { amount: 500 },
    });

    await service.createComment(42, {
      novelId: 15,
      content: 'Mission comment',
    });

    expect(prisma.pointTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 42,
          amount: 700,
          balanceAfter: 1200,
          reason: 'COMMENT',
        }),
      }),
    );
  });

  it('returns recent reviews with user and novel metadata', async () => {
    const createdAt = new Date('2026-04-27T10:00:00.000Z');
    prisma.review.findMany.mockResolvedValue([
      {
        id: 7,
        rating: 5,
        content: 'Great story',
        createdAt,
        updatedAt: createdAt,
        user: { id: 9, nickname: 'Reader', avatar: null },
        novel: { id: 15, title: 'Novel', featuredImage: null },
      },
    ]);

    await expect(controller.listRecentReviews('6')).resolves.toEqual([
      expect.objectContaining({
        id: 7,
        rating: 5,
        novel: expect.objectContaining({ id: 15 }),
      }),
    ]);
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
    );
  });

  it('falls back to recent comments when no reviews exist', async () => {
    const createdAt = new Date('2026-04-27T10:00:00.000Z');
    prisma.review.findMany.mockResolvedValue([]);
    prisma.comment.findMany.mockResolvedValue([
      {
        id: 18,
        content: 'Comment review',
        createdAt,
        updatedAt: createdAt,
        user: { id: 9, nickname: 'Reader', avatar: null },
        novel: { id: 15, title: 'Novel', featuredImage: null },
        chapter: null,
      },
    ]);

    await expect(controller.listRecentReviews('3')).resolves.toEqual([
      expect.objectContaining({
        id: 18,
        rating: 5,
        content: 'Comment review',
        novel: expect.objectContaining({ id: 15 }),
      }),
    ]);
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ novelId: { not: null } }, { chapterId: { not: null } }],
        },
        take: 3,
      }),
    );
  });
});
