import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentReactionType, PointTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  CreateOrUpdateNovelReviewInput,
  CreateSocialCommentInput,
  NovelReviewListResponse,
  NovelReviewSummary,
  RecentReviewItem,
  SocialCommentNode,
  SocialCommentReaction,
  SocialCommentReactionSummary,
  SocialCommentScope,
  ToggleCommentReactionInput,
} from './types';

const REVIEW_MISSION_REWARD_POINTS = 500;
const COMMENT_MISSION_REWARD_POINTS = 700;
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

function makeDailyMissionReference(
  reason: 'NOVEL_REVIEW' | 'COMMENT',
  userId: number,
  dayStart: Date,
) {
  return `${reason}:${userId}:${dayStart.toISOString().slice(0, 10)}`;
}

type CommentRecord = {
  id: number;
  userId: number;
  novelId: number | null;
  chapterId: number | null;
  parentId: number | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    nickname: string | null;
    avatar: string | null;
    role: string;
  };
  reactions: {
    userId: number;
    type: CommentReactionType;
  }[];
};

type RecentCommentRecord = {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    nickname: string | null;
    avatar: string | null;
  };
  novel: {
    id: number;
    title: string;
    featuredImage: string | null;
  } | null;
  chapter: {
    novel: {
      id: number;
      title: string;
      featuredImage: string | null;
    };
  } | null;
};

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async listNovelReviews(
    novelId: number,
    page = 1,
    pageSize = 10,
  ): Promise<NovelReviewListResponse> {
    this.validateNovelId(novelId);
    await this.ensureNovelExists(novelId);

    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safePageSize = Math.min(
      50,
      Math.max(1, Math.floor(Number(pageSize) || 10)),
    );

    const [total, items] = await Promise.all([
      this.prisma.review.count({ where: { novelId } }),
      this.prisma.review.findMany({
        where: { novelId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        select: {
          id: true,
          userId: true,
          novelId: true,
          rating: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize) || 1,
    };
  }

  async getNovelReviewSummary(
    novelId: number,
    viewerUserId?: number,
  ): Promise<NovelReviewSummary> {
    this.validateNovelId(novelId);
    await this.ensureNovelExists(novelId);

    const [aggregate, viewerReview] = await Promise.all([
      this.prisma.review.aggregate({
        where: { novelId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      Number.isInteger(viewerUserId) && (viewerUserId ?? 0) > 0
        ? this.prisma.review.findUnique({
            where: {
              userId_novelId: {
                userId: viewerUserId as number,
                novelId,
              },
            },
            select: {
              id: true,
              userId: true,
              novelId: true,
              rating: true,
              content: true,
              createdAt: true,
              updatedAt: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      novelId,
      averageRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
      ratingCount: aggregate._count.rating,
      viewerReview,
    };
  }

  async upsertNovelReview(
    userId: number,
    novelId: number,
    input: CreateOrUpdateNovelReviewInput,
  ): Promise<NovelReviewSummary> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException(
        'A valid authenticated user id is required',
      );
    }

    this.validateNovelId(novelId);

    const rating = Number(input?.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('rating must be an integer from 1 to 5');
    }

    const content = input.content?.trim() || null;
    if (content && content.length > 2000) {
      throw new BadRequestException(
        'Review content must be 2000 characters or fewer',
      );
    }

    await this.ensureNovelExists(novelId);
    await this.prisma.review.upsert({
      where: {
        userId_novelId: {
          userId,
          novelId,
        },
      },
      update: {
        rating,
        content,
      },
      create: {
        userId,
        novelId,
        rating,
        content,
      },
    });
    await this.awardDailyMissionPoints(
      userId,
      'NOVEL_REVIEW',
      REVIEW_MISSION_REWARD_POINTS,
    );

    return this.getNovelReviewSummary(novelId, userId);
  }

  async listRecentReviews(limit = 9): Promise<RecentReviewItem[]> {
    const take = Math.min(18, Math.max(1, Math.floor(Number(limit) || 9)));

    const reviews = await this.prisma.review.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        novel: {
          select: {
            id: true,
            title: true,
            featuredImage: true,
          },
        },
      },
    });

    if (reviews.length > 0) {
      return reviews;
    }

    const comments = (await this.prisma.comment.findMany({
      where: {
        OR: [{ novelId: { not: null } }, { chapterId: { not: null } }],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
        novel: {
          select: {
            id: true,
            title: true,
            featuredImage: true,
          },
        },
        chapter: {
          select: {
            novel: {
              select: {
                id: true,
                title: true,
                featuredImage: true,
              },
            },
          },
        },
      },
    })) as RecentCommentRecord[];

    const commentReviews: RecentReviewItem[] = [];
    for (const comment of comments) {
      const novel = comment.novel ?? comment.chapter?.novel ?? null;
      if (!novel) {
        continue;
      }

      commentReviews.push({
        id: comment.id,
        rating: 5,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: comment.user,
        novel,
      });
    }

    return commentReviews;
  }

  async listComments(
    scope: SocialCommentScope,
    viewerUserId?: number,
  ): Promise<SocialCommentNode[]> {
    const normalizedScope = this.normalizeScope(scope);
    const comments = await this.prisma.comment.findMany({
      where: {
        novelId: normalizedScope.novelId ?? undefined,
        chapterId: normalizedScope.chapterId ?? undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            role: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            type: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return this.buildCommentTree(comments as CommentRecord[], viewerUserId);
  }

  async createComment(
    userId: number,
    input: CreateSocialCommentInput,
  ): Promise<SocialCommentNode> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException(
        'A valid authenticated user id is required',
      );
    }

    const content = input.content?.trim();
    if (!content) {
      throw new BadRequestException('Comment content is required');
    }

    const hasNovelScope = input.novelId !== undefined && input.novelId !== null;
    const hasChapterScope =
      input.chapterId !== undefined && input.chapterId !== null;
    const hasParent = input.parentId !== undefined && input.parentId !== null;

    let finalNovelId: number | null = null;
    let finalChapterId: number | null = null;
    let parentId: number | null = hasParent ? (input.parentId ?? null) : null;

    if (hasParent) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: input.parentId as number },
        select: {
          id: true,
          novelId: true,
          chapterId: true,
          parentId: true,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }

      if (hasNovelScope || hasChapterScope) {
        const providedScope = this.normalizeScope({
          novelId: input.novelId,
          chapterId: input.chapterId,
        });

        if (
          (providedScope.novelId == null ? null : providedScope.novelId) !==
            parent.novelId ||
          (providedScope.chapterId == null ? null : providedScope.chapterId) !==
            parent.chapterId
        ) {
          throw new BadRequestException(
            'Reply scope must match the parent comment thread',
          );
        }
      }

      finalNovelId = parent.novelId;
      finalChapterId = parent.chapterId;
    } else {
      const normalizedScope = this.normalizeScope(input);
      finalNovelId = normalizedScope.novelId ?? null;
      finalChapterId = normalizedScope.chapterId ?? null;
      parentId = null;

      if (normalizedScope.novelId) {
        await this.ensureNovelExists(normalizedScope.novelId);
      }

      if (normalizedScope.chapterId) {
        await this.ensureChapterExists(normalizedScope.chapterId);
      }
    }

    const created = await this.prisma.comment.create({
      data: {
        userId,
        novelId: finalNovelId,
        chapterId: finalChapterId,
        parentId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            role: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            type: true,
          },
        },
      },
    });
    await this.awardDailyMissionPoints(
      userId,
      'COMMENT',
      COMMENT_MISSION_REWARD_POINTS,
    );

    return this.toCommentNode(created as CommentRecord, [], userId);
  }

  async toggleReaction(
    userId: number,
    input: ToggleCommentReactionInput,
  ): Promise<SocialCommentReaction | null> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException(
        'A valid authenticated user id is required',
      );
    }

    if (!Number.isInteger(input.commentId) || input.commentId <= 0) {
      throw new BadRequestException('A valid comment id is required');
    }

    if (!Object.values(CommentReactionType).includes(input.type)) {
      throw new BadRequestException('Unsupported reaction type');
    }

    await this.ensureCommentExists(input.commentId);

    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.commentReaction.findUnique({
        where: {
          userId_commentId: {
            userId,
            commentId: input.commentId,
          },
        },
      });

      if (!existing) {
        return transaction.commentReaction.create({
          data: {
            userId,
            commentId: input.commentId,
            type: input.type,
          },
        });
      }

      if (existing.type === input.type) {
        await transaction.commentReaction.delete({
          where: {
            id: existing.id,
          },
        });

        return null;
      }

      return transaction.commentReaction.update({
        where: {
          id: existing.id,
        },
        data: {
          type: input.type,
        },
      });
    });
  }

  private normalizeScope(scope: SocialCommentScope): {
    novelId?: number;
    chapterId?: number;
  } {
    const hasNovelScope = scope.novelId !== undefined && scope.novelId !== null;
    const hasChapterScope =
      scope.chapterId !== undefined && scope.chapterId !== null;

    if (hasNovelScope === hasChapterScope) {
      throw new BadRequestException(
        'Provide exactly one of novelId or chapterId',
      );
    }

    if (hasNovelScope) {
      if (!Number.isInteger(scope.novelId) || (scope.novelId as number) <= 0) {
        throw new BadRequestException('novelId must be a positive integer');
      }

      return { novelId: scope.novelId };
    }

    if (
      !Number.isInteger(scope.chapterId) ||
      (scope.chapterId as number) <= 0
    ) {
      throw new BadRequestException('chapterId must be a positive integer');
    }

    return { chapterId: scope.chapterId };
  }

  private buildCommentTree(
    comments: CommentRecord[],
    viewerUserId?: number,
  ): SocialCommentNode[] {
    const sorted = [...comments].sort((left, right) => {
      const createdDiff = left.createdAt.getTime() - right.createdAt.getTime();
      if (createdDiff !== 0) {
        return createdDiff;
      }

      return left.id - right.id;
    });

    const nodeById = new Map<number, SocialCommentNode>();
    const roots: SocialCommentNode[] = [];

    for (const comment of sorted) {
      nodeById.set(comment.id, this.toCommentNode(comment, [], viewerUserId));
    }

    for (const comment of sorted) {
      const node = nodeById.get(comment.id);
      if (!node) {
        continue;
      }

      if (comment.parentId) {
        const parent = nodeById.get(comment.parentId);
        if (parent) {
          parent.replies.push(node);
          continue;
        }
      }

      roots.push(node);
    }

    return roots;
  }

  private toCommentNode(
    comment: CommentRecord,
    replies: SocialCommentNode[],
    viewerUserId?: number,
  ): SocialCommentNode {
    const reactionCounts = new Map<CommentReactionType, number>();
    let viewerReaction: CommentReactionType | null = null;

    for (const reaction of comment.reactions ?? []) {
      reactionCounts.set(
        reaction.type,
        (reactionCounts.get(reaction.type) ?? 0) + 1,
      );
      if (viewerUserId && reaction.userId === viewerUserId) {
        viewerReaction = reaction.type;
      }
    }

    const reactions = Array.from(reactionCounts.entries())
      .map(
        ([type, count]): SocialCommentReactionSummary => ({
          type,
          count,
        }),
      )
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.type.localeCompare(right.type);
      });

    return {
      id: comment.id,
      userId: comment.userId,
      novelId: comment.novelId,
      chapterId: comment.chapterId,
      parentId: comment.parentId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.user.id,
        nickname: comment.user.nickname,
        avatar: comment.user.avatar,
        role: comment.user.role,
      },
      reactions,
      reactionCount: reactions.reduce((sum, item) => sum + item.count, 0),
      viewerReaction,
      replies,
    };
  }

  private validateNovelId(novelId: number): void {
    if (!Number.isInteger(novelId) || novelId <= 0) {
      throw new BadRequestException('novelId must be a positive integer');
    }
  }

  private async ensureNovelExists(novelId: number): Promise<void> {
    const novel = await this.prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });

    if (!novel) {
      throw new NotFoundException('Novel not found');
    }
  }

  private async ensureChapterExists(chapterId: number): Promise<void> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true },
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }
  }

  private async ensureCommentExists(commentId: number): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
  }

  private async awardDailyMissionPoints(
    userId: number,
    reason: 'NOVEL_REVIEW' | 'COMMENT',
    amount: number,
  ): Promise<void> {
    const pointTransaction = (
      this.prisma as unknown as {
        pointTransaction?: {
          findFirst: typeof this.prisma.pointTransaction.findFirst;
          aggregate: typeof this.prisma.pointTransaction.aggregate;
          create: typeof this.prisma.pointTransaction.create;
        };
      }
    ).pointTransaction;

    if (!pointTransaction || amount <= 0) {
      return;
    }

    const now = new Date();
    const today = getVietnamDayBounds(now);
    const existingToday = await pointTransaction.findFirst({
      where: {
        userId,
        reason,
        amount: { gt: 0 },
        createdAt: {
          gte: today.start,
          lt: today.end,
        },
      },
      select: { id: true },
    });

    if (existingToday) {
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
        amount,
        balanceAfter: currentPointBalance + amount,
        type: PointTransactionType.EARN,
        reason,
        referenceId: makeDailyMissionReference(reason, userId, today.start),
      },
    });
  }
}
