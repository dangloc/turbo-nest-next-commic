import { Reflector } from '@nestjs/core';
import { Prisma, WithdrawalStatus } from '@prisma/client';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FinanceService } from '../finance.service';
import { WithdrawalAdminController } from '../withdrawal-admin.controller';

describe('Finance admin withdrawal APIs', () => {
  const prisma = {
    withdrawalRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
    ),
  } as any;

  let service: FinanceService;
  let controller: WithdrawalAdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    controller = new WithdrawalAdminController(service);
  });

  it('lists withdrawals with filters and pagination payload', async () => {
    prisma.withdrawalRequest.findMany.mockResolvedValue([
      {
        id: 11,
        amount: new Prisma.Decimal(40000),
        status: WithdrawalStatus.PENDING,
        note: null,
        requestedAt: new Date('2026-04-08T11:00:00.000Z'),
        processedAt: null,
        authorProfile: {
          id: 31,
          penName: 'writer-a',
          user: { id: 25, email: 'author@example.com', nickname: 'author' },
        },
      },
    ]);
    prisma.withdrawalRequest.count.mockResolvedValue(1);

    await expect(
      service.listWithdrawalRequests({
        status: 'PENDING',
        authorProfileId: 31,
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        total: 1,
        page: 1,
        pageSize: 20,
        items: [
          expect.objectContaining({
            id: 11,
            amount: 40000,
            status: WithdrawalStatus.PENDING,
            authorProfile: expect.objectContaining({ id: 31, userId: 25 }),
          }),
        ],
      }),
    );
  });

  it('approves pending request once without balance refund', async () => {
    prisma.withdrawalRequest.findUnique.mockResolvedValue({
      id: 11,
      amount: new Prisma.Decimal(40000),
      status: WithdrawalStatus.PENDING,
      note: null,
      authorProfile: { userId: 25 },
    });
    prisma.withdrawalRequest.update.mockResolvedValue({
      id: 11,
      amount: new Prisma.Decimal(40000),
      status: WithdrawalStatus.APPROVED,
      processedAt: new Date('2026-04-08T13:00:00.000Z'),
      authorProfileId: 31,
    });
    prisma.transaction.create.mockResolvedValue({ id: 91 });

    await expect(
      service.resolveWithdrawalRequest(1, 11, 'approve', 'approved'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 11,
        status: WithdrawalStatus.APPROVED,
      }),
    );

    expect(prisma.wallet.update).not.toHaveBeenCalled();
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'WITHDRAWAL_APPROVE:11:admin:1',
        }),
      }),
    );
  });

  it('rejects pending request and refunds frozen balance', async () => {
    prisma.withdrawalRequest.findUnique.mockResolvedValue({
      id: 12,
      amount: new Prisma.Decimal(30000),
      status: WithdrawalStatus.PENDING,
      note: null,
      authorProfile: { userId: 26 },
    });
    prisma.withdrawalRequest.update.mockResolvedValue({
      id: 12,
      amount: new Prisma.Decimal(30000),
      status: WithdrawalStatus.REJECTED,
      processedAt: new Date('2026-04-08T13:05:00.000Z'),
      authorProfileId: 32,
    });
    prisma.wallet.upsert.mockResolvedValue({
      userId: 26,
      earnedBalance: new Prisma.Decimal(10000),
      depositedBalance: new Prisma.Decimal(0),
      totalDeposited: new Prisma.Decimal(0),
    });
    prisma.wallet.update.mockResolvedValue({
      userId: 26,
      earnedBalance: new Prisma.Decimal(40000),
    });
    prisma.transaction.create
      .mockResolvedValueOnce({ id: 100 })
      .mockResolvedValueOnce({ id: 101 });

    await expect(
      service.resolveWithdrawalRequest(1, 12, 'reject', 'bad docs'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 12,
        status: WithdrawalStatus.REJECTED,
      }),
    );

    expect(prisma.wallet.update).toHaveBeenCalled();
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'WITHDRAWAL_REJECT_REFUND:12:admin:1',
        }),
      }),
    );
  });

  it('blocks repeated resolution on non-pending requests', async () => {
    prisma.withdrawalRequest.findUnique.mockResolvedValue({
      id: 13,
      amount: new Prisma.Decimal(30000),
      status: WithdrawalStatus.APPROVED,
      note: null,
      authorProfile: { userId: 26 },
    });

    await expect(
      service.resolveWithdrawalRequest(1, 13, 'reject'),
    ).rejects.toThrow('Withdrawal request is already resolved');
  });

  it('exposes admin guard metadata and rejects unauthenticated access', async () => {
    const roles = Reflect.getMetadata(ROLES_KEY, controller.list);
    expect(roles).toEqual(['ADMIN']);

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const unauthenticatedContext = {
      getHandler: () => 'handler',
      getClass: () => 'classRef',
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };

    await expect(
      guard.canActivate(unauthenticatedContext as any),
    ).rejects.toThrow('Authentication required');
  });
});
