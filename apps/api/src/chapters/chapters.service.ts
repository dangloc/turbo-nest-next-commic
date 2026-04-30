import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { sortChaptersByReadableOrder } from './chapter-order';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

type AuthUser = {
  id: number;
  role: string;
};

@Injectable()
export class ChaptersService {
  constructor(private readonly prisma: PrismaService) {}

  async listByNovel(novelId: number) {
    const chapters = await this.prisma.chapter.findMany({
      where: { novelId },
      orderBy: [{ chapterNumber: 'asc' }, { id: 'asc' }],
    });

    return sortChaptersByReadableOrder(chapters);
  }

  async findOne(id: number) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter) {
      throw new NotFoundException(`Chapter ${id} not found`);
    }

    return chapter;
  }

  async create(novelId: number, user: AuthUser | undefined, body: CreateChapterDto) {
    const novel = await this.prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true, uploaderId: true },
    });

    if (!novel) {
      throw new NotFoundException(`Novel ${novelId} not found`);
    }

    this.ensureCanManageNovel(user, novel.uploaderId);

    const [maxChapter, maxNovelChapter] = await Promise.all([
      this.prisma.chapter.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      }),
      this.prisma.chapter.findFirst({
        where: { novelId },
        orderBy: [{ chapterNumber: 'desc' }, { id: 'desc' }],
        select: { chapterNumber: true },
      }),
    ]);
    const nextId = (maxChapter?.id ?? 0) + 1;
    const nextChapterNumber = Math.max(maxNovelChapter?.chapterNumber ?? 0, 0) + 1;

    return this.prisma.chapter.create({
      data: {
        id: nextId,
        novelId,
        title: body.title,
        postContent: body.postContent,
        priceOverride: body.priceOverride,
        chapterNumber: body.chapterNumber ?? nextChapterNumber,
      },
    });
  }

  async update(id: number, user: AuthUser | undefined, body: UpdateChapterDto) {
    const existing = await this.prisma.chapter.findUnique({
      where: { id },
      select: {
        id: true,
        novel: {
          select: {
            uploaderId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Chapter ${id} not found`);
    }

    this.ensureCanManageNovel(user, existing.novel.uploaderId);

    return this.prisma.chapter.update({
      where: { id },
      data: {
        title: body.title,
        postContent: body.postContent,
        priceOverride: body.priceOverride,
        chapterNumber: body.chapterNumber,
      },
    });
  }

  async removeAllByNovel(novelId: number, user: AuthUser | undefined) {
    const novel = await this.prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true, uploaderId: true },
    });

    if (!novel) {
      throw new NotFoundException(`Novel ${novelId} not found`);
    }

    this.ensureCanManageNovel(user, novel.uploaderId);

    const { count } = await this.prisma.chapter.deleteMany({ where: { novelId } });
    return { deleted: count };
  }

  async remove(id: number, user: AuthUser | undefined) {
    const existing = await this.prisma.chapter.findUnique({
      where: { id },
      select: {
        id: true,
        novel: {
          select: {
            uploaderId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Chapter ${id} not found`);
    }

    this.ensureCanManageNovel(user, existing.novel.uploaderId);

    return this.prisma.chapter.delete({ where: { id } });
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

    throw new ForbiddenException('You cannot manage chapters for this novel');
  }
}
