import { NotFoundException } from '@nestjs/common';
import { ReaderService } from '../reader.service';

describe('Reader author profile', () => {
  it('resolves displayName from penName and returns aggregate stats', async () => {
    const updatedAt = new Date('2026-04-09T10:00:00.000Z');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          nickname: 'nick-fallback',
          avatar: 'https://cdn.example/avatar.png',
          authorProfile: {
            penName: 'Pen Name',
            bio: 'Author bio',
          },
        }),
      },
      novel: {
        count: jest.fn().mockResolvedValue(1),
        aggregate: jest.fn().mockResolvedValue({ _sum: { viewCount: BigInt(200) } }),
        findFirst: jest.fn().mockResolvedValue({ updatedAt }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 99,
            title: 'Novel A',
            viewCount: BigInt(200),
            createdAt: updatedAt,
            updatedAt,
            terms: [],
          },
        ]),
      },
      authorFollow: {
        count: jest.fn().mockResolvedValue(12),
        findUnique: jest.fn().mockResolvedValue({ id: 101 }),
      },
    };

    const service = new ReaderService(prisma as any);
    const result = await service.getAuthorProfile(7, { page: 1, limit: 12 }, 5);

    expect(result.author.displayName).toBe('Pen Name');
    expect(result.stats).toEqual({
      totalPublishedNovels: 1,
      totalViews: 200,
      latestUpdateAt: updatedAt,
      followerCount: 12,
      viewerFollowsAuthor: true,
    });
  });

  it('throws NotFoundException when author user does not exist', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      novel: {
        count: jest.fn(),
        aggregate: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      authorFollow: {
        count: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const service = new ReaderService(prisma as any);

    await expect(service.getAuthorProfile(404)).rejects.toThrow(NotFoundException);
  });

  it('falls back to nickname when penName is missing', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          nickname: 'nickname-only',
          avatar: null,
          authorProfile: {
            penName: null,
            bio: null,
          },
        }),
      },
      novel: {
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { viewCount: null } }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      authorFollow: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const service = new ReaderService(prisma as any);
    const result = await service.getAuthorProfile(8);

    expect(result.author.displayName).toBe('nickname-only');
    expect(result.stats.totalViews).toBe(0);
    expect(result.stats.followerCount).toBe(0);
    expect(result.stats.viewerFollowsAuthor).toBe(false);
    expect(result.catalog.total).toBe(0);
  });
});
