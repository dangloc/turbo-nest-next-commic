import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PointTransactionType } from '@prisma/client';
import {
  AdSettingsService,
  DEFAULT_REWARD_AD_DAILY_LIMIT,
  DEFAULT_REWARD_AD_POINTS,
  DEFAULT_REWARD_AD_VIEW_SECONDS,
  type RewardAdsRuntimeSettings,
} from '../ad-settings/ad-settings.service';
import { PrismaService } from '../prisma.service';

const REWARD_AD_REASON = 'REWARD_AD_VIEW';
const REWARD_POINT_EXPIRATION_MONTHS = 1;
const VIETNAM_TIME_OFFSET_MS = 7 * 60 * 60 * 1000;

function getVietnamDayBounds(now = new Date()) {
  const shifted = new Date(now.getTime() + VIETNAM_TIME_OFFSET_MS);
  const startShiftedUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );

  return {
    start: new Date(startShiftedUtc - VIETNAM_TIME_OFFSET_MS),
    end: new Date(
      startShiftedUtc - VIETNAM_TIME_OFFSET_MS + 24 * 60 * 60 * 1000,
    ),
  };
}

function getRewardPointActiveCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - REWARD_POINT_EXPIRATION_MONTHS);
  return cutoff;
}

function getEnvSmartlinkUrl() {
  const configured =
    process.env.REWARD_AD_SMARTLINK_URL ?? process.env.ADSTERRA_SMARTLINK_URL;

  if (!configured) {
    throw new ServiceUnavailableException(
      'Reward ad smartlink URL is not configured',
    );
  }

  try {
    return new URL(configured).toString();
  } catch {
    throw new ServiceUnavailableException(
      'Reward ad smartlink URL is invalid',
    );
  }
}

function makeRewardAdReference(sessionId: string) {
  return `REWARD_AD:${sessionId}`;
}

export interface RewardAdSessionResponse {
  sessionId: string;
  smartlinkUrl: string;
  startedAt: Date;
  claimableAt: Date;
  viewSeconds: number;
  points: number;
  dailyLimit: number;
  claimedToday: number;
  remainingClaims: number;
}

export interface RewardAdClaimResponse {
  sessionId: string;
  pointsAwarded: number;
  pointBalance: number;
  claimedToday: number;
  remainingClaims: number;
  claimedAt: Date;
}

type RewardAdSessionRecord = {
  id: string;
  userId: number;
  smartlinkUrl: string;
  startedAt: Date;
  claimableAt: Date;
  claimedAt?: Date | null;
};

type RewardAdSessionDelegate = {
  count(args: Record<string, unknown>): Promise<number>;
  findFirst(args: Record<string, unknown>): Promise<RewardAdSessionRecord | null>;
  create(args: Record<string, unknown>): Promise<RewardAdSessionRecord>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
};

