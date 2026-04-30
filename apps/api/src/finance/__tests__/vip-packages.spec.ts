import { BadRequestException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { FinanceService } from '../finance.service';

describe('VIP package purchases', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    vipSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  } as any;

  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2026-04-27T00:00:00.000Z').getTime());
    service = new FinanceService(prisma);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns legacy package keys with corrected display durations', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      balance: 900000,
      kimTe: 900000,
      vipLevelId: null,
      currentVipLevelId: null,
      wallet: {
        balance: new Prisma.Decimal(0),
        depositedBalance: new Prisma.Decimal(900000),
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(900000),
      },
      vipLevel: null,
      currentVipLevel: null,
    });
    prisma.vipSubscription.findUnique.mockResolvedValue(null);

    await expect(service.getVipPackages(7)).resolves.toEqual(
      expect.objectContaining({
        balance: 900000,
        packages: [
          expect.objectContaining({
            packageType: 'vip_2_months',
            price: 299000,
            durationDays: 30,
            displayDays: 30,
          }),
          expect.objectContaining({
            packageType: 'vip_3_months',
            price: 599000,
            durationDays: 60,
            displayDays: 60,
          }),
          expect.objectContaining({
            packageType: 'vip_permanent',
            price: 999999,
            durationDays: null,
            displayDays: null,
            isPermanent: true,
          }),
        ],
      }),
    );
  });

  it('purchases vip_2_months as a 30 day package and records a VIP transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      balance: 900000,
      kimTe: 900000,
      vipSubscription: null,
    });
    prisma.wallet.upsert.mockResolvedValue({
      depositedBalance: new Prisma.Decimal(900000),
      totalDeposited: new Prisma.Decimal(900000),
    });
    prisma.wallet.update.mockResolvedValue({
      depositedBalance: new Prisma.Decimal(601000),
      totalDeposited: new Prisma.Decimal(900000),
    });
    prisma.user.update.mockResolvedValue({ id: 7, balance: 601000 });
    prisma.vipSubscription.upsert.mockResolvedValue({
      packageType: 'vip_2_months',
      vipLevelId: 1,
      isActive: true,
      purchaseDate: new Date('2026-04-27T00:00:00.000Z'),
      expiresAt: new Date('2026-05-27T00:00:00.000Z'),
    });
    prisma.transaction.create.mockResolvedValue({ id: 55 });

    await expect(service.purchaseVipPackage(7, 'vip_2_months')).resolves.toEqual(
      expect.objectContaining({
        status: 'purchased',
        packageType: 'vip_2_months',
        transactionId: 55,
        balance: 601000,
      }),
    );

    expect(prisma.vipSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          packageType: 'vip_2_months',
          vipLevelId: 1,
          expiresAt: new Date('2026-05-27T00:00:00.000Z'),
        }),
      }),
    );
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 7,
          amountOut: new Prisma.Decimal(299000),
          accumulated: new Prisma.Decimal(601000),
          type: TransactionType.PURCHASE_VIP,
          referenceCode: 'vip_2_months',
        }),
      }),
    );
  });

  it('rejects purchases when wallet balance is insufficient', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      balance: 100000,
      kimTe: 100000,
      vipSubscription: null,
    });
    prisma.wallet.upsert.mockResolvedValue({
      depositedBalance: new Prisma.Decimal(100000),
      totalDeposited: new Prisma.Decimal(100000),
    });

    await expect(
      service.purchaseVipPackage(7, 'vip_permanent'),
    ).rejects.toThrow(BadRequestException);
  });
});
