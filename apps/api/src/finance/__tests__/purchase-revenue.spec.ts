import { Prisma } from '@prisma/client';
import { FinanceService } from '../finance.service';

describe('Finance purchase revenue split', () => {
  const prisma = {
    chapter: {
      findUnique: jest.fn(),
    },
    purchasedChapter: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  } as any;

  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    prisma.chapter.findUnique.mockResolvedValue({
      id: 12,
      novelId: 3,
      novel: { uploaderId: 25 },
    });
    prisma.purchasedChapter.findUnique.mockResolvedValue(null);
  });

  it('applies 95/5 split and writes buyer/author/platform ledger rows', async () => {
    prisma.wallet.upsert
      .mockResolvedValueOnce({
        userId: 7,
        depositedBalance: new Prisma.Decimal(50000),
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(100000),
      })
      .mockResolvedValueOnce({
        userId: 25,
        depositedBalance: new Prisma.Decimal(0),
        earnedBalance: new Prisma.Decimal(2000),
        totalDeposited: new Prisma.Decimal(0),
      })
      .mockResolvedValueOnce({
        userId: 1,
        depositedBalance: new Prisma.Decimal(0),
        earnedBalance: new Prisma.Decimal(1000),
        totalDeposited: new Prisma.Decimal(0),
      });

    prisma.wallet.update
      .mockResolvedValueOnce({
        userId: 7,
        depositedBalance: new Prisma.Decimal(35000),
        earnedBalance: new Prisma.Decimal(0),
      })
      .mockResolvedValueOnce({
        userId: 25,
        depositedBalance: new Prisma.Decimal(0),
        earnedBalance: new Prisma.Decimal(16250),
      })
      .mockResolvedValueOnce({
        userId: 1,
        depositedBalance: new Prisma.Decimal(0),
        earnedBalance: new Prisma.Decimal(1750),
      });

    prisma.purchasedChapter.create.mockResolvedValue({ id: 700 });
    prisma.transaction.create
      .mockResolvedValueOnce({ id: 800 })
      .mockResolvedValueOnce({ id: 801 })
      .mockResolvedValueOnce({ id: 802 });

    await expect(
      service.purchaseChapter(7, { chapterId: 12, novelId: 3, price: 15000 }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'purchased',
        chapterId: 12,
        transactionId: 800,
        depositedBalance: 35000,
        revenueSplit: {
          authorUserId: 25,
          authorShare: 14250,
          platformFee: 750,
        },
      }),
    );

    expect(prisma.transaction.create).toHaveBeenCalledTimes(3);
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 7,
          amountOut: new Prisma.Decimal(15000),
          content: 'PURCHASE_BUYER:12',
        }),
      }),
    );
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 25,
          amountIn: new Prisma.Decimal(14250),
          content: 'PURCHASE_AUTHOR_REVENUE:12:buyer:7',
        }),
      }),
    );
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          amountIn: new Prisma.Decimal(750),
          content: 'PURCHASE_PLATFORM_FEE:12:buyer:7',
        }),
      }),
    );
  });

  it('duplicate purchase skips all revenue updates', async () => {
    prisma.purchasedChapter.findUnique.mockResolvedValue({
      id: 88,
      userId: 7,
      chapterId: 12,
    });

    await expect(
      service.purchaseChapter(7, { chapterId: 12, novelId: 3, price: 15000 }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'already_owned',
        purchasedChapterId: 88,
      }),
    );

    expect(prisma.wallet.upsert).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('insufficient funds rejects without writing split ledgers', async () => {
    prisma.wallet.upsert.mockResolvedValueOnce({
      userId: 7,
      depositedBalance: new Prisma.Decimal(10000),
      earnedBalance: new Prisma.Decimal(0),
      totalDeposited: new Prisma.Decimal(100000),
    });

    await expect(
      service.purchaseChapter(7, { chapterId: 12, novelId: 3, price: 15000 }),
    ).rejects.toThrow('Insufficient deposited balance');

    expect(prisma.wallet.update).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });
});
