import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorApprovalStatus, Prisma } from '@prisma/client';
import { sortChaptersByReadableOrder } from '../chapters/chapter-order';
import { PrismaService } from '../prisma.service';
import { CreateNovelDto } from './dto/create-novel.dto';
import { ListNovelsQueryDto, NovelListSort } from './dto/list-novels-query.dto';
import { UpdateNovelDto } from './dto/update-novel.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export interface PaginatedNovelResult {
  items: NovelWithTerms[];
  total: number;
  page: number;
  pageSize: number;
}

export type NovelWithTerms = Prisma.NovelGetPayload<{
  include: { terms: true };
}>;

export type NovelDetailResult = NovelWithTerms & {
  chapterCount: number;
  bookmarkCount: number;
  author: {
    id: number;
    displayName: string;
  } | null;
};

type AuthUser = {
  id: number;
  role: string;
};

function normalizePage(value?: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_PAGE;
}

function normalizePageSize(value?: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(value, MAX_PAGE_SIZE);
}

function resolveOrderBy(
  sort: NovelListSort,
): Prisma.NovelOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'title':
      return [{ title: 'asc' }, { id: 'asc' }];
    case 'views':
      return [{ viewCount: 'desc' }, { id: 'desc' }];
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}

function resolveWhere(
  query: ListNovelsQueryDto,
  currentUser?: AuthUser,
): Prisma.NovelWhereInput {
  const where: Prisma.NovelWhereInput = {};
  const search = query.q?.trim();

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { postContent: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (currentUser?.role === 'AUTHOR') {
    where.uploaderId = currentUser.id;
    return where;
  }

  if (query.scope === 'mine') {
    where.uploaderId = currentUser?.id ?? -1;
  }

  if (query.scope === 'others' && currentUser?.id !== undefined) {
    where.NOT = { uploaderId: currentUser.id };
  }

  return where;
}

function termsConnect(
  termIds?: number[],
): Prisma.TermUpdateManyWithoutNovelsNestedInput | undefined {
  if (!termIds) return undefined;
  return { set: termIds.map((id) => ({ id })) };
}

@Injectable()
export class NovelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ListNovelsQueryDto = {},
    currentUser?: AuthUser,
  ): Promise<PaginatedNovelResult> {
    const pageSize = normalizePageSize(query.pageSize);
    const requestedPage = normalizePage(query.page);
    const where = resolveWhere(query, currentUser);
    const total = await this.prisma.novel.count({ where });
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
    const page = Math.min(requestedPage, totalPages);
    const orderBy = resolveOrderBy(query.sort ?? 'newest');
    const skip = total === 0 ? 0 : (page - 1) * pageSize;

    const items =
      total === 0
        ? []
        : await this.prisma.novel.findMany({
            where,
            orderBy,
            skip,
            take: pageSize,
            include: { terms: true },
          });

    return { items, total, page, pageSize };
  }

  async findFirstChapter(id: number) {
    const chapters = await this.prisma.chapter.findMany({
      where: { novelId: id },
      orderBy: [{ chapterNumber: 'asc' }, { id: 'asc' }],
      select: { id: true, title: true, chapterNumber: true },
    });
    const firstChapter = sortChaptersByReadableOrder(chapters)[0];
    return { chapterId: firstChapter?.id ?? null };
  }

  async findOne(id: number): Promise<NovelDetailResult | null> {
    const novel = await this.prisma.novel.findUnique({
      where: { id },
      include: {
        terms: true,
        _count: {
          select: {
            chapters: true,
            bookmarks: true,
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
      },
    });

    if (!novel) {
      return null;
    }

    const { _count, uploader, ...rest } = novel;

    return {
      ...rest,
      chapterCount: _count.chapters,
      bookmarkCount: _count.bookmarks,
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

  async create(
    user: AuthUser | undefined,
    body: CreateNovelDto,
  ): Promise<NovelWithTerms> {
    if (user?.role === 'AUTHOR') {
      await this.assertApprovedAuthorProfile(user.id);
    }

    const maxNovel = await this.prisma.novel.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    const nextId = (maxNovel?.id ?? 0) + 1;

    return this.prisma.novel.create({
      data: {
        id: nextId,
        title: body.title,
        postContent: body.postContent,
        uploaderId: user?.id ?? 1,
        defaultChapterPrice: body.defaultChapterPrice ?? 0,
        freeChapterCount: body.freeChapterCount ?? 0,
        comboDiscountPct: body.comboDiscountPct ?? 0,
        featuredImage: body.featuredImage,
        terms: body.termIds?.length
          ? { connect: body.termIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { terms: true },
    });
  }

  async update(
    id: number,
    user: AuthUser | undefined,
    body: UpdateNovelDto,
  ): Promise<NovelWithTerms> {
    const existing = await this.prisma.novel.findUnique({
      where: { id },
      select: { id: true, uploaderId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Novel ${id} not found`);
    }

    this.ensureCanManageNovel(user, existing.uploaderId);

    if (user?.role === 'AUTHOR') {
      await this.assertApprovedAuthorProfile(user.id);
    }

    return this.prisma.novel.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.postContent !== undefined && {
          postContent: body.postContent,
        }),
        ...(body.defaultChapterPrice !== undefined && {
          defaultChapterPrice: body.defaultChapterPrice,
        }),
        ...(body.freeChapterCount !== undefined && {
          freeChapterCount: body.freeChapterCount,
        }),
        ...(body.comboDiscountPct !== undefined && {
          comboDiscountPct: body.comboDiscountPct,
        }),
        ...(body.featuredImage !== undefined && {
          featuredImage: body.featuredImage,
        }),
        ...(body.termIds !== undefined && {
          terms: termsConnect(body.termIds),
        }),
      },
      include: { terms: true },
    });
  }

  async remove(id: number, user: AuthUser | undefined) {
    const existing = await this.prisma.novel.findUnique({
      where: { id },
      select: { id: true, uploaderId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Novel ${id} not found`);
    }

    this.ensureCanManageNovel(user, existing.uploaderId);

    if (user?.role === 'AUTHOR') {
      await this.assertApprovedAuthorProfile(user.id);
    }

    return this.prisma.novel.delete({ where: { id } });
  }

  private async assertApprovedAuthorProfile(userId: number) {
    const profile = await this.prisma.authorProfile.findUnique({
      where: { userId },
      select: { approvalStatus: true },
    });

    if (!profile || profile.approvalStatus !== AuthorApprovalStatus.APPROVED) {
      throw new ForbiddenException('Author profile is not approved');
    }
  }

  private ensureCanManageNovel(user: AuthUser | undefined, uploaderId: number) {
    if (!user) {
      throw new ForbiddenException('Unauthenticated user');
    }

    if (user.role === 'ADMIN') {
      return;
    }

    if (user.role === 'AUTHOR' && user.id === uploaderId) {
      return;
    }

    throw new ForbiddenException('You cannot manage this novel');
  }
}
