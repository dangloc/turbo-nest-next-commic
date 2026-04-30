import 'reflect-metadata';

import { Reflector } from '@nestjs/core';
import { Prisma, Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(prisma);
  });

  it('exposes ADMIN role metadata and maps paginated user wallet data', async () => {
    const classRoles = Reflect.getMetadata(ROLES_KEY, UsersController);
    expect(classRoles).toEqual(['ADMIN']);

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValueOnce(['ADMIN'])
      .mockReturnValueOnce(undefined);
    const guard = new RolesGuard(reflector, prisma);
    const context = {
      getHandler: () => controller.findAll,
      getClass: () => UsersController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 2, role: 'ADMIN' } }),
      }),
    };
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      role: Role.ADMIN,
      adminDashboardModules: null,
      authorDashboardModules: null,
    });
    await expect(guard.canActivate(context as any)).resolves.toBe(true);

    prisma.user.findMany.mockResolvedValue([
      {
        id: 7,
        username: 'alice',
        nickname: 'Alice',
        email: 'alice@example.com',
        avatar: null,
        role: Role.USER,
        balance: 0,
        kimTe: 0,
        vipLevelId: null,
        currentVipLevelId: 2,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
        wallet: {
          balance: new Prisma.Decimal(200000),
          depositedBalance: new Prisma.Decimal(250000),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(300000),
        },
        vipLevel: null,
        currentVipLevel: {
          id: 2,
          name: 'VIP 2',
        },
        providers: [{ provider: 'google' }],
        _count: {
          transactions: 3,
          purchasedChapters: 4,
        },
      },
    ]);
    prisma.user.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(6);

    await expect(controller.findAll('2', '10', 'alice', 'USER')).resolves.toEqual(
      {
        items: [
          {
            id: 7,
            username: 'alice',
            name: 'Alice',
            email: 'alice@example.com',
            avatar: null,
            role: Role.USER,
            isSuperAdmin: false,
            status: 'ACTIVE',
            balance: 250000,
            kimTe: 300000,
            vipLevelId: 2,
            vipLevelName: 'VIP 2',
            totalDeposited: 300000,
            earnedBalance: 0,
            providerNames: ['google'],
            transactionCount: 3,
            purchasedChapterCount: 4,
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            updatedAt: new Date('2026-04-02T00:00:00.000Z'),
          },
        ],
        summary: {
          totalUsers: 12,
          adminUsers: 2,
          authorUsers: 3,
          readerUsers: 7,
          usersWithBalance: 6,
        },
        page: 2,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    );

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          role: Role.USER,
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('supports AUTHOR role updates', async () => {
    prisma.user.update.mockResolvedValue({
      id: 2,
      username: 'writer',
      nickname: 'Writer',
      email: 'writer@example.com',
      avatar: null,
      role: Role.AUTHOR,
      balance: 0,
      kimTe: 0,
      vipLevelId: null,
      currentVipLevelId: null,
      adminDashboardModules: ['overview'],
      authorDashboardModules: ['novels'],
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
      wallet: {
        balance: new Prisma.Decimal(0),
        depositedBalance: new Prisma.Decimal(0),
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(0),
      },
      vipLevel: null,
      currentVipLevel: null,
    });

    await expect(
      controller.updateRole({ user: { id: 1 } } as any, 2, {
        role: Role.AUTHOR,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 2,
      role: Role.AUTHOR,
      }),
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { role: Role.AUTHOR },
      select: expect.any(Object),
    });
  });

  it('supports searching users by numeric id', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(6);

    await controller.findAll('1', '20', '77', 'ALL');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { id: 77 },
            { username: { contains: '77', mode: 'insensitive' } },
            { nickname: { contains: '77', mode: 'insensitive' } },
            { email: { contains: '77', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });
});
