import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import {
  DashboardModules,
  Roles,
  RolesGuard,
} from '../auth';
import {
  ADMIN_DASHBOARD_MODULES,
  AUTHOR_DASHBOARD_MODULES,
  getExplicitAdminDashboardModules,
  getExplicitAuthorDashboardModules,
  getConfiguredAdminDashboardModules,
  getConfiguredAuthorDashboardModules,
  getRoleDefaultAdminDashboardModules,
  getRoleDefaultAuthorDashboardModules,
  isSuperAdminId,
  type DashboardRoleDefaults,
} from '../auth/dashboard-access';
import { PrismaService } from '../prisma.service';

type AdminUserStatus = 'ACTIVE';
type RequestUser = { id?: number; role?: string };

@Controller('users')
@UseGuards(RolesGuard)
@Roles('ADMIN')
@DashboardModules('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('search') searchRaw?: string,
    @Query('role') roleRaw?: string,
  ) {
    const page = this.normalizePage(pageRaw);
    const pageSize = this.normalizePageSize(pageSizeRaw);
    const search = searchRaw?.trim();
    const searchId = this.normalizeSearchUserId(search);
    const role = this.normalizeRole(roleRaw);

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        ...(searchId !== null ? [{ id: searchId }] : []),
        { username: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [items, total, totalUsers, adminUsers, authorUsers, readerUsers, usersWithBalance] =
      await Promise.all([
        this.prisma.user.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            username: true,
            nickname: true,
            email: true,
            avatar: true,
            role: true,
            balance: true,
            kimTe: true,
            vipLevelId: true,
            currentVipLevelId: true,
            createdAt: true,
            updatedAt: true,
            wallet: {
              select: {
                balance: true,
                depositedBalance: true,
                earnedBalance: true,
                totalDeposited: true,
              },
            },
            vipLevel: {
              select: {
                id: true,
                name: true,
              },
            },
            currentVipLevel: {
              select: {
                id: true,
                name: true,
              },
            },
            providers: {
              select: {
                provider: true,
              },
            },
            _count: {
              select: {
                transactions: true,
                purchasedChapters: true,
              },
            },
          },
        }),
        this.prisma.user.count({ where }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: Role.ADMIN } }),
        this.prisma.user.count({ where: { role: Role.AUTHOR } }),
        this.prisma.user.count({ where: { role: Role.USER } }),
        this.prisma.user.count({
          where: {
            OR: [
              { balance: { gt: 0 } },
              {
                wallet: {
                  is: {
                    OR: [
                      { balance: { gt: new Prisma.Decimal(0) } },
                      { depositedBalance: { gt: new Prisma.Decimal(0) } },
                      { totalDeposited: { gt: new Prisma.Decimal(0) } },
                    ],
                  },
                },
              },
            ],
          },
        }),
      ]);

    return {
      items: items.map((user) => {
        const walletBalance = this.toNumber(user.wallet?.balance);
        const depositedBalance = this.toNumber(user.wallet?.depositedBalance);
        const currentBalance =
          depositedBalance > 0
            ? depositedBalance
            : walletBalance > 0
              ? walletBalance
              : user.balance;
        const totalDeposited = this.toNumber(user.wallet?.totalDeposited);
        const vipLevel = user.currentVipLevel ?? user.vipLevel;

        return {
          id: user.id,
          username: user.username,
          name: user.nickname ?? user.username ?? user.email,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          isSuperAdmin: isSuperAdminId(user.id),
          status: 'ACTIVE' as AdminUserStatus,
          balance: currentBalance,
          kimTe:
            user.kimTe > 0 || totalDeposited <= 0
              ? user.kimTe
              : Math.floor(totalDeposited),
          vipLevelId: user.vipLevelId ?? user.currentVipLevelId,
          vipLevelName: vipLevel?.name ?? null,
          totalDeposited:
            totalDeposited > 0 ? totalDeposited : Math.max(currentBalance, 0),
          earnedBalance: this.toNumber(user.wallet?.earnedBalance),
          providerNames: user.providers.map((provider) => provider.provider),
          transactionCount: user._count.transactions,
          purchasedChapterCount: user._count.purchasedChapters,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }),
      summary: {
        totalUsers,
        adminUsers,
        authorUsers,
        readerUsers,
        usersWithBalance,
      },
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.getUserDetailById(id);
    const roleDefaults = await this.getDashboardRoleDefaults();

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.mapUserDetail(user, roleDefaults);
  }

  @Patch(':id')
  async updateUser(
    @Req() req: { user?: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      email?: string;
      username?: string | null;
      nickname?: string | null;
      avatar?: string | null;
    },
  ) {
    this.assertSuperAdmin(req.user);

    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true },
    });

    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const email = this.normalizeEmail(body.email);
    const username = this.normalizeUsername(body.username);
    const nickname = this.normalizeNickname(body.nickname);
    const avatar = this.normalizeAvatar(body.avatar);

    if (email && email !== existing.email) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (emailOwner && emailOwner.id !== id) {
        throw new BadRequestException('Email đã được sử dụng');
      }
    }

    if (username && username !== existing.username) {
      const usernameOwner = await this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (usernameOwner && usernameOwner.id !== id) {
        throw new BadRequestException('Tên đăng nhập đã tồn tại');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(email !== undefined ? { email } : {}),
        ...(username !== undefined ? { username } : {}),
        ...(nickname !== undefined ? { nickname } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
      },
      select: this.userDetailSelect(),
    });

    return this.mapUserDetail(updated, await this.getDashboardRoleDefaults());
  }

  @Patch(':id/role')
  async updateRole(
    @Req() req: { user?: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role?: 'USER' | 'AUTHOR' | 'ADMIN' },
  ) {
    this.assertSuperAdmin(req.user);

    if (isSuperAdminId(id)) {
      throw new ForbiddenException('Super admin role is fixed');
    }

    const role = this.normalizeRole(body.role);
    if (!role) {
      throw new BadRequestException('role must be USER, AUTHOR, or ADMIN');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        avatar: true,
        role: true,
        balance: true,
        kimTe: true,
        vipLevelId: true,
        currentVipLevelId: true,
        adminDashboardModules: true,
        authorDashboardModules: true,
        createdAt: true,
        updatedAt: true,
        wallet: {
          select: {
            balance: true,
            depositedBalance: true,
            earnedBalance: true,
            totalDeposited: true,
          },
        },
        vipLevel: {
          select: {
            id: true,
            name: true,
          },
        },
        currentVipLevel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.mapUserDetail(user, await this.getDashboardRoleDefaults());
  }

  @Patch(':id/dashboard-access')
  async updateDashboardAccess(
    @Req() req: { user?: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      adminDashboardModules?: unknown;
      authorDashboardModules?: unknown;
    },
  ) {
    this.assertSuperAdmin(req.user);

    if (isSuperAdminId(id)) {
      throw new ForbiddenException('Super admin access is fixed');
    }

    const adminDashboardModules = this.normalizeModuleAssignment(
      body.adminDashboardModules,
      ADMIN_DASHBOARD_MODULES,
      'adminDashboardModules',
    );
    const authorDashboardModules = this.normalizeModuleAssignment(
      body.authorDashboardModules,
      AUTHOR_DASHBOARD_MODULES,
      'authorDashboardModules',
    );

    if (
      adminDashboardModules === undefined &&
      authorDashboardModules === undefined
    ) {
      throw new BadRequestException(
        'At least one dashboard access field is required',
      );
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(adminDashboardModules !== undefined
          ? {
              adminDashboardModules:
                this.toStoredModuleValue(
                  adminDashboardModules,
                  ADMIN_DASHBOARD_MODULES,
                ),
            }
          : {}),
        ...(authorDashboardModules !== undefined
          ? {
              authorDashboardModules:
                this.toStoredModuleValue(
                  authorDashboardModules,
                  AUTHOR_DASHBOARD_MODULES,
                ),
            }
          : {}),
      },
      select: this.userDetailSelect(),
    });

    return this.mapUserDetail(user, await this.getDashboardRoleDefaults());
  }

  private normalizePage(value?: string) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }

  private normalizePageSize(value?: string) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 100
      ? parsed
      : 20;
  }

  private normalizeSearchUserId(value?: string | null) {
    if (!value || !/^\d+$/.test(value)) {
      return null;
    }

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private normalizeRole(value?: string): Role | undefined {
    if (!value || value === 'ALL') {
      return undefined;
    }

    return Object.values(Role).includes(value as Role)
      ? (value as Role)
      : undefined;
  }

  private toNumber(value: Prisma.Decimal | null | undefined) {
    return Number(value ?? 0);
  }

  private normalizeEmail(value?: string) {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    return normalized;
  }

  private normalizeUsername(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value?.trim().toLowerCase() ?? '';
    if (!normalized) {
      return null;
    }

    if (normalized.length < 3 || normalized.length > 32) {
      throw new BadRequestException(
        'Tên đăng nhập phải dài từ 3 đến 32 ký tự',
      );
    }

    if (!/^[a-z0-9._-]+$/i.test(normalized)) {
      throw new BadRequestException(
        'Tên đăng nhập chỉ được chứa chữ, số, dấu chấm, gạch dưới hoặc gạch ngang',
      );
    }

    return normalized;
  }

  private normalizeNickname(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value?.trim() ?? '';
    if (!normalized) {
      return null;
    }

    if (normalized.length < 2 || normalized.length > 40) {
      throw new BadRequestException('Nickname phải dài từ 2 đến 40 ký tự');
    }

    return normalized;
  }

  private normalizeAvatar(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value?.trim() ?? '';
    if (!normalized) {
      return null;
    }

    if (normalized.length > 255) {
      throw new BadRequestException('Avatar URL quá dài');
    }

    return normalized;
  }

  private assertSuperAdmin(user?: RequestUser) {
    if (!isSuperAdminId(user?.id)) {
      throw new ForbiddenException(
        'Only super admin can edit users, roles, or dashboard access',
      );
    }
  }

  private normalizeModuleAssignment<T extends readonly string[]>(
    value: unknown,
    allowed: T,
    fieldName: string,
  ): T[number][] | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException(`${fieldName} must be an array or null`);
    }

    const allowedSet = new Set<string>(allowed);
    const normalized: T[number][] = [];

    for (const item of value) {
      if (typeof item !== 'string' || !allowedSet.has(item)) {
        throw new BadRequestException(
          `${fieldName} contains an invalid dashboard module`,
        );
      }

      if (!normalized.includes(item as T[number])) {
        normalized.push(item as T[number]);
      }
    }

    return normalized;
  }

  private toStoredModuleValue<T extends readonly string[]>(
    value: T[number][] | null,
    fullSet: T,
  ) {
    if (value === null) {
      return Prisma.DbNull;
    }

    const normalized = [...value].sort();
    const fullSetSorted = [...fullSet].sort();
    const isFullSet =
      normalized.length === fullSetSorted.length &&
      normalized.every((item, index) => item === fullSetSorted[index]);

    return isFullSet ? Prisma.DbNull : normalized;
  }

  private userDetailSelect() {
    return {
      id: true,
      username: true,
      nickname: true,
      email: true,
      avatar: true,
      role: true,
      balance: true,
      kimTe: true,
      vipLevelId: true,
      currentVipLevelId: true,
      adminDashboardModules: true,
      authorDashboardModules: true,
      createdAt: true,
      updatedAt: true,
      wallet: {
        select: {
          balance: true,
          depositedBalance: true,
          earnedBalance: true,
          totalDeposited: true,
        },
      },
      vipLevel: {
        select: {
          id: true,
          name: true,
        },
      },
      currentVipLevel: {
        select: {
          id: true,
          name: true,
        },
      },
    } satisfies Prisma.UserSelect;
  }

  private async getUserDetailById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.userDetailSelect(),
    });
  }

  private async getDashboardRoleDefaults(): Promise<DashboardRoleDefaults> {
    const settings = await this.prisma.adSettings?.findUnique({
      where: { id: 1 },
      select: {
        adminRoleDashboardModules: true,
        authorRoleDashboardModules: true,
      },
    });

    return {
      adminDashboardModules: getRoleDefaultAdminDashboardModules(
        settings?.adminRoleDashboardModules,
      ),
      authorDashboardModules: getRoleDefaultAuthorDashboardModules(
        settings?.authorRoleDashboardModules,
      ),
    };
  }

  private mapUserDetail(
    user: {
      id: number;
      username: string | null;
      nickname: string | null;
      email: string;
      avatar: string | null;
      role: Role;
      balance: number;
      kimTe: number;
      vipLevelId: number | null;
      currentVipLevelId: number | null;
      adminDashboardModules: Prisma.JsonValue | null;
      authorDashboardModules: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
      wallet: {
        balance: Prisma.Decimal;
        depositedBalance: Prisma.Decimal;
        earnedBalance: Prisma.Decimal;
        totalDeposited: Prisma.Decimal;
      } | null;
      vipLevel: { id: number; name: string } | null;
      currentVipLevel: { id: number; name: string } | null;
    },
    roleDefaults: DashboardRoleDefaults,
  ) {
    const walletBalance = this.toNumber(user.wallet?.balance);
    const depositedBalance = this.toNumber(user.wallet?.depositedBalance);
    const currentBalance =
      depositedBalance > 0
        ? depositedBalance
        : walletBalance > 0
          ? walletBalance
          : user.balance;
    const totalDeposited = this.toNumber(user.wallet?.totalDeposited);
    const vipLevel = user.currentVipLevel ?? user.vipLevel;

    return {
      id: user.id,
      username: user.username,
      name: user.nickname ?? user.username ?? user.email,
      nickname: user.nickname,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isSuperAdmin: isSuperAdminId(user.id),
      balance: currentBalance,
      kimTe:
        user.kimTe > 0 || totalDeposited <= 0
          ? user.kimTe
          : Math.floor(totalDeposited),
      vipLevelId: user.vipLevelId ?? user.currentVipLevelId,
      vipLevelName: vipLevel?.name ?? null,
      totalDeposited:
        totalDeposited > 0 ? totalDeposited : Math.max(currentBalance, 0),
      earnedBalance: this.toNumber(user.wallet?.earnedBalance),
      adminDashboardModules: getConfiguredAdminDashboardModules(
        user.adminDashboardModules,
        roleDefaults.adminDashboardModules ?? ADMIN_DASHBOARD_MODULES,
      ),
      authorDashboardModules: getConfiguredAuthorDashboardModules(
        user.authorDashboardModules,
        roleDefaults.authorDashboardModules ?? AUTHOR_DASHBOARD_MODULES,
      ),
      adminDashboardModulesOverride: getExplicitAdminDashboardModules(
        user.adminDashboardModules,
      ),
      authorDashboardModulesOverride: getExplicitAuthorDashboardModules(
        user.authorDashboardModules,
      ),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