type RewardAdTransactionClient = {
  rewardAdSession: RewardAdSessionDelegate;
  pointTransaction: {
    aggregate(args: Record<string, unknown>): Promise<{ _sum: { amount: number | null } }>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
};

@Injectable()
export class RewardAdsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly adSettingsService?: AdSettingsService,
  ) {}

  async createSession(userId: number): Promise<RewardAdSessionResponse> {
    this.ensureUser(userId);
    const config = await this.getRuntimeSettings(true);

    if (!config.enabled) {
      throw new ServiceUnavailableException('Reward ads are disabled');
    }

    if (!config.smartlinkUrl) {
      throw new ServiceUnavailableException(
        'Reward ad smartlink URL is not configured',
      );
    }

    const now = new Date();
    const today = getVietnamDayBounds(now);
    const claimedToday = await this.countClaimedToday(userId, today);

    if (claimedToday >= config.dailyLimit) {
      throw new BadRequestException('Daily reward ad quota reached');
    }

    const rewardAdSession = this.rewardAdSessionDelegate();
    const existing = await rewardAdSession.findFirst({
      where: {
        userId,
        claimedAt: null,
        startedAt: {
          gte: today.start,
          lt: today.end,
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const session =
      existing ??
      (await rewardAdSession.create({
        data: {
          userId,
          smartlinkUrl: config.smartlinkUrl,
          startedAt: now,
          claimableAt: new Date(now.getTime() + config.viewSeconds * 1000),
        },
      }));

    return this.toSessionResponse(session, claimedToday, config);
  }

  async claimSession(
    userId: number,
    sessionId: string,
  ): Promise<RewardAdClaimResponse> {
    this.ensureUser(userId);
    const config = await this.getRuntimeSettings(false);

    if (!sessionId?.trim()) {
      throw new BadRequestException('sessionId is required');
    }

    const now = new Date();
    const today = getVietnamDayBounds(now);

    return this.prisma.$transaction(async (tx) => {
      const db = tx as unknown as RewardAdTransactionClient;
      const session = await db.rewardAdSession.findFirst({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new NotFoundException('Reward ad session not found');
      }

      if (session.claimedAt) {
        throw new BadRequestException('Reward ad session already claimed');
      }

      if (session.claimableAt.getTime() > now.getTime()) {
        const remainingSeconds = Math.ceil(
          (session.claimableAt.getTime() - now.getTime()) / 1000,
        );
        throw new BadRequestException(
          `Reward ad session is claimable in ${remainingSeconds} seconds`,
        );
      }

      const claimedBefore = await db.rewardAdSession.count({
        where: {
          userId,
          claimedAt: {
            gte: today.start,
            lt: today.end,
          },
        },
      });

      if (claimedBefore >= config.dailyLimit) {
        throw new BadRequestException('Daily reward ad quota reached');
      }

      const updated = await db.rewardAdSession.updateMany({
        where: {
          id: session.id,
          userId,
          claimedAt: null,
          claimableAt: { lte: now },
        },
        data: { claimedAt: now },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('Reward ad session cannot be claimed');
      }

      const claimedToday = await db.rewardAdSession.count({
        where: {
          userId,
          claimedAt: {
            gte: today.start,
            lt: today.end,
          },
        },
      });

      if (claimedToday > config.dailyLimit) {
        throw new BadRequestException('Daily reward ad quota reached');
      }

      const currentBalance = await db.pointTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: getRewardPointActiveCutoff(now) },
        },
        _sum: { amount: true },
      });
      const pointBalance = Math.max(0, currentBalance._sum.amount ?? 0);
      const nextBalance = pointBalance + config.points;

      await db.pointTransaction.create({
        data: {
          userId,
          amount: config.points,
          balanceAfter: nextBalance,
          type: PointTransactionType.EARN,
          reason: REWARD_AD_REASON,
          referenceId: makeRewardAdReference(session.id),
        },
      });

      return {
        sessionId: session.id,
        pointsAwarded: config.points,
        pointBalance: nextBalance,
        claimedToday,
        remainingClaims: Math.max(0, config.dailyLimit - claimedToday),
        claimedAt: now,
      };
    });
  }

  private ensureUser(userId: number): void {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('A valid authenticated user id is required');
    }
  }

  private async countClaimedToday(
    userId: number,
    today: { start: Date; end: Date },
  ) {
    return this.rewardAdSessionDelegate().count({
      where: {
        userId,
        claimedAt: {
          gte: today.start,
          lt: today.end,
        },
      },
    });
  }

  private async getRuntimeSettings(
    requireSmartlink: boolean,
  ): Promise<RewardAdsRuntimeSettings> {
    if (this.adSettingsService) {
      return this.adSettingsService.getRewardAdsRuntimeSettings();
    }

    return {
      enabled: true,
      smartlinkUrl: requireSmartlink ? getEnvSmartlinkUrl() : null,
      points: DEFAULT_REWARD_AD_POINTS,
      dailyLimit: DEFAULT_REWARD_AD_DAILY_LIMIT,
      viewSeconds: DEFAULT_REWARD_AD_VIEW_SECONDS,
    };
  }

  private rewardAdSessionDelegate(): RewardAdSessionDelegate {
    return (this.prisma as unknown as { rewardAdSession: RewardAdSessionDelegate })
      .rewardAdSession;
  }

  private toSessionResponse(
    session: {
      id: string;
      smartlinkUrl: string;
      startedAt: Date;
      claimableAt: Date;
    },
    claimedToday: number,
    config: RewardAdsRuntimeSettings,
  ): RewardAdSessionResponse {
    return {
      sessionId: session.id,
      smartlinkUrl: session.smartlinkUrl,
      startedAt: session.startedAt,
      claimableAt: session.claimableAt,
      viewSeconds: config.viewSeconds,
      points: config.points,
      dailyLimit: config.dailyLimit,
      claimedToday,
      remainingClaims: Math.max(0, config.dailyLimit - claimedToday),
    };
  }
}
