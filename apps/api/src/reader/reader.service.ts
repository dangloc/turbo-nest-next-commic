import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { PointTransactionType, Prisma } from '@prisma/client';
import {
  AdSettingsService,
  DEFAULT_REWARD_AD_DAILY_LIMIT,
  DEFAULT_REWARD_AD_POINTS,
  DEFAULT_REWARD_AD_VIEW_SECONDS,
} from '../ad-settings/ad-settings.service';
import { sortChaptersByReadableOrder } from '../chapters/chapter-order';
import { PrismaService } from '../prisma.service';
import {
  AuthorCatalogQuery,
  AuthorFollowResult,
  AuthorProfileResponse,
  BookmarkListQuery,
  BookmarkInput,
  NovelRecommendationStatus,
  PointTransactionListQuery,
  ReaderChapterContext,
  ReaderChapterOpenInput,
  ReaderChapterOpenResult,
  ReaderDiscoveryQuery,
  ReaderDiscoverySortBy,
  ReaderSortBy,
  ReadingHistoryInput,
} from './types';

const DEFAULT_BOOKMARK_PAGE = 1;
const DEFAULT_BOOKMARK_PAGE_SIZE = 10;
const MAX_BOOKMARK_PAGE_SIZE = 50;
const DAILY_RECOMMENDATION_LIMIT = 5;
const DAILY_POINT_LIMIT = 3000;
const CHAPTER_LIKE_REWARD_POINTS = 300;
const NOVEL_RECOMMENDATION_REWARD_POINTS = 100;
const REWARD_AD_MISSION_ID = 100006;
const REWARD_AD_REASON = 'REWARD_AD_VIEW';
const REWARD_POINT_EXPIRATION_MONTHS = 1;
const VIETNAM_TIME_OFFSET_MS = 7 * 60 * 60 * 1000;

const STATIC_FALLBACK_MISSIONS = [
  {
    id: 100001,
    title: 'Đăng nhập hằng ngày',
    description: 'Đăng nhập mỗi ngày để nhận điểm thưởng.',
    points: 1000,
    type: 'DAILY',
  },
  {
    id: 100002,
    title: 'Like một chương',
    description: 'Thả like cho một chương truyện bạn yêu thích.',
    points: 300,
    type: 'SOCIAL',
  },
  {
    id: 100003,
    title: 'Đánh giá truyện',
    description: 'Gửi đánh giá 5 sao hoặc nhận xét cho truyện.',
    points: 500,
    type: 'SOCIAL',
  },
  {
    id: 100004,
    title: 'Bình luận',
    description: 'Bình luận tại truyện hoặc chương đang đọc.',
    points: 700,
    type: 'SOCIAL',
  },
  {
    id: 100005,
    title: 'Đề cử',
    description: 'Mỗi lượt đề cử nhận 100 điểm thưởng, tối đa 5 lượt mỗi ngày.',
    points: 100,
    type: 'DAILY',
  },
] as const;

const FALLBACK_MISSION_COMPLETION_REASONS: Record<number, string[]> = {
  100001: ['DAILY_LOGIN'],
  100002: ['CHAPTER_LIKE'],
  100003: ['NOVEL_REVIEW'],
  100004: ['COMMENT'],
  100005: ['NOVEL_RECOMMENDATION'],
  [REWARD_AD_MISSION_ID]: [REWARD_AD_REASON],
};

type RewardAdMissionConfig = {
  enabled: boolean;
  points: number;
  dailyLimit: number;
  viewSeconds: number;
};

function buildRewardAdFallbackMission(config: RewardAdMissionConfig) {
  return {
    id: REWARD_AD_MISSION_ID,
    title: 'Xem quảng cáo',
    description: `Xem nội dung tài trợ trong ${config.viewSeconds} giây.`,
    points: config.points,
    type: 'DAILY',
    targetProgress: config.dailyLimit,
    action: 'REWARD_AD' as const,
  };
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeBookmarkPageSize(value: unknown): number {
  return Math.min(
    MAX_BOOKMARK_PAGE_SIZE,
    normalizePositiveInteger(value, DEFAULT_BOOKMARK_PAGE_SIZE),
  );
}

function getVietnamVoteDate(now = new Date()): Date {
  const shifted = new Date(now.getTime() + VIETNAM_TIME_OFFSET_MS);

  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ),
  );
}

function getVietnamDayBounds(now = new Date()) {
  const shifted = new Date(now.getTime() + VIETNAM_TIME_OFFSET_MS);
  const startShiftedUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );

  return {
    start: new Date(startShiftedUtc - VIETNAM_TIME_OFFSET_MS),
    end: new Date(startShiftedUtc - VIETNAM_TIME_OFFSET_MS + 24 * 60 * 60 * 1000),
  };
}

function addRewardPointExpirationDate(createdAt: Date) {
  const expiresAt = new Date(createdAt);
  expiresAt.setMonth(expiresAt.getMonth() + REWARD_POINT_EXPIRATION_MONTHS);
  return expiresAt;
}

function getRewardPointActiveCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - REWARD_POINT_EXPIRATION_MONTHS);
  return cutoff;
}

function makeChapterLikeReference(chapterId: number, userId: number) {
  return `CHAPTER_LIKE:${chapterId}:${userId}`;
}

