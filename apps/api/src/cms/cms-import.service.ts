import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ParserService } from './parser.service';
import { PrismaService } from '../prisma.service';

type ChapterSummary = {
  id: number;
  chapterNumber: number;
  title: string;
};

export type CmsImportResponse = {
  novelId: number;
  chaptersCreated: ChapterSummary[];
  warnings: string[];
  errors: string[];
};

@Injectable()
export class CmsImportService {
  constructor(
    private readonly parserService: ParserService,
    private readonly prisma: PrismaService,
  ) {}

  async importChapters(
    novelId: number,
    file: Express.Multer.File,
  ): Promise<CmsImportResponse> {
    const novel = await this.prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });
    if (!novel) {
      throw new NotFoundException(`Novel ${novelId} not found`);
    }

    const parsed = await this.parserService.parse(file);

    if (parsed.errors.length > 0) {
      throw new BadRequestException(parsed.errors.join('; '));
    }

    if (parsed.chapters.length === 0) {
      throw new BadRequestException(
        'No chapters could be extracted from the uploaded file',
      );
    }

    try {
      const chaptersCreated = await this.prisma.$transaction(async (tx) => {
        const lastChapter = await tx.chapter.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true },
        });
        const startId = (lastChapter?.id ?? 0) + 1;

        const rows = parsed.chapters.map((ch, i) => ({
          id: startId + i,
          novelId,
          title: ch.title,
          postContent: ch.postContent,
          chapterNumber: ch.chapterNumber,
        }));

        await tx.chapter.createMany({ data: rows });

        return rows.map((row, i) => ({
          id: row.id,
          chapterNumber: parsed.chapters[i]?.chapterNumber ?? i + 1,
          title: row.title,
        }));
      });

      return { novelId, chaptersCreated, warnings: parsed.warnings, errors: [] };
    } catch (error) {
      throw new InternalServerErrorException(
        `Chapter import failed: ${(error as Error).message}`,
      );
    }
  }
}
