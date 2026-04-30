import { AuthorApprovalStatus, Prisma, Role } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

type AuthorApplicationRecord = Prisma.AuthorProfileGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        username: true;
        nickname: true;
        avatar: true;
        role: true;
      };
    };
  };
}>;

type UpsertAuthorApplicationInput = {
  penName: string;
  bio?: string;
  facebookUrl: string;
  telegramUrl?: string;
  otherPlatformName?: string;
  otherPlatformUrl?: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranch?: string;
};

type ListAuthorApplicationsInput = {
  status?: AuthorApprovalStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class AuthorApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnApplication(userId: number) {
    this.assertUserId(userId);

    const application = await this.prisma.authorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    return {
      application: application ? this.mapApplication(application) : null,
    };
  }

  async submitOwnApplication(
    userId: number,
    input: UpsertAuthorApplicationInput,
  ) {
    this.assertUserId(userId);

    const normalized = this.normalizeApplicationInput(input);

    const application = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.authorProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          approvalStatus: true,
        },
      });

      if (!existing) {
        return tx.authorProfile.create({
          data: {
            userId,
            ...normalized,
            approvalStatus: AuthorApprovalStatus.PENDING,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                avatar: true,
                role: true,
              },
            },
          },
        });
      }

      return tx.authorProfile.update({
        where: { userId },
        data: {
          ...normalized,
          ...(existing.approvalStatus === AuthorApprovalStatus.REJECTED
            ? {
                approvalStatus: AuthorApprovalStatus.PENDING,
                approvedAt: null,
                rejectedReason: null,
              }
            : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
              avatar: true,
              role: true,
            },
          },
        },
      });
    });

    return {
      application: this.mapApplication(application),
    };
  }

  async listApplications(query: ListAuthorApplicationsInput = {}) {
    const pageSize = this.normalizePageSize(query.pageSize);
    const page = this.normalizePage(query.page);
    const search = query.search?.trim();

    const where: Prisma.AuthorProfileWhereInput = {};
    if (query.status) {
      where.approvalStatus = query.status;
    }

    if (search) {
      where.OR = [
        { penName: { contains: search, mode: 'insensitive' } },
        { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
        {
          user: { is: { username: { contains: search, mode: 'insensitive' } } },
        },
        {
          user: { is: { nickname: { contains: search, mode: 'insensitive' } } },
        },
      ];
    }

    const [items, total, pending, approved, rejected] =
      await this.prisma.$transaction([
        this.prisma.authorProfile.findMany({
          where,
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                avatar: true,
                role: true,
              },
            },
          },
        }),
        this.prisma.authorProfile.count({ where }),
        this.prisma.authorProfile.count({
          where: { approvalStatus: AuthorApprovalStatus.PENDING },
        }),
        this.prisma.authorProfile.count({
          where: { approvalStatus: AuthorApprovalStatus.APPROVED },
        }),
        this.prisma.authorProfile.count({
          where: { approvalStatus: AuthorApprovalStatus.REJECTED },
        }),
      ]);

    return {
      items: items.map((item) => this.mapApplication(item)),
      summary: {
        pending,
        approved,
        rejected,
        totalApplications: pending + approved + rejected,
      },
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async approveApplication(adminUserId: number, targetUserId: number) {
    this.assertUserId(adminUserId);
    this.assertUserId(targetUserId);

    const application = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.authorProfile.findUnique({
        where: { userId: targetUserId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundException('Author application not found');
      }

      if (existing.approvalStatus !== AuthorApprovalStatus.PENDING) {
        throw new BadRequestException('Author application is not pending');
      }

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          role: existing.user.role === Role.ADMIN ? Role.ADMIN : Role.AUTHOR,
        },
      });

      return tx.authorProfile.update({
        where: { userId: targetUserId },
        data: {
          approvalStatus: AuthorApprovalStatus.APPROVED,
          approvedAt: new Date(),
          rejectedReason: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
              avatar: true,
              role: true,
            },
          },
        },
      });
    });

    return {
      application: this.mapApplication(application),
    };
  }

  async rejectApplication(
    adminUserId: number,
    targetUserId: number,
    reason?: string,
  ) {
    this.assertUserId(adminUserId);
    this.assertUserId(targetUserId);

    const normalizedReason = reason?.trim() || null;

    const application = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.authorProfile.findUnique({
        where: { userId: targetUserId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundException('Author application not found');
      }

      if (existing.approvalStatus !== AuthorApprovalStatus.PENDING) {
        throw new BadRequestException('Author application is not pending');
      }

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          role: existing.user.role === Role.ADMIN ? Role.ADMIN : Role.USER,
        },
      });

      return tx.authorProfile.update({
        where: { userId: targetUserId },
        data: {
          approvalStatus: AuthorApprovalStatus.REJECTED,
          approvedAt: null,
          rejectedReason: normalizedReason,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              nickname: true,
              avatar: true,
              role: true,
            },
          },
        },
      });
    });

    return {
      application: this.mapApplication(application),
    };
  }

  private mapApplication(application: AuthorApplicationRecord) {
    return {
      userId: application.user.id,
      email: application.user.email,
      username: application.user.username,
      nickname: application.user.nickname,
      avatar: application.user.avatar,
      role: application.user.role,
      penName: application.penName,
      bio: application.bio,
      facebookUrl: application.facebookUrl,
      telegramUrl: application.telegramUrl,
      otherPlatformName: application.otherPlatformName,
      otherPlatformUrl: application.otherPlatformUrl,
      bankAccountName: application.bankAccountName,
      bankAccountNumber: application.bankAccountNumber,
      bankName: application.bankName,
      bankBranch: application.bankBranch,
      approvalStatus: application.approvalStatus,
      approvedAt: application.approvedAt,
      rejectedReason: application.rejectedReason,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private normalizeApplicationInput(input: UpsertAuthorApplicationInput) {
    const otherPlatformName = input.otherPlatformName?.trim() || null;
    const otherPlatformUrl = input.otherPlatformUrl?.trim() || null;

    if (
      (otherPlatformName && !otherPlatformUrl) ||
      (!otherPlatformName && otherPlatformUrl)
    ) {
      throw new BadRequestException(
        'otherPlatformName and otherPlatformUrl must be provided together',
      );
    }

    return {
      penName: input.penName.trim(),
      bio: input.bio?.trim() || null,
      facebookUrl: this.normalizeUrl(input.facebookUrl, 'facebookUrl'),
      telegramUrl: input.telegramUrl
        ? this.normalizeUrl(input.telegramUrl, 'telegramUrl')
        : null,
      otherPlatformName,
      otherPlatformUrl: otherPlatformUrl
        ? this.normalizeUrl(otherPlatformUrl, 'otherPlatformUrl')
        : null,
      bankAccountName: input.bankAccountName.trim(),
      bankAccountNumber: input.bankAccountNumber.replace(/\s+/g, ''),
      bankName: input.bankName.trim(),
      bankBranch: input.bankBranch?.trim() || null,
    };
  }

  private normalizeUrl(value: string, fieldName: string) {
    const trimmed = value.trim();
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    try {
      const url = new URL(normalized);
      if (!url.hostname) {
        throw new Error('missing hostname');
      }
      return url.toString();
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid URL`);
    }
  }

  private normalizePage(value?: number) {
    return Number.isInteger(value) && (value as number) > 0
      ? (value as number)
      : DEFAULT_PAGE;
  }

  private normalizePageSize(value?: number) {
    if (!Number.isInteger(value) || (value as number) <= 0) {
      return DEFAULT_PAGE_SIZE;
    }

    return Math.min(value as number, MAX_PAGE_SIZE);
  }

  private assertUserId(userId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException(
        'A valid authenticated user id is required',
      );
    }
  }
}