function makeNovelRecommendationReference(
  novelId: number,
  userId: number,
  voteDate: Date,
) {
  return `NOVEL_RECOMMENDATION:${novelId}:${userId}:${voteDate.toISOString().slice(0, 10)}:${Date.now()}`;
}

const DISCOVERY_NOVEL_SELECT = {
  id: true,
  title: true,
  postContent: true,
  featuredImage: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      chapters: true,
    },
  },
  uploader: {
    select: {
      id: true,
      email: true,
      nickname: true,
      authorProfile: {
        select: {
          penName: true,
        },
      },
    },
  },
  terms: {
    select: {
      id: true,
      name: true,
      slug: true,
      taxonomy: true,
    },
  },
} satisfies Prisma.NovelSelect;

type DiscoveryNovelRecord = Prisma.NovelGetPayload<{
  select: typeof DISCOVERY_NOVEL_SELECT;
}>;

function buildDiscoveryNovelWhere(
  query: ReaderDiscoveryQuery,
): Prisma.NovelWhereInput {
  const andWhere: Array<Record<string, unknown>> = [];
  const search = query.q?.trim();
  const authorTerm = query.author?.trim();

  if (search) {
    andWhere.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { postContent: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (authorTerm) {
    andWhere.push({
      terms: {
        some: {
          taxonomy: 'tac_gia',
          OR: [{ slug: authorTerm }, { name: authorTerm }],
        },
      },
    });
  }

  if (query.category) {
    andWhere.push({
      terms: {
        some: {
          taxonomy: 'the_loai',
          OR: [{ slug: query.category }, { name: query.category }],
        },
      },
    });
  }

  if (query.tag) {
    andWhere.push({
      terms: {
        some: {
          taxonomy: 'post_tag',
          OR: [{ slug: query.tag }, { name: query.tag }],
        },
      },
    });
  }

  if (query.status) {
    andWhere.push({
      terms: {
        some: {
          taxonomy: 'trang_thai',
          OR: [{ slug: query.status }, { name: query.status }],
        },
      },
    });
  }

  if (query.releaseYear) {
    andWhere.push({
      terms: {
        some: {
          taxonomy: 'nam_phat_hanh',
          OR: [{ slug: query.releaseYear }, { name: query.releaseYear }],
        },
      },
    });
  }

  return andWhere.length > 0 ? { AND: andWhere } : {};
}

function mapDiscoveryNovel(
  item: DiscoveryNovelRecord,
  recommendationVotes = 0,
) {
  const { uploader, _count, ...novel } = item;

  return {
    ...novel,
    viewCount: Number(novel.viewCount ?? 0),
    chapterCount: _count?.chapters ?? 0,
    coverUrl: novel.featuredImage ?? null,
    thumbnailUrl: novel.featuredImage ?? null,
    recommendationVotes,
    author: uploader
      ? {
          id: uploader.id,
          displayName:
            uploader.authorProfile?.penName?.trim() ||
            uploader.nickname?.trim() ||
            uploader.email,
        }
      : null,
  };
}

@Injectable()
export class ReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly adSettingsService?: AdSettingsService,
  ) {}

  async listNovels(query: ReaderDiscoveryQuery) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));
    const sortBy: ReaderDiscoverySortBy = query.sortBy ?? 'updatedAt';
    const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';

    const where = buildDiscoveryNovelWhere(query);

    if (sortBy === 'recommendationVotes') {
      const recommendationNovelWhere = Object.keys(where).length
        ? {
            AND: [
              where,
              {
                recommendationVotes: {
                  some: {},
                },
              },
            ],
          }
        : {
            recommendationVotes: {
              some: {},
            },
          };
      const recommendationVoteWhere = Object.keys(where).length
        ? {
            novel: {
              is: where,
            },
          }
        : {};

      const [total, voteRows] = await Promise.all([
        this.prisma.novel.count({
          where: recommendationNovelWhere,
        }),
        this.prisma.novelRecommendationVote.groupBy({
          by: ['novelId'],
          where: recommendationVoteWhere,
          _sum: {
            votes: true,
          },
          orderBy: [{ _sum: { votes: sortDir } }, { novelId: sortDir }],
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const novelIds = voteRows.map((row) => row.novelId);
      if (novelIds.length === 0) {
        return {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          items: [],
        };
      }

      const items = await this.prisma.novel.findMany({
        where: {
          id: {
            in: novelIds,
          },
        },
        select: DISCOVERY_NOVEL_SELECT,
      });
      const itemById = new Map(items.map((item) => [item.id, item]));
      const catalogItems = voteRows
        .map((row) => {
          const item = itemById.get(row.novelId);
          if (!item) {
            return null;
          }

          return mapDiscoveryNovel(item, row._sum.votes ?? 0);
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        items: catalogItems,
      };
    }

    const orderBy = { [sortBy]: sortDir };

    const [total, items] = await Promise.all([
      this.prisma.novel.count({ where }),
      this.prisma.novel.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: DISCOVERY_NOVEL_SELECT,
      }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      items: items.map((item) => mapDiscoveryNovel(item)),
    };
  }

  async getAuthorProfile(
    authorId: number,
    query: AuthorCatalogQuery = {},
    viewerUserId?: number,
  ): Promise<AuthorProfileResponse> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 12)));
    const sortBy: ReaderSortBy = query.sortBy ?? 'updatedAt';
    const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        authorProfile: {
          select: {
            penName: true,
            bio: true,
          },
        },
      },
    });

    if (!author) {
      throw new NotFoundException(`Author ${authorId} not found`);
    }

    const where = { uploaderId: authorId };
    const orderBy = { [sortBy]: sortDir };

    const [total, aggregatedViews, latestNovel, items, followerCount, viewerFollow] =
      await Promise.all([
        this.prisma.novel.count({ where }),
        this.prisma.novel.aggregate({
          where,
          _sum: {
            viewCount: true,
          },
        }),
        this.prisma.novel.findFirst({
          where,
          orderBy: { updatedAt: 'desc' },
          select: {
            updatedAt: true,
          },
        }),
        this.prisma.novel.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            title: true,
            viewCount: true,
            createdAt: true,
            updatedAt: true,
            terms: {
              select: {
                id: true,
                name: true,
                slug: true,
                taxonomy: true,
              },
            },
          },
        }),
        this.prisma.authorFollow.count({
          where: { authorId },
        }),
        viewerUserId
          ? this.prisma.authorFollow.findUnique({
              where: {
                followerId_authorId: {
                  followerId: viewerUserId,
                  authorId,
                },
              },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

    const catalogItems = items.map((item) => ({
      ...item,
      viewCount: Number(item.viewCount),
    }));

    const penName = author.authorProfile?.penName?.trim() || null;
    const nickname = author.nickname ?? null;

    return {
      author: {
        id: author.id,
        displayName: penName ?? nickname ?? `Author #${author.id}`,
        nickname,
        penName,
        avatar: author.avatar,
        bio: author.authorProfile?.bio ?? null,
      },
      stats: {
        totalPublishedNovels: total,
        totalViews: Number(aggregatedViews._sum.viewCount ?? 0),
        latestUpdateAt: latestNovel?.updatedAt ?? null,
        followerCount,
        viewerFollowsAuthor: Boolean(viewerFollow),
      },
      catalog: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        items: catalogItems,
      },
    };
  }

  async getChapterContext(
    chapterId: number,
    novelId?: number,
  ): Promise<ReaderChapterContext> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.resolveChapterIdentity(tx, chapterId, novelId);

      const chapters = sortChaptersByReadableOrder(
        await tx.chapter.findMany({
          where: { novelId: existing.novelId },
          orderBy: [{ chapterNumber: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            title: true,
            chapterNumber: true,
          },
        }),
      );

      const currentIndex = chapters.findIndex((item) => item.id === existing.id);
      if (currentIndex < 0) {
        throw new NotFoundException(
          `Chapter ${existing.id} not found in novel ${existing.novelId}`,
        );
      }

      const previousChapter = chapters[currentIndex - 1] ?? null;
      const nextChapter = chapters[currentIndex + 1] ?? null;

      return {
        novelId: existing.novelId,
        currentChapterId: existing.id,
        previousChapterId: previousChapter?.id ?? null,
        nextChapterId: nextChapter?.id ?? null,
        chapters,
      };
    });
  }

  async readChapter(chapterId: number, novelId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.resolveChapterIdentity(tx, chapterId, novelId);

      const chapter = await tx.chapter.update({
        where: { id: existing.id },
        data: {
          viewCount: { increment: 1 },
        },
        select: {
          id: true,
          novelId: true,
          title: true,
          postContent: true,
          viewCount: true,
          chapterNumber: true,
        },
      });

      await tx.novel.update({
        where: { id: existing.novelId },
        data: {
          viewCount: { increment: 1 },
        },
      });

      return chapter;
    });
  }

  async listBookmarks(userId: number, query?: BookmarkListQuery) {
    this.ensureUser(userId);

    const select = {
      id: true,
      userId: true,
      novelId: true,
      chapterId: true,
      note: true,
      createdAt: true,
      novel: {
        select: {
          id: true,
          title: true,
          featuredImage: true,
        },
      },
      chapter: {
        select: {
          id: true,
          title: true,
          chapterNumber: true,
        },
      },
    } as const;

    if (!query) {
      return this.prisma.bookmark.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select,
      });
    }

    const pageSize = normalizeBookmarkPageSize(query.pageSize);
    const requestedPage = normalizePositiveInteger(
      query.page,
      DEFAULT_BOOKMARK_PAGE,
    );
    const where = { userId };
    const total = await this.prisma.bookmark.count({ where });
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
    const page = Math.min(requestedPage, totalPages);
    const skip = total === 0 ? 0 : (page - 1) * pageSize;

    const items =
      total === 0
        ? []
        : await this.prisma.bookmark.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
            select,
          });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async addBookmark(userId: number, input: BookmarkInput) {
    this.ensureUser(userId);

    const existing = await this.prisma.bookmark.findFirst({
      where: {
        userId,
        novelId: input.novelId,
        chapterId: input.chapterId ?? null,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.bookmark.create({
      data: {
        userId,
        novelId: input.novelId,
        chapterId: input.chapterId,
        note: input.note,
      },
    });
  }

  async removeBookmark(userId: number, bookmarkId: number) {
    this.ensureUser(userId);

    const deleted = await this.prisma.bookmark.deleteMany({
      where: {
        id: bookmarkId,
        userId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Bookmark ${bookmarkId} not found`);
    }

    return { deleted: true };
  }

  async getMissionBoard(userId: number) {
    this.ensureUser(userId);

    const now = new Date();
    const today = getVietnamDayBounds(now);
    await this.syncActionMissionRewards(userId, now, today);
    const rewardAdMissionConfig = await this.getRewardAdMissionConfig();

    const activePointCutoff = getRewardPointActiveCutoff(now);
    const activeMissionWhere = {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    };

    const [
      missions,
      logs,
      pointBalanceAggregate,
      todayEarnedAggregate,
      todayMissionPointTransactions,
    ] =
      await this.prisma.$transaction([
        this.prisma.mission.findMany({
          where: activeMissionWhere,
          orderBy: [{ type: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            title: true,
            description: true,
            points: true,
            type: true,
            startsAt: true,
            endsAt: true,
          },
        }),
        this.prisma.userMissionLog.findMany({
          where: { userId },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          select: {
            missionId: true,
            status: true,
            progress: true,
            completedAt: true,
            claimedAt: true,
          },
        }),
        this.prisma.pointTransaction.aggregate({
          where: {
            userId,
            createdAt: { gte: activePointCutoff },
          },
          _sum: { amount: true },
        }),
        this.prisma.pointTransaction.aggregate({
          where: {
            userId,
            amount: { gt: 0 },
            createdAt: {
              gte: today.start,
              lt: today.end,
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.pointTransaction.findMany({
          where: {
            userId,
            amount: { gt: 0 },
            reason: {
              in: Object.values(FALLBACK_MISSION_COMPLETION_REASONS).flat(),
            },
            createdAt: {
              gte: today.start,
              lt: today.end,
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            reason: true,
            createdAt: true,
          },
        }),
      ]);

    const logByMissionId = new Map(logs.map((log) => [log.missionId, log]));
    const completedFallbackMissionById = new Map<
      number,
      { completedAt: Date }
    >();
    const rewardAdTransactionsToday = todayMissionPointTransactions.filter(
      (item) => item.reason === REWARD_AD_REASON,
    );
    for (const [missionId, reasons] of Object.entries(
      FALLBACK_MISSION_COMPLETION_REASONS,
    )) {
      if (Number(missionId) === REWARD_AD_MISSION_ID) {
        continue;
      }

      const transaction = todayMissionPointTransactions.find(
        (item) => item.reason && reasons.includes(item.reason),
      );
      if (transaction) {
        completedFallbackMissionById.set(Number(missionId), {
          completedAt: transaction.createdAt,
        });
      }
    }
    const pointBalance = Math.max(0, pointBalanceAggregate._sum.amount ?? 0);
    const todayEarned = todayEarnedAggregate._sum.amount ?? 0;
    const rewardAdFallbackMission = rewardAdMissionConfig.enabled
      ? {
          ...buildRewardAdFallbackMission(rewardAdMissionConfig),
          startsAt: null,
          endsAt: null,
        }
      : null;
    const normalizedMissions = missions
      .filter(
        (mission) =>
          rewardAdMissionConfig.enabled || mission.id !== REWARD_AD_MISSION_ID,
      )
      .map((mission) =>
        mission.id === REWARD_AD_MISSION_ID
          ? {
              ...buildRewardAdFallbackMission(rewardAdMissionConfig),
              startsAt: mission.startsAt,
              endsAt: mission.endsAt,
            }
          : mission,
      );
    const missionItems =
      missions.length > 0
        ? rewardAdFallbackMission &&
          !normalizedMissions.some(
            (mission) => mission.id === REWARD_AD_MISSION_ID,
          )
          ? [...normalizedMissions, rewardAdFallbackMission]
          : normalizedMissions
        : [
            ...STATIC_FALLBACK_MISSIONS,
            ...(rewardAdFallbackMission ? [rewardAdFallbackMission] : []),
          ].map((mission) => ({
            ...mission,
            startsAt: null,
            endsAt: null,
          }));

    return {
      pointBalance,
      todayEarned,
      dailyLimit: DAILY_POINT_LIMIT,
      rewardPointExpiresAfterMonths: REWARD_POINT_EXPIRATION_MONTHS,
      items: missionItems.map((mission) => {
        const log = logByMissionId.get(mission.id);
        const fallbackCompletion = completedFallbackMissionById.get(mission.id);
        const isRewardAdMission = mission.id === REWARD_AD_MISSION_ID;
        const rewardAdProgress = Math.min(
          rewardAdMissionConfig.dailyLimit,
          rewardAdTransactionsToday.length,
        );
        const rewardAdCompleted =
          rewardAdProgress >= rewardAdMissionConfig.dailyLimit;

        return {
          id: mission.id,
          title: mission.title,
          description: mission.description,
          points: mission.points,
          type: mission.type,
          startsAt: mission.startsAt,
          endsAt: mission.endsAt,
          status:
            log?.status ??
            (isRewardAdMission
              ? rewardAdCompleted
                ? 'COMPLETED'
                : 'PENDING'
              : fallbackCompletion
                ? 'COMPLETED'
                : 'PENDING'),
          progress:
            log?.progress ??
            (isRewardAdMission
              ? rewardAdProgress
              : fallbackCompletion
                ? 1
                : 0),
          targetProgress: isRewardAdMission
            ? rewardAdMissionConfig.dailyLimit
            : 'targetProgress' in mission
              ? mission.targetProgress
              : undefined,
          action: isRewardAdMission
            ? 'REWARD_AD'
            : 'action' in mission
              ? mission.action
              : undefined,
          completedAt:
            log?.completedAt ??
            (isRewardAdMission && rewardAdCompleted
              ? rewardAdTransactionsToday[0]?.createdAt
              : fallbackCompletion?.completedAt) ??
            null,
          claimedAt: log?.claimedAt ?? null,
        };
      }),
    };
  }

  async listPointTransactions(
    userId: number,
    query: PointTransactionListQuery = {},
  ) {
    this.ensureUser(userId);

    const page = normalizePositiveInteger(query.page, 1);
    const pageSize = Math.min(
      MAX_BOOKMARK_PAGE_SIZE,
      normalizePositiveInteger(query.pageSize, 20),
    );
    const now = new Date();
    const activePointCutoff = getRewardPointActiveCutoff(now);

    const where = { userId };
    const [items, total, balanceAggregate] = await this.prisma.$transaction([
      this.prisma.pointTransaction.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          amount: true,
          balanceAfter: true,
          type: true,
          reason: true,
          referenceId: true,
          createdAt: true,
        },
      }),
      this.prisma.pointTransaction.count({ where }),
      this.prisma.pointTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: activePointCutoff },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      balance: Math.max(0, balanceAggregate._sum.amount ?? 0),
      items: items.map((item) => {
        const expiresAt =
          item.amount > 0 ? addRewardPointExpirationDate(item.createdAt) : null;

        return {
          ...item,
          expiresAt,
          isExpired: expiresAt ? expiresAt <= now : false,
        };
      }),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getNovelRecommendationStatus(
    userId: number | undefined,
    novelId: number,
  ): Promise<NovelRecommendationStatus> {
    await this.ensureNovelExists(novelId);
    const voteDate = getVietnamVoteDate();

    const [totalAggregate, userDayAggregate, viewerNovelVote] =
      await Promise.all([
        this.prisma.novelRecommendationVote.aggregate({
          where: { novelId },
          _sum: { votes: true },
        }),
        userId
          ? this.prisma.novelRecommendationVote.aggregate({
              where: {
                userId,
                voteDate,
              },
              _sum: { votes: true },
            })
          : Promise.resolve({ _sum: { votes: 0 } }),
        userId
          ? this.prisma.novelRecommendationVote.findUnique({
              where: {
                userId_novelId_voteDate: {
                  userId,
                  novelId,
                  voteDate,
                },
              },
              select: { votes: true },
            })
          : Promise.resolve(null),
      ]);

    const usedVotesToday = Number(userDayAggregate._sum.votes ?? 0);

    return {
      novelId,
      totalVotes: Number(totalAggregate._sum.votes ?? 0),
      dailyLimit: DAILY_RECOMMENDATION_LIMIT,
      remainingVotes: Math.max(0, DAILY_RECOMMENDATION_LIMIT - usedVotesToday),
      usedVotesToday,
      viewerVotesForNovelToday: viewerNovelVote?.votes ?? 0,
      voteDate,
    };
  }

  async recommendNovel(
    userId: number,
    novelId: number,
    votes: number,
  ): Promise<NovelRecommendationStatus> {
    this.ensureUser(userId);
    await this.ensureNovelExists(novelId);

    const normalizedVotes = Number(votes);
    if (
      !Number.isInteger(normalizedVotes) ||
      normalizedVotes < 1 ||
      normalizedVotes > DAILY_RECOMMENDATION_LIMIT
    ) {
      throw new BadRequestException('votes must be an integer from 1 to 5');
    }

    const currentStatus = await this.getNovelRecommendationStatus(
      userId,
      novelId,
    );

    if (normalizedVotes > currentStatus.remainingVotes) {
      throw new BadRequestException(
        'Not enough recommendation votes remaining today',
      );
    }

    await this.prisma.novelRecommendationVote.upsert({
      where: {
        userId_novelId_voteDate: {
          userId,
          novelId,
          voteDate: currentStatus.voteDate,
        },
      },
      update: {
        votes: { increment: normalizedVotes },
      },
      create: {
        userId,
        novelId,
        voteDate: currentStatus.voteDate,
        votes: normalizedVotes,
      },
    });

    await this.awardRewardPoints(
      userId,
      NOVEL_RECOMMENDATION_REWARD_POINTS * normalizedVotes,
      'NOVEL_RECOMMENDATION',
      makeNovelRecommendationReference(novelId, userId, currentStatus.voteDate),
    );

    return this.getNovelRecommendationStatus(userId, novelId);
  }

  async upsertReadingHistory(userId: number, input: ReadingHistoryInput) {
    this.ensureUser(userId);

    const select = {
      id: true,
      userId: true,
      novelId: true,
      chapterId: true,
      progressPercent: true,
      lastReadAt: true,
      chapter: {
        select: {
          id: true,
          title: true,
          chapterNumber: true,
        },
      },
    } as const;

    const existing = await this.prisma.readingHistory.findFirst({
      where: {
        userId,
        novelId: input.novelId,
        chapterId: input.chapterId ?? null,
      },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.readingHistory.update({
        where: { id: existing.id },
        data: {
          progressPercent: input.progressPercent,
          lastReadAt: new Date(),
        },
        select,
      });
    }

    return this.prisma.readingHistory.create({
      data: {
        userId,
        novelId: input.novelId,
        chapterId: input.chapterId,
        progressPercent: input.progressPercent,
        lastReadAt: new Date(),
      },
      select,
    });
  }

  async listReadingHistory(userId: number, novelId?: number) {
    this.ensureUser(userId);

    return this.prisma.readingHistory.findMany({
      where: {
        userId,
        ...(novelId ? { novelId } : {}),
      },
      orderBy: { lastReadAt: 'desc' },
      select: {
        id: true,
        userId: true,
        novelId: true,
        chapterId: true,
        progressPercent: true,
        lastReadAt: true,
        chapter: {
          select: {
            id: true,
            title: true,
            chapterNumber: true,
          },
        },
      },
    });
  }

  async followAuthor(userId: number, authorId: number): Promise<AuthorFollowResult> {
    this.ensureUser(userId);
    await this.ensureAuthorExists(authorId);

    try {
      await this.prisma.authorFollow.create({
        data: {
          followerId: userId,
          authorId,
        },
      });
    } catch (error: any) {
      if (error?.code !== 'P2002') {
        throw error;
      }
    }

    const followerCount = await this.prisma.authorFollow.count({
      where: { authorId },
    });

    return {
      authorId,
      followerCount,
      viewerFollowsAuthor: true,
    };
  }

  async unfollowAuthor(
    userId: number,
    authorId: number,
  ): Promise<AuthorFollowResult> {
    this.ensureUser(userId);
    await this.ensureAuthorExists(authorId);

    await this.prisma.authorFollow.deleteMany({
      where: {
        followerId: userId,
        authorId,
      },
    });

    const followerCount = await this.prisma.authorFollow.count({
      where: { authorId },
    });

    return {
      authorId,
      followerCount,
      viewerFollowsAuthor: false,
    };
  }

  async syncChapterOpen(
    userId: number,
    input: ReaderChapterOpenInput,
  ): Promise<ReaderChapterOpenResult> {
    this.ensureUser(userId);

    const progressPercent = Math.max(0, Math.min(100, input.progressPercent ?? 5));
    const parsedClientUpdatedAt = input.clientUpdatedAt
      ? new Date(input.clientUpdatedAt)
      : null;
    const clientUpdatedAt =
      parsedClientUpdatedAt && !Number.isNaN(parsedClientUpdatedAt.getTime())
        ? parsedClientUpdatedAt
        : null;

    return this.prisma.$transaction(async (tx) => {
      const existingChapter = await this.resolveChapterIdentity(
        tx,
        input.chapterId,
        input.novelId,
      );

      const existingHistory = await tx.readingHistory.findFirst({
        where: {
          userId,
          novelId: existingChapter.novelId,
          chapterId: existingChapter.id,
        },
        select: {
          id: true,
          progressPercent: true,
          lastReadAt: true,
        },
      });

      if (!existingHistory) {
        await tx.chapter.update({
          where: { id: existingChapter.id },
          data: {
            viewCount: { increment: 1 },
          },
        });

        await tx.novel.update({
          where: { id: existingChapter.novelId },
          data: {
            viewCount: { increment: 1 },
          },
        });

        const created = await tx.readingHistory.create({
          data: {
            userId,
            novelId: existingChapter.novelId,
            chapterId: existingChapter.id,
            progressPercent,
            lastReadAt: clientUpdatedAt ?? new Date(),
          },
          select: {
            chapterId: true,
            novelId: true,
            progressPercent: true,
            lastReadAt: true,
          },
        });

        return {
          chapterId: created.chapterId ?? existingChapter.id,
          novelId: created.novelId,
          firstOpen: true,
          progressPercent: created.progressPercent,
          effectiveProgressPercent: created.progressPercent,
          serverAcceptedProgress: true,
          conflictDetected: false,
          appliedPolicy: 'first-open-create',
          clientUpdatedAt,
          serverLastReadAt: created.lastReadAt,
          lastReadAt: created.lastReadAt,
        };
      }

      const serverLastReadAt = existingHistory.lastReadAt;
      const shouldKeepServer =
        clientUpdatedAt !== null &&
        clientUpdatedAt.getTime() <= serverLastReadAt.getTime();

      if (shouldKeepServer) {
        return {
          chapterId: existingChapter.id,
          novelId: existingChapter.novelId,
          firstOpen: false,
          progressPercent: existingHistory.progressPercent,
          effectiveProgressPercent: existingHistory.progressPercent,
          serverAcceptedProgress: false,
          conflictDetected: true,
          appliedPolicy: 'last-write-keep-server',
          clientUpdatedAt,
          serverLastReadAt,
          lastReadAt: serverLastReadAt,
        };
      }

      const updated = await tx.readingHistory.update({
        where: { id: existingHistory.id },
        data: {
          lastReadAt: clientUpdatedAt ?? new Date(),
          progressPercent,
        },
        select: {
          chapterId: true,
          novelId: true,
          progressPercent: true,
          lastReadAt: true,
        },
      });

      return {
        chapterId: updated.chapterId ?? existingChapter.id,
        novelId: updated.novelId,
        firstOpen: false,
        progressPercent: updated.progressPercent,
        effectiveProgressPercent: updated.progressPercent,
        serverAcceptedProgress: true,
        conflictDetected: false,
        appliedPolicy: 'last-write-accept-client',
        clientUpdatedAt,
        serverLastReadAt: updated.lastReadAt,
        lastReadAt: updated.lastReadAt,
      };
    });
  }

  async getChapterLikeStatus(userId: number, chapterId: number) {
    this.ensureUser(userId);
    const chapter = await this.resolveChapterIdentity(this.prisma, chapterId);
    const referenceId = makeChapterLikeReference(chapter.id, userId);

    const [existing, totalLikes] = await Promise.all([
      this.prisma.pointTransaction.findFirst({
        where: {
          userId,
          referenceId,
          reason: 'CHAPTER_LIKE',
        },
        select: { id: true },
      }),
      this.countChapterLikes(chapter.id),
    ]);

    return {
      chapterId: chapter.id,
      liked: Boolean(existing),
      totalLikes,
      pointsAwarded: 0,
      alreadyLiked: Boolean(existing),
    };
  }

  async likeChapter(userId: number, chapterId: number) {
    this.ensureUser(userId);
    const now = new Date();
    const today = getVietnamDayBounds(now);
    const activePointCutoff = getRewardPointActiveCutoff(now);

    const result = await this.prisma.$transaction(async (tx) => {
      const chapter = await this.resolveChapterIdentity(tx, chapterId);
      const referenceId = makeChapterLikeReference(chapter.id, userId);
      const existing = await tx.pointTransaction.findFirst({
        where: {
          userId,
          referenceId,
          reason: 'CHAPTER_LIKE',
        },
        select: { id: true },
      });

      if (existing) {
        return {
          chapterId: chapter.id,
          liked: true,
          pointsAwarded: 0,
          alreadyLiked: true,
        };
      }

      const rewardToday = await tx.pointTransaction.findFirst({
        where: {
          userId,
          reason: 'CHAPTER_LIKE',
          amount: { gt: 0 },
          createdAt: {
            gte: today.start,
            lt: today.end,
          },
        },
        select: { id: true },
      });

      const currentBalance = await tx.pointTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: activePointCutoff },
        },
        _sum: { amount: true },
      });
      const currentPointBalance = Math.max(
        0,
        currentBalance._sum.amount ?? 0,
      );
      const pointsAwarded = rewardToday ? 0 : CHAPTER_LIKE_REWARD_POINTS;

      await tx.pointTransaction.create({
        data: {
          userId,
          amount: pointsAwarded,
          balanceAfter: currentPointBalance + pointsAwarded,
          type:
            pointsAwarded > 0
              ? PointTransactionType.EARN
              : PointTransactionType.BONUS,
          reason: 'CHAPTER_LIKE',
          referenceId,
        },
      });

      return {
        chapterId: chapter.id,
        liked: true,
        pointsAwarded,
        alreadyLiked: false,
      };
    });

    return {
      ...result,
      totalLikes: await this.countChapterLikes(result.chapterId),
    };
  }

  private async getRewardAdMissionConfig(): Promise<RewardAdMissionConfig> {
    if (!this.adSettingsService) {
      return {
        enabled: true,
        points: DEFAULT_REWARD_AD_POINTS,
        dailyLimit: DEFAULT_REWARD_AD_DAILY_LIMIT,
        viewSeconds: DEFAULT_REWARD_AD_VIEW_SECONDS,
      };
    }

    const settings = await this.adSettingsService.getRewardAdsRuntimeSettings();
    return {
      enabled: settings.enabled,
      points: settings.points,
      dailyLimit: settings.dailyLimit,
      viewSeconds: settings.viewSeconds,
    };
  }

  private async ensureAuthorExists(authorId: number): Promise<void> {
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true },
    });

    if (!author) {
      throw new NotFoundException(`Author ${authorId} not found`);
    }
  }

  private async ensureNovelExists(novelId: number): Promise<void> {
    if (!Number.isInteger(novelId) || novelId <= 0) {
      throw new BadRequestException('A valid novel id is required');
    }

    const novel = await this.prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });

    if (!novel) {
      throw new NotFoundException(`Novel ${novelId} not found`);
    }
  }

  private async countChapterLikes(chapterId: number): Promise<number> {
    const likeReferencePattern = `CHAPTER_LIKE:${chapterId}:%`;
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM point_transactions
      WHERE reason = 'CHAPTER_LIKE'
      AND "referenceId" LIKE ${likeReferencePattern}
    `;

    return Number(rows[0]?.count ?? 0);
  }

  private async awardRewardPoints(
    userId: number,
    amount: number,
    reason: string,
    referenceId: string,
  ): Promise<void> {
    const pointTransaction = (
      this.prisma as unknown as {
        pointTransaction?: {
          aggregate: typeof this.prisma.pointTransaction.aggregate;
          create: typeof this.prisma.pointTransaction.create;
        };
      }
    ).pointTransaction;

    if (!pointTransaction || amount <= 0) {
      return;
    }

    const activePointCutoff = getRewardPointActiveCutoff();
    const currentBalance = await pointTransaction.aggregate({
      where: {
        userId,
        createdAt: { gte: activePointCutoff },
      },
      _sum: { amount: true },
    });
    const currentPointBalance = Math.max(0, currentBalance._sum.amount ?? 0);

    await pointTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: currentPointBalance + amount,
        type: PointTransactionType.EARN,
        reason,
        referenceId,
      },
    });
  }

  private async syncActionMissionRewards(
    userId: number,
    now: Date,
    today: { start: Date; end: Date },
  ): Promise<void> {
    const prisma = this.prisma as unknown as {
      pointTransaction?: {
        aggregate: typeof this.prisma.pointTransaction.aggregate;
        create: typeof this.prisma.pointTransaction.create;
      };
      review?: {
        findFirst: typeof this.prisma.review.findFirst;
      };
      comment?: {
        findFirst: typeof this.prisma.comment.findFirst;
      };
      novelRecommendationVote?: {
        aggregate: typeof this.prisma.novelRecommendationVote.aggregate;
      };
    };

    if (!prisma.pointTransaction) {
      return;
    }

    const [reviewToday, commentToday, recommendationVotesToday] =
      await Promise.all([
        prisma.review
          ? prisma.review.findFirst({
              where: {
                userId,
                OR: [
                  {
                    createdAt: {
                      gte: today.start,
                      lt: today.end,
                    },
                  },
                  {
                    updatedAt: {
                      gte: today.start,
                      lt: today.end,
                    },
                  },
                ],
              },
              select: { id: true },
            })
          : Promise.resolve(null),
        prisma.comment
          ? prisma.comment.findFirst({
              where: {
                userId,
                createdAt: {
                  gte: today.start,
                  lt: today.end,
                },
              },
              select: { id: true },
            })
          : Promise.resolve(null),
        prisma.novelRecommendationVote
          ? prisma.novelRecommendationVote.aggregate({
              where: {
                userId,
                voteDate: getVietnamVoteDate(now),
              },
              _sum: { votes: true },
            })
          : Promise.resolve({ _sum: { votes: 0 } }),
      ]);

    await this.awardMissingRewardPoints(
      userId,
      'NOVEL_REVIEW',
      reviewToday ? 500 : 0,
      `NOVEL_REVIEW:${userId}:${today.start.toISOString().slice(0, 10)}`,
      today,
      now,
    );
    await this.awardMissingRewardPoints(
      userId,
      'COMMENT',
      commentToday ? 700 : 0,
      `COMMENT:${userId}:${today.start.toISOString().slice(0, 10)}`,
      today,
      now,
    );
    await this.awardMissingRewardPoints(
      userId,
      'NOVEL_RECOMMENDATION',
      Math.max(0, recommendationVotesToday._sum.votes ?? 0) *
        NOVEL_RECOMMENDATION_REWARD_POINTS,
      `NOVEL_RECOMMENDATION:${userId}:${today.start.toISOString().slice(0, 10)}`,
      today,
      now,
    );
  }

  private async awardMissingRewardPoints(
    userId: number,
    reason: string,
    desiredAmount: number,
    referenceId: string,
    today: { start: Date; end: Date },
    now: Date,
  ): Promise<void> {
    const pointTransaction = (
      this.prisma as unknown as {
        pointTransaction?: {
          aggregate: typeof this.prisma.pointTransaction.aggregate;
          create: typeof this.prisma.pointTransaction.create;
        };
      }
    ).pointTransaction;

    if (!pointTransaction || desiredAmount <= 0) {
      return;
    }

    const existingReward = await pointTransaction.aggregate({
      where: {
        userId,
        reason,
        amount: { gt: 0 },
        createdAt: {
          gte: today.start,
          lt: today.end,
        },
      },
      _sum: { amount: true },
    });
    const missingAmount = Math.max(
      0,
      desiredAmount - (existingReward._sum.amount ?? 0),
    );

    if (missingAmount <= 0) {
      return;
    }

    const currentBalance = await pointTransaction.aggregate({
      where: {
        userId,
        createdAt: { gte: getRewardPointActiveCutoff(now) },
      },
      _sum: { amount: true },
    });
    const currentPointBalance = Math.max(0, currentBalance._sum.amount ?? 0);

    await pointTransaction.create({
      data: {
        userId,
        amount: missingAmount,
        balanceAfter: currentPointBalance + missingAmount,
        type: PointTransactionType.EARN,
        reason,
        referenceId,
      },
    });
  }

  private async resolveChapterIdentity(
    tx: any,
    chapterId: number,
    novelId?: number,
  ): Promise<{ id: number; novelId: number }> {
    let existing = await tx.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        novelId: true,
      },
    });

    if (!existing && novelId && Number.isInteger(novelId) && novelId > 0) {
      const index = Math.max(0, chapterId - 1);
      const fallbackCandidates = await tx.chapter.findMany({
        where: { novelId },
        orderBy: [{ chapterNumber: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          novelId: true,
          title: true,
          chapterNumber: true,
        },
      });
      const fallback = sortChaptersByReadableOrder(fallbackCandidates)[index];
      existing = fallback ?? null;
    }

    if (!existing) {
      throw new NotFoundException(
        novelId
          ? `Chapter ${chapterId} not found for novel ${novelId}`
          : `Chapter ${chapterId} not found`,
      );
    }

    return existing;
  }

  private ensureUser(userId?: number): void {
    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required');
    }
  }
}
