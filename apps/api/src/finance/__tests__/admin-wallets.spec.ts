import 'reflect-metadata';

import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FinanceService } from '../finance.service';
import { AdminWalletsController } from '../admin-wallets.controller';

describe('Admin wallets API', () => {
  const prisma = {
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  } as any;

  let service: FinanceService;
  let controller: AdminWalletsController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    controller = new AdminWalletsController(service);
  });

  it('exposes ADMIN role metadata and blocks unauthenticated guard context', () => {
    const classRoles = Reflect.getMetadata(ROLES_KEY, AdminWalletsController);
    expect(classRoles).toEqual(['ADMIN']);

    const methodRoles = Reflect.getMetadata(ROLES_KEY, controller.listTransactions);
    expect(methodRoles).toBeUndefined();

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const unauthenticatedContext = {
      getHandler: () => controller.listTransactions,
      getClass: () => AdminWalletsController,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };

    expect(() => guard.canActivate(unauthenticatedContext as any)).toThrow(
      'Authentication required',
    );
  });

  it('returns mapped transaction rows and summary metrics', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 901,
        transactionDate: new Date('2026-04-24T08:00:00.000Z'),
        amountIn: new Prisma.Decimal(120000),
        type: 'DEPOSIT',
        sepayCode: 'sp-001',
        referenceCode: 'ref-001',
        gateway: 'SePay',
        user: {
          id: 11,
          username: 'alice',
          email: 'alice@example.com',
          nickname: 'Alice',
          balance: 180000,
          wallet: {
            balance: new Prisma.Decimal(180000),
            depositedBalance: new Prisma.Decimal(190000),
            earnedBalance: new Prisma.Decimal(0),
            totalDeposited: new Prisma.Decimal(220000),
          },
          vipLevel: {
            name: 'Gold',
          },
          currentVipLevel: null,
        },
      },
    ]);
    prisma.transaction.count.mockResolvedValue(7);
    prisma.transaction.aggregate.mockResolvedValue({
      _sum: { amountIn: new Prisma.Decimal(500000) },
      _count: { id: 12 },
    });
    prisma.user.count.mockResolvedValue(4);

    await expect(
      service.listAdminWalletTransactions({
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      items: [
        {
          transactionId: 901,
          transactionDate: new Date('2026-04-24T08:00:00.000Z'),
          username: 'alice',
          amountIn: 120000,
          type: 'DEPOSIT',
          sepayCode: 'sp-001',
          referenceCode: 'ref-001',
          gateway: 'SePay',
          currentBalance: 190000,
          vipLevelName: 'Gold',
        },
      ],
      summary: {
        totalRevenue: 500000,
        totalUsersWithBalance: 4,
        totalTransactions: 12,
      },
      page: 1,
      pageSize: 20,
      total: 7,
      totalPages: 1,
    });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      }),
    );
  });

  it('normalizes query bounds and supports username sorting/search', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(101);
    prisma.transaction.aggregate.mockResolvedValue({
      _sum: { amountIn: new Prisma.Decimal(0) },
      _count: { id: 0 },
    });
    prisma.user.count.mockResolvedValue(0);

    await service.listAdminWalletTransactions({
      page: -2,
      pageSize: 999,
      sortBy: 'username',
      sortOrder: 'asc',
      search: 'john',
    });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        where: {
          type: 'DEPOSIT',
          user: {
            OR: [
              {
                username: {
                  contains: 'john',
                  mode: 'insensitive',
                },
              },
              {
                nickname: {
                  contains: 'john',
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: 'john',
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
        orderBy: [{ user: { username: 'asc' } }, { id: 'asc' }],
      }),
    );
  });

  it('controller forwards parsed query params to service', async () => {
    const spy = jest
      .spyOn(service, 'listAdminWalletTransactions')
      .mockResolvedValue({
        items: [],
        summary: {
          totalRevenue: 0,
          totalUsersWithBalance: 0,
          totalTransactions: 0,
        },
        page: 2,
        pageSize: 10,
        total: 0,
        totalPages: 1,
      });

    await controller.listTransactions('2', '10', 'amountIn', 'desc', 'alice');

    expect(spy).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      sortBy: 'amountIn',
      sortOrder: 'desc',
      search: 'alice',
    });
  });
});
