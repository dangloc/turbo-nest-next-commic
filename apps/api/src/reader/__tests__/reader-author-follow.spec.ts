import { ReaderService } from '../reader.service';

describe('Reader author follow graph', () => {
  it('followAuthor creates relation on first call and is idempotent on repeat', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce({ code: 'P2002' });

    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 7 })
          .mockResolvedValue({ id: 7 }),
      },
      authorFollow: {
        create,
        count: jest.fn().mockResolvedValue(3),
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
      },
      novel: {
        count: jest.fn(),
        aggregate: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      bookmark: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      chapter: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb({ chapter: { findUnique: jest.fn() }, novel: { update: jest.fn() }, readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } })),
    };

    const service = new ReaderService(prisma as any);

    const first = await service.followAuthor(11, 7);
    const second = await service.followAuthor(11, 7);

    expect(first.viewerFollowsAuthor).toBe(true);
    expect(second.viewerFollowsAuthor).toBe(true);
    expect(prisma.authorFollow.count).toHaveBeenCalledWith({ where: { authorId: 7 } });
  });

  it('unfollowAuthor is idempotent when relation is absent', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 7 }),
      },
      authorFollow: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(2),
      },
      novel: {
        count: jest.fn(),
        aggregate: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      bookmark: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      chapter: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb({ chapter: { findUnique: jest.fn() }, novel: { update: jest.fn() }, readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } })),
    };

    const service = new ReaderService(prisma as any);
    const result = await service.unfollowAuthor(11, 7);

    expect(result.viewerFollowsAuthor).toBe(false);
    expect(result.followerCount).toBe(2);
  });

  it('author profile returns followerCount and viewerFollowsAuthor', async () => {
    const now = new Date('2026-04-11T10:00:00.000Z');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          nickname: 'author7',
          avatar: null,
          authorProfile: { penName: 'Pen 7', bio: null },
        }),
      },
      novel: {
        count: jest.fn().mockResolvedValue(1),
        aggregate: jest.fn().mockResolvedValue({ _sum: { viewCount: BigInt(10) } }),
        findFirst: jest.fn().mockResolvedValue({ updatedAt: now }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      authorFollow: {
        count: jest.fn().mockResolvedValue(4),
        findUnique: jest.fn().mockResolvedValue({ id: 99 }),
      },
      readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      bookmark: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      chapter: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb({ chapter: { findUnique: jest.fn() }, novel: { update: jest.fn() }, readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } })),
    };

    const service = new ReaderService(prisma as any);
    const result = await service.getAuthorProfile(7, {}, 11);

    expect(result.stats.followerCount).toBe(4);
    expect(result.stats.viewerFollowsAuthor).toBe(true);
  });
});
