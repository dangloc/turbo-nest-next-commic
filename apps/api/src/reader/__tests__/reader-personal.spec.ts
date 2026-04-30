import { UnauthorizedException } from '@nestjs/common';
import { ReaderPersonalController } from '../reader-personal.controller';
import { ReaderService } from '../reader.service';

describe('Reader personal APIs', () => {
  it('authenticated user can list/add/remove bookmarks scoped by own userId', async () => {
    const prisma = {
      bookmark: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 1, userId: 7, novelId: 1 }]),
        count: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 2, userId: 7, novelId: 2 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      readingHistory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const service = new ReaderService(prisma as any);

    await expect(service.listBookmarks(7)).resolves.toHaveLength(1);
    await expect(service.addBookmark(7, { novelId: 2 })).resolves.toEqual(
      expect.objectContaining({ userId: 7, novelId: 2 }),
    );
    await expect(service.removeBookmark(7, 2)).resolves.toEqual({
      deleted: true,
    });

    expect(prisma.bookmark.deleteMany).toHaveBeenCalledWith({
      where: { id: 2, userId: 7 },
    });
  });

  it('returns paginated bookmark rows scoped to the authenticated user', async () => {
    const now = new Date('2026-04-27T00:00:00.000Z');
    const prisma = {
      bookmark: {
        count: jest.fn().mockResolvedValue(12),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 3,
            userId: 9,
            novelId: 5,
            chapterId: 8,
            note: 'resume here',
            createdAt: now,
            novel: { id: 5, title: 'Novel', featuredImage: null },
            chapter: { id: 8, title: 'Chapter', chapterNumber: 2 },
          },
        ]),
        findFirst: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      readingHistory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const service = new ReaderService(prisma as any);

    await expect(service.listBookmarks(9, { page: 2, pageSize: 5 })).resolves.toEqual({
      items: [
        {
          id: 3,
          userId: 9,
          novelId: 5,
          chapterId: 8,
          note: 'resume here',
          createdAt: now,
          novel: { id: 5, title: 'Novel', featuredImage: null },
          chapter: { id: 8, title: 'Chapter', chapterNumber: 2 },
        },
      ],
      total: 12,
      page: 2,
      pageSize: 5,
      totalPages: 3,
    });

    expect(prisma.bookmark.count).toHaveBeenCalledWith({
      where: { userId: 9 },
    });
    expect(prisma.bookmark.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 9 },
        skip: 5,
        take: 5,
      }),
    );
  });

  it('reading history upsert and retrieval work for authenticated user', async () => {
    const now = new Date();
    const prisma = {
      bookmark: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      readingHistory: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 10,
          userId: 9,
          novelId: 2,
          chapterId: 3,
          progressPercent: 80,
          lastReadAt: now,
        }),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 10,
            userId: 9,
            novelId: 2,
            chapterId: 3,
            progressPercent: 80,
            lastReadAt: now,
          },
        ]),
      },
    };

    const service = new ReaderService(prisma as any);

    await expect(
      service.upsertReadingHistory(9, {
        novelId: 2,
        chapterId: 3,
        progressPercent: 80,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ userId: 9, progressPercent: 80 }),
    );

    await expect(service.listReadingHistory(9)).resolves.toHaveLength(1);
  });

  it('limits novel recommendations to five votes per user per day', async () => {
    const prisma = {
      novel: {
        findUnique: jest.fn().mockResolvedValue({ id: 20 }),
      },
      novelRecommendationVote: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { votes: 12 } })
          .mockResolvedValueOnce({ _sum: { votes: 3 } })
          .mockResolvedValueOnce({ _sum: { votes: 14 } })
          .mockResolvedValueOnce({ _sum: { votes: 5 } }),
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ votes: 2 })
          .mockResolvedValueOnce({ votes: 4 }),
        upsert: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };
    const service = new ReaderService(prisma as any);

    await expect(service.recommendNovel(9, 20, 2)).resolves.toMatchObject({
      novelId: 20,
      totalVotes: 14,
      dailyLimit: 5,
      remainingVotes: 0,
      usedVotesToday: 5,
      viewerVotesForNovelToday: 4,
    });

    expect(prisma.novelRecommendationVote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { votes: { increment: 2 } },
        create: expect.objectContaining({
          userId: 9,
          novelId: 20,
          votes: 2,
        }),
      }),
    );
  });

  it('awards recommendation points for each accepted recommendation vote', async () => {
    const prisma = {
      novel: {
        findUnique: jest.fn().mockResolvedValue({ id: 20 }),
      },
      novelRecommendationVote: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { votes: 10 } })
          .mockResolvedValueOnce({ _sum: { votes: 1 } })
          .mockResolvedValueOnce({ _sum: { votes: 13 } })
          .mockResolvedValueOnce({ _sum: { votes: 4 } }),
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ votes: 1 })
          .mockResolvedValueOnce({ votes: 4 }),
        upsert: jest.fn().mockResolvedValue({ id: 1 }),
      },
      pointTransaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1300 } }),
        create: jest.fn(),
      },
    };
    const service = new ReaderService(prisma as any);

    await service.recommendNovel(9, 20, 3);

    expect(prisma.pointTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 9,
          amount: 300,
          balanceAfter: 1600,
          reason: 'NOVEL_RECOMMENDATION',
        }),
      }),
    );
  });

  it('rejects recommendation votes beyond the daily quota', async () => {
    const prisma = {
      novel: {
        findUnique: jest.fn().mockResolvedValue({ id: 20 }),
      },
      novelRecommendationVote: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { votes: 12 } })
          .mockResolvedValueOnce({ _sum: { votes: 4 } }),
        findUnique: jest.fn().mockResolvedValue({ votes: 4 }),
        upsert: jest.fn(),
      },
    };
    const service = new ReaderService(prisma as any);

    await expect(service.recommendNovel(9, 20, 2)).rejects.toThrow(
      'Not enough recommendation votes remaining today',
    );
    expect(prisma.novelRecommendationVote.upsert).not.toHaveBeenCalled();
  });

  it('syncs missing action mission rewards when loading the mission board', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-04-29T10:00:00.000Z').getTime());

    const actionAt = new Date('2026-04-29T09:00:00.000Z');
    const prisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue({ id: 11 }),
      },
      comment: {
        findFirst: jest.fn().mockResolvedValue({ id: 12 }),
      },
      novelRecommendationVote: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { votes: 2 } }),
      },
      pointTransaction: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: 0 } })
          .mockResolvedValueOnce({ _sum: { amount: 1000 } })
          .mockResolvedValueOnce({ _sum: { amount: 0 } })
          .mockResolvedValueOnce({ _sum: { amount: 1500 } })
          .mockResolvedValueOnce({ _sum: { amount: 0 } })
          .mockResolvedValueOnce({ _sum: { amount: 2200 } })
          .mockResolvedValueOnce({ _sum: { amount: 2400 } })
          .mockResolvedValueOnce({ _sum: { amount: 2400 } }),
        create: jest.fn().mockResolvedValue({ id: 1 }),
        findMany: jest.fn().mockResolvedValue([
          { reason: 'NOVEL_REVIEW', createdAt: actionAt },
          { reason: 'COMMENT', createdAt: actionAt },
          { reason: 'NOVEL_RECOMMENDATION', createdAt: actionAt },
        ]),
      },
      mission: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userMissionLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((operations) => Promise.all(operations)),
    };
    const service = new ReaderService(prisma as any);

    try {
      const result = await service.getMissionBoard(42);
      const itemsById = Object.fromEntries(
        result.items.map((item) => [item.id, item]),
      );

      expect(prisma.review.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 42,
            OR: expect.arrayContaining([
              expect.objectContaining({ createdAt: expect.any(Object) }),
              expect.objectContaining({ updatedAt: expect.any(Object) }),
            ]),
          }),
        }),
      );
      expect(prisma.pointTransaction.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 42,
            amount: 500,
            balanceAfter: 1500,
            reason: 'NOVEL_REVIEW',
          }),
        }),
      );
      expect(prisma.pointTransaction.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 42,
            amount: 700,
            balanceAfter: 2200,
            reason: 'COMMENT',
          }),
        }),
      );
      expect(prisma.pointTransaction.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 42,
            amount: 200,
            balanceAfter: 2400,
            reason: 'NOVEL_RECOMMENDATION',
          }),
        }),
      );
      expect(itemsById[100003]).toMatchObject({
        status: 'COMPLETED',
        progress: 1,
      });
      expect(itemsById[100004]).toMatchObject({
        status: 'COMPLETED',
        progress: 1,
      });
      expect(itemsById[100005]).toMatchObject({
        status: 'COMPLETED',
        progress: 1,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows reward ad mission daily progress on the mission board', async () => {
    const actionAt = new Date('2026-04-30T09:00:00.000Z');
    const prisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      comment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      novelRecommendationVote: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { votes: 0 } }),
      },
      pointTransaction: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: 2000 } })
          .mockResolvedValueOnce({ _sum: { amount: 1000 } }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { reason: 'REWARD_AD_VIEW', createdAt: actionAt },
          { reason: 'REWARD_AD_VIEW', createdAt: actionAt },
        ]),
      },
      mission: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userMissionLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((operations) => Promise.all(operations)),
    };
    const service = new ReaderService(prisma as any);

    const result = await service.getMissionBoard(42);
    const rewardAdMission = result.items.find((item) => item.id === 100006);

    expect(rewardAdMission).toMatchObject({
      title: 'Xem quảng cáo',
      description: 'Xem nội dung tài trợ trong 30 giây.',
      points: 500,
      status: 'PENDING',
      progress: 2,
      targetProgress: 3,
      action: 'REWARD_AD',
    });
  });

  it('uses admin-configured reward ad values on the mission board', async () => {
    const actionAt = new Date('2026-04-30T09:00:00.000Z');
    const prisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      comment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      novelRecommendationVote: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { votes: 0 } }),
      },
      pointTransaction: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: 2200 } })
          .mockResolvedValueOnce({ _sum: { amount: 1000 } }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { reason: 'REWARD_AD_VIEW', createdAt: actionAt },
          { reason: 'REWARD_AD_VIEW', createdAt: actionAt },
          { reason: 'REWARD_AD_VIEW', createdAt: actionAt },
        ]),
      },
      mission: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userMissionLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((operations) => Promise.all(operations)),
    };
    const adSettingsService = {
      getRewardAdsRuntimeSettings: jest.fn().mockResolvedValue({
        enabled: true,
        smartlinkUrl: 'https://ads.example/configured',
        points: 750,
        dailyLimit: 4,
        viewSeconds: 40,
      }),
    };
    const service = new ReaderService(
      prisma as any,
      adSettingsService as any,
    );

    const result = await service.getMissionBoard(42);
    const rewardAdMission = result.items.find((item) => item.id === 100006);

    expect(rewardAdMission).toMatchObject({
      title: 'Xem quảng cáo',
      description: 'Xem nội dung tài trợ trong 40 giây.',
      points: 750,
      status: 'PENDING',
      progress: 3,
      targetProgress: 4,
      action: 'REWARD_AD',
    });
  });

  it('hides reward ad mission when ads are disabled globally', async () => {
    const prisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      comment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      novelRecommendationVote: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { votes: 0 } }),
      },
      pointTransaction: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { amount: 2200 } })
          .mockResolvedValueOnce({ _sum: { amount: 1000 } }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      mission: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userMissionLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((operations) => Promise.all(operations)),
    };
    const adSettingsService = {
      getRewardAdsRuntimeSettings: jest.fn().mockResolvedValue({
        enabled: false,
        smartlinkUrl: null,
        points: 750,
        dailyLimit: 4,
        viewSeconds: 40,
      }),
    };
    const service = new ReaderService(
      prisma as any,
      adSettingsService as any,
    );

    const result = await service.getMissionBoard(42);

    expect(result.items.find((item) => item.id === 100006)).toBeUndefined();
  });

  it('unauthenticated personal access is rejected', async () => {
    const service = {
      listBookmarks: jest.fn().mockRejectedValue(new UnauthorizedException()),
      addBookmark: jest.fn().mockRejectedValue(new UnauthorizedException()),
      removeBookmark: jest.fn().mockRejectedValue(new UnauthorizedException()),
      upsertReadingHistory: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException()),
      listReadingHistory: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException()),
    };
    const controller = new ReaderPersonalController(
      service as unknown as ReaderService,
    );

    await expect(controller.listBookmarks({})).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
