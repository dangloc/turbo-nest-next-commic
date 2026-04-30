import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RewardAdsService } from '../reward-ads.service';

describe('RewardAdsService', () => {
  const originalEnv = process.env.REWARD_AD_SMARTLINK_URL;

  afterEach(() => {
    jest.useRealTimers();
    if (originalEnv === undefined) {
      delete process.env.REWARD_AD_SMARTLINK_URL;
    } else {
      process.env.REWARD_AD_SMARTLINK_URL = originalEnv;
    }
  });

  it('creates a reward ad session with a 30 second claim gate', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-04-30T09:00:00.000Z').getTime());
    process.env.REWARD_AD_SMARTLINK_URL = 'https://ads.example/smartlink';

    const startedAt = new Date('2026-04-30T09:00:00.000Z');
    const claimableAt = new Date('2026-04-30T09:00:30.000Z');
    const prisma = {
      rewardAdSession: {
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'session-1',
          userId: 42,
          smartlinkUrl: 'https://ads.example/smartlink',
          startedAt,
          claimableAt,
        }),
      },
    };
    const service = new RewardAdsService(prisma as any);

    await expect(service.createSession(42)).resolves.toEqual({
      sessionId: 'session-1',
      smartlinkUrl: 'https://ads.example/smartlink',
      startedAt,
      claimableAt,
      viewSeconds: 30,
      points: 500,
      dailyLimit: 3,
      claimedToday: 1,
      remainingClaims: 2,
    });

    expect(prisma.rewardAdSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 42,
        smartlinkUrl: 'https://ads.example/smartlink',
        startedAt,
        claimableAt,
      }),
    });
  });

  it('reuses an unclaimed session instead of creating more sessions on refresh', async () => {
    process.env.REWARD_AD_SMARTLINK_URL = 'https://ads.example/smartlink';

    const existing = {
      id: 'session-1',
      userId: 42,
      smartlinkUrl: 'https://ads.example/smartlink',
      startedAt: new Date('2026-04-30T09:00:00.000Z'),
      claimableAt: new Date('2026-04-30T09:00:30.000Z'),
    };
    const prisma = {
      rewardAdSession: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    };
    const service = new RewardAdsService(prisma as any);

    await expect(service.createSession(42)).resolves.toMatchObject({
      sessionId: 'session-1',
      remainingClaims: 3,
    });
    expect(prisma.rewardAdSession.create).not.toHaveBeenCalled();
  });

  it('claims a valid session once and writes reward points', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-04-30T09:01:00.000Z').getTime());

    const prisma = {
      rewardAdSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          userId: 42,
          smartlinkUrl: 'https://ads.example/smartlink',
          startedAt: new Date('2026-04-30T09:00:00.000Z'),
          claimableAt: new Date('2026-04-30T09:00:30.000Z'),
          claimedAt: null,
        }),
        count: jest
          .fn()
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(2),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pointTransaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1200 } }),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    const service = new RewardAdsService(prisma as any);

    await expect(service.claimSession(42, 'session-1')).resolves.toMatchObject({
      sessionId: 'session-1',
      pointsAwarded: 500,
      pointBalance: 1700,
      claimedToday: 2,
      remainingClaims: 1,
    });

    expect(prisma.rewardAdSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        userId: 42,
        claimedAt: null,
        claimableAt: { lte: new Date('2026-04-30T09:01:00.000Z') },
      },
      data: { claimedAt: new Date('2026-04-30T09:01:00.000Z') },
    });
    expect(prisma.pointTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 42,
        amount: 500,
        balanceAfter: 1700,
        reason: 'REWARD_AD_VIEW',
        referenceId: 'REWARD_AD:session-1',
      }),
    });
  });

  it('rejects early claim and reached daily quota', async () => {
    const earlyPrisma = {
      rewardAdSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-early',
          userId: 42,
          claimableAt: new Date(Date.now() + 30_000),
          claimedAt: null,
        }),
      },
      $transaction: jest.fn((callback) => callback(earlyPrisma)),
    };
    await expect(
      new RewardAdsService(earlyPrisma as any).claimSession(42, 'session-early'),
    ).rejects.toThrow(BadRequestException);

    process.env.REWARD_AD_SMARTLINK_URL = 'https://ads.example/smartlink';
    const quotaPrisma = {
      rewardAdSession: {
        count: jest.fn().mockResolvedValue(3),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    await expect(
      new RewardAdsService(quotaPrisma as any).createSession(42),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires a configured smartlink url before creating sessions', async () => {
    delete process.env.REWARD_AD_SMARTLINK_URL;
    delete process.env.ADSTERRA_SMARTLINK_URL;

    const prisma = {
      rewardAdSession: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };

    await expect(
      new RewardAdsService(prisma as any).createSession(42),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('uses admin ad settings for reward session configuration', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-04-30T09:00:00.000Z').getTime());

    const startedAt = new Date('2026-04-30T09:00:00.000Z');
    const claimableAt = new Date('2026-04-30T09:00:45.000Z');
    const prisma = {
      rewardAdSession: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'session-configured',
          userId: 42,
          smartlinkUrl: 'https://ads.example/configured',
          startedAt,
          claimableAt,
        }),
      },
    };
    const adSettingsService = {
      getRewardAdsRuntimeSettings: jest.fn().mockResolvedValue({
        enabled: true,
        smartlinkUrl: 'https://ads.example/configured',
        points: 900,
        dailyLimit: 5,
        viewSeconds: 45,
      }),
    };
    const service = new RewardAdsService(
      prisma as any,
      adSettingsService as any,
    );

    await expect(service.createSession(42)).resolves.toEqual({
      sessionId: 'session-configured',
      smartlinkUrl: 'https://ads.example/configured',
      startedAt,
      claimableAt,
      viewSeconds: 45,
      points: 900,
      dailyLimit: 5,
      claimedToday: 0,
      remainingClaims: 5,
    });
  });

  it('rejects new reward sessions when reward ads are disabled in admin settings', async () => {
    const prisma = {
      rewardAdSession: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    const adSettingsService = {
      getRewardAdsRuntimeSettings: jest.fn().mockResolvedValue({
        enabled: false,
        smartlinkUrl: null,
        points: 500,
        dailyLimit: 3,
        viewSeconds: 30,
      }),
    };

    await expect(
      new RewardAdsService(
        prisma as any,
        adSettingsService as any,
      ).createSession(42),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
