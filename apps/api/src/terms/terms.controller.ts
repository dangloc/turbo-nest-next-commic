import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthorApprovalStatus, TermSubmissionStatus } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import { PrismaService } from '../prisma.service';

class CreateTermDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100) slug: string;
  @IsString() @IsNotEmpty() @MaxLength(50) taxonomy: string;
}

class UpdateTermDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100) slug: string;
}

class ReviewTermSubmissionDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

type TermRequest = {
  user?: {
    id: number;
    role: string;
  };
};

@Controller('terms')
@DashboardModules('terms')
export class TermsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('taxonomy') taxonomy?: string) {
    return this.prisma.term.findMany({
      where: taxonomy ? { taxonomy } : undefined,
      orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }],
    });
  }

  @Get('submissions')
  @UseGuards(RolesGuard)
  @Roles('AUTHOR', 'ADMIN')
  async listSubmissions(
    @Req() req: TermRequest,
    @Query('taxonomy') taxonomy?: string,
    @Query('status') status?: string,
  ) {
    const where: {
      userId?: number;
      taxonomy?: string;
      status?: TermSubmissionStatus;
    } = {};

    if (req.user?.role === 'AUTHOR') {
      where.userId = req.user.id;
    }

    if (taxonomy?.trim()) {
      where.taxonomy = taxonomy.trim();
    }

    const normalizedStatus = this.normalizeSubmissionStatus(status);
    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    const items = await this.prisma.termSubmission.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      userId: item.userId,
      user: {
        id: item.user.id,
        email: item.user.email,
        username: item.user.username,
        nickname: item.user.nickname,
      },
      name: item.name,
      slug: item.slug,
      taxonomy: item.taxonomy,
      status: item.status,
      reviewNote: item.reviewNote,
      reviewedByUserId: item.reviewedByUserId,
      reviewedAt: item.reviewedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: CreateTermDto,
  ) {
    await this.ensureLiveTermUnique(body.slug, body.taxonomy);
    return this.createLiveTerm(body.name, body.slug, body.taxonomy);
  }

  @Post('submissions')
  @UseGuards(RolesGuard)
  @Roles('AUTHOR')
  async submit(
    @Req() req: TermRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: CreateTermDto,
  ) {
    const userId = req.user?.id as number;
    await this.assertApprovedAuthor(userId);
    await this.ensureLiveTermUnique(body.slug, body.taxonomy);

    const pendingConflict = await this.prisma.termSubmission.findFirst({
      where: {
        slug: body.slug,
        taxonomy: body.taxonomy,
        status: TermSubmissionStatus.PENDING,
      },
      select: { id: true },
    });

    if (pendingConflict) {
      throw new BadRequestException(
        `Đã có yêu cầu chờ duyệt cho slug "${body.slug}" trong taxonomy "${body.taxonomy}"`,
      );
    }

    const submission = await this.prisma.termSubmission.create({
      data: {
        userId,
        name: body.name,
        slug: body.slug,
        taxonomy: body.taxonomy,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    return {
      id: submission.id,
      userId: submission.userId,
      user: submission.user,
      name: submission.name,
      slug: submission.slug,
      taxonomy: submission.taxonomy,
      status: submission.status,
      reviewNote: submission.reviewNote,
      reviewedByUserId: submission.reviewedByUserId,
      reviewedAt: submission.reviewedAt,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: UpdateTermDto,
  ) {
    const existing = await this.prisma.term.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Term ${id} not found`);

    const conflict = await this.prisma.term.findUnique({
      where: {
        slug_taxonomy: { slug: body.slug, taxonomy: existing.taxonomy },
      },
    });
    if (conflict && conflict.id !== id) {
      throw new BadRequestException(
        `Slug "${body.slug}" đã được dùng trong taxonomy "${existing.taxonomy}"`,
      );
    }

    return this.prisma.term.update({
      where: { id },
      data: { name: body.name, slug: body.slug },
    });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const existing = await this.prisma.term.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Term ${id} not found`);
    return this.prisma.term.delete({ where: { id } });
  }

  @Post('submissions/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async approveSubmission(
    @Req() req: TermRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: ReviewTermSubmissionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.termSubmission.findUnique({
        where: { id },
      });

      if (!submission) {
        throw new NotFoundException(`Term submission ${id} not found`);
      }

      if (submission.status !== TermSubmissionStatus.PENDING) {
        throw new BadRequestException('Term submission is not pending');
      }

      const conflict = await tx.term.findUnique({
        where: {
          slug_taxonomy: {
            slug: submission.slug,
            taxonomy: submission.taxonomy,
          },
        },
      });

      if (conflict) {
        throw new BadRequestException(
          `Term với slug "${submission.slug}" đã tồn tại trong taxonomy "${submission.taxonomy}"`,
        );
      }

      const last = await tx.term.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });

      const term = await tx.term.create({
        data: {
          id: (last?.id ?? 0) + 1,
          name: submission.name,
          slug: submission.slug,
          taxonomy: submission.taxonomy,
        },
      });

      const updatedSubmission = await tx.termSubmission.update({
        where: { id },
        data: {
          status: TermSubmissionStatus.APPROVED,
          reviewNote: body.note?.trim() || null,
          reviewedByUserId: req.user?.id,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
            },
          },
        },
      });

      return {
        submission: {
          id: updatedSubmission.id,
          userId: updatedSubmission.userId,
          user: updatedSubmission.user,
          name: updatedSubmission.name,
          slug: updatedSubmission.slug,
          taxonomy: updatedSubmission.taxonomy,
          status: updatedSubmission.status,
          reviewNote: updatedSubmission.reviewNote,
          reviewedByUserId: updatedSubmission.reviewedByUserId,
          reviewedAt: updatedSubmission.reviewedAt,
          createdAt: updatedSubmission.createdAt,
          updatedAt: updatedSubmission.updatedAt,
        },
        term,
      };
    });
  }

  @Post('submissions/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async rejectSubmission(
    @Req() req: TermRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: ReviewTermSubmissionDto,
  ) {
    const submission = await this.prisma.termSubmission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Term submission ${id} not found`);
    }

    if (submission.status !== TermSubmissionStatus.PENDING) {
      throw new BadRequestException('Term submission is not pending');
    }

    const updated = await this.prisma.termSubmission.update({
      where: { id },
      data: {
        status: TermSubmissionStatus.REJECTED,
        reviewNote: body.note?.trim() || null,
        reviewedByUserId: req.user?.id,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      user: updated.user,
      name: updated.name,
      slug: updated.slug,
      taxonomy: updated.taxonomy,
      status: updated.status,
      reviewNote: updated.reviewNote,
      reviewedByUserId: updated.reviewedByUserId,
      reviewedAt: updated.reviewedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  private normalizeSubmissionStatus(value?: string) {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toUpperCase();
    return Object.values(TermSubmissionStatus).includes(
      normalized as TermSubmissionStatus,
    )
      ? (normalized as TermSubmissionStatus)
      : undefined;
  }

  private async assertApprovedAuthor(userId: number) {
    const profile = await this.prisma.authorProfile.findUnique({
      where: { userId },
      select: { approvalStatus: true },
    });

    if (!profile || profile.approvalStatus !== AuthorApprovalStatus.APPROVED) {
      throw new BadRequestException('Author profile is not approved');
    }
  }

  private async ensureLiveTermUnique(slug: string, taxonomy: string) {
    const conflict = await this.prisma.term.findUnique({
      where: { slug_taxonomy: { slug, taxonomy } },
    });

    if (conflict) {
      throw new BadRequestException(
        `Term với slug "${slug}" đã tồn tại trong taxonomy "${taxonomy}"`,
      );
    }
  }

  private async createLiveTerm(name: string, slug: string, taxonomy: string) {
    const last = await this.prisma.term.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    return this.prisma.term.create({
      data: {
        id: (last?.id ?? 0) + 1,
        name,
        slug,
        taxonomy,
      },
    });
  }
}
