import { Reflector } from '@nestjs/core';
import { Prisma, TransactionType } from '@prisma/client';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FinanceService } from '../finance.service';
import { PaymentController } from '../payment.controller';

describe('Finance payment APIs', () => {
  const prisma = {
    transaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    purchasedChapter: {
      findMany: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    vipLevel: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  } as any;

  let service: FinanceService;
  let controller: PaymentController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    controller = new PaymentController(service);
  });

  it('creates payment intent with deterministic pending metadata', async () => {
    await expect(
      service.initiateTopUp(7, {
        amount: 120000,
        provider: 'VNPAY',
        reference: 'order-1001',
        returnUrl: 'https://app.local/return',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'pending',
        provider: 'VNPAY',
        reference: 'order-1001',
        amount: 120000,
      }),
    );
  });

  it('verification rejects invalid payloads with clear errors', async () => {
    await expect(
      service.verifyTopUp(7, {
        provider: 'MOMO',
        reference: 'order-1002',
        providerTransactionId: '',
        amount: -1,
        success: true,
      }),
    ).rejects.toThrow('amount must be a positive number');

    await expect(
      service.verifyTopUp(7, {
        provider: 'MOMO',
        reference: 'order-1002',
        providerTransactionId: '',
        amount: 1000,
        success: true,
      }),
    ).rejects.toThrow('providerTransactionId is required');
  });

  it('settles a successful verification once and returns already_processed for retry', async () => {
    prisma.transaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 99,
        amountIn: new Prisma.Decimal(50000),
        accumulated: new Prisma.Decimal(150000),
      });

    prisma.wallet.upsert.mockResolvedValue({
      userId: 7,
      depositedBalance: new Prisma.Decimal(100000),
      totalDeposited: new Prisma.Decimal(100000),
    });

    prisma.wallet.update.mockResolvedValue({
      userId: 7,
      depositedBalance: new Prisma.Decimal(150000),
      totalDeposited: new Prisma.Decimal(150000),
    });

    prisma.transaction.create.mockResolvedValue({ id: 99 });
    prisma.vipLevel.findMany.mockResolvedValue([
      { id: 1, vndValue: 50000 },
      { id: 2, vndValue: 120000 },
    ]);
    prisma.user.update.mockResolvedValue({ id: 7, currentVipLevelId: 2 });

    await expect(
      service.verifyTopUp(7, {
        provider: 'VNPAY',
        reference: 'order-1003',
        providerTransactionId: 'txn-9001',
        amount: 50000,
        success: true,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'success',
        transactionId: 99,
        depositedBalance: 150000,
        totalDeposited: 150000,
        appliedVipLevelId: 2,
      }),
    );

    await expect(
      service.verifyTopUp(7, {
        provider: 'VNPAY',
        reference: 'order-1003',
        providerTransactionId: 'txn-9001',
        amount: 50000,
        success: true,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'already_processed',
        transactionId: 99,
      }),
    );

    expect(prisma.transaction.create).toHaveBeenCalledTimes(1);
  });

  it('returns deterministic wallet summary defaults for users without wallet rows', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.purchasedChapter.findMany.mockResolvedValue([]);
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getWalletSummary(7)).resolves.toEqual({
      balances: {
        depositedBalance: 0,
        earnedBalance: 0,
        totalDeposited: 0,
      },
      purchaseSummary: {
        recentActions: 0,
        recentSpent: 0,
      },
      vipTier: null,
      transactions: [],
    });
  });

  it('returns wallet summary with normalized labels and descending transaction rows', async () => {
    prisma.purchasedChapter.findMany.mockResolvedValue([
      { pricePaid: new Prisma.Decimal(12000) },
      { pricePaid: new Prisma.Decimal(3000) },
    ]);

    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      balance: 0,
      kimTe: 0,
      vipLevelId: null,
      currentVipLevelId: 2,
      wallet: {
        balance: new Prisma.Decimal(135000),
        depositedBalance: new Prisma.Decimal(135000),
        earnedBalance: new Prisma.Decimal(25000),
        totalDeposited: new Prisma.Decimal(210000),
      },
      vipLevel: null,
      currentVipLevel: {
        id: 2,
        name: 'Silver',
        vndValue: 120000,
        colorCode: '#cccccc',
        iconUrl: null,
      },
    });

    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 12,
        type: TransactionType.DEPOSIT,
        amountIn: new Prisma.Decimal(50000),
        amountOut: new Prisma.Decimal(0),
        content: 'TOPUP:VNPAY:order-1005',
        transactionDate: new Date('2026-04-09T01:00:00.000Z'),
      },
      {
        id: 10,
        type: TransactionType.PURCHASE_CHAPTER,
        amountIn: new Prisma.Decimal(0),
        amountOut: new Prisma.Decimal(15000),
        content: 'PURCHASE_BUYER:12',
        transactionDate: new Date('2026-04-08T23:00:00.000Z'),
      },
    ]);

    await expect(service.getWalletSummary(7)).resolves.toEqual({
      balances: {
        depositedBalance: 135000,
        earnedBalance: 25000,
        totalDeposited: 210000,
      },
      purchaseSummary: {
        recentActions: 2,
        recentSpent: 15000,
      },
      vipTier: {
        id: 2,
        name: 'Silver',
        vndValue: 120000,
        colorCode: '#cccccc',
        iconUrl: null,
      },
      transactions: [
        {
          id: 12,
          type: TransactionType.DEPOSIT,
          label: 'Top-up settled',
          direction: 'CREDIT',
          amount: 50000,
          content: 'TOPUP:VNPAY:order-1005',
          transactionDate: new Date('2026-04-09T01:00:00.000Z'),
        },
        {
          id: 10,
          type: TransactionType.PURCHASE_CHAPTER,
          label: 'Chapter purchase',
          direction: 'DEBIT',
          amount: 15000,
          content: 'PURCHASE_BUYER:12',
          transactionDate: new Date('2026-04-08T23:00:00.000Z'),
        },
      ],
    });
  });

  it('falls back to authenticated user balance for SePay-only accounts without wallet rows', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.purchasedChapter.findMany.mockResolvedValue([]);
    prisma.user.findUnique.mockResolvedValue({
      id: 2489,
      balance: 50000,
      kimTe: 50,
      vipLevelId: 2,
      currentVipLevelId: null,
      wallet: null,
      vipLevel: {
        id: 2,
        name: 'Silver',
        vndValue: 50000,
        colorCode: null,
        iconUrl: null,
      },
      currentVipLevel: null,
    });

    await expect(service.getWalletSummary(2489)).resolves.toEqual(
      expect.objectContaining({
        balances: {
          depositedBalance: 50000,
          earnedBalance: 0,
          totalDeposited: 50000,
        },
        vipTier: expect.objectContaining({
          id: 2,
          name: 'Silver',
        }),
      }),
    );
  });

  it('exposes guarded payment metadata and blocks unauthenticated access', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, controller.initiateTopUp);
    expect(roles).toEqual(['USER', 'AUTHOR', 'ADMIN']);

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['USER', 'AUTHOR', 'ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const unauthenticatedContext = {
      getHandler: () => 'handler',
      getClass: () => 'classRef',
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };

    expect(() => guard.canActivate(unauthenticatedContext as any)).toThrow(
      'Authentication required',
    );
  });

  it('passes authenticated user id and payload through payment controller', async () => {
    const spy = jest
      .spyOn(service, 'initiateTopUp')
      .mockResolvedValue({ status: 'pending' } as any);

    await expect(
      controller.initiateTopUp(
        { user: { id: 15 } },
        { amount: 10000, provider: 'MOMO', reference: 'order-1004' },
      ),
    ).resolves.toEqual({ status: 'pending' });

    expect(spy).toHaveBeenCalledWith(15, {
      amount: 10000,
      provider: 'MOMO',
      reference: 'order-1004',
    });
  });

  it('passes authenticated user id through wallet summary controller action', async () => {
    const spy = jest.spyOn(service, 'getWalletSummary').mockResolvedValue({
      balances: {
        depositedBalance: 10,
        earnedBalance: 20,
        totalDeposited: 30,
      },
      purchaseSummary: {
        recentActions: 4,
        recentSpent: 120000,
      },
      vipTier: {
        id: 3,
        name: 'Gold',
        vndValue: 300000,
        colorCode: '#d4af37',
        iconUrl: null,
      },
      transactions: [],
    });

    await expect(
      controller.getWalletSummary({ user: { id: 11 } }),
    ).resolves.toEqual({
      balances: {
        depositedBalance: 10,
        earnedBalance: 20,
        totalDeposited: 30,
      },
      purchaseSummary: {
        recentActions: 4,
        recentSpent: 120000,
      },
      vipTier: {
        id: 3,
        name: 'Gold',
        vndValue: 300000,
        colorCode: '#d4af37',
        iconUrl: null,
      },
      transactions: [],
    });

    expect(spy).toHaveBeenCalledWith(11);
  });
});
