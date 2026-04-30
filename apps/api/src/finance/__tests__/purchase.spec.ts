import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { FinanceService } from '../finance.service';
import { PurchaseController } from '../purchase.controller';

describe('Finance purchase APIs', () => {
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
  let controller: PurchaseController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    controller = new PurchaseController(service);
    prisma.chapter.findUnique.mockResolvedValue({
      id: 12,
      novelId: 3,
      novel: { uploaderId: 25 },
    });
    prisma.purchasedChapter.findUnique.mockResolvedValue(null);
  });

  it('purchases chapter once with wallet deduction and ledger write', async () => {
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
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(0),
      })
      .mockResolvedValueOnce({
        userId: 1,
        depositedBalance: new Prisma.Decimal(0),
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(0),
      });

    prisma.wallet.update
      .mockResolvedValueOnce({
        userId: 7,
        depositedBalance: new Prisma.Decimal(35000),
      })
      .mockResolvedValueOnce({
        userId: 25,
        earnedBalance: new Prisma.Decimal(14250),
      })
      .mockResolvedValueOnce({
        userId: 1,
        earnedBalance: new Prisma.Decimal(750),
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
      }),
    );

    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 7,
          amountIn: new Prisma.Decimal(0),
          amountOut: new Prisma.Decimal(15000),
        }),
      }),
    );
  });

  it('returns already_owned for duplicate purchase without charging again', async () => {
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

    expect(prisma.wallet.update).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('fails purchase when deposited balance is insufficient', async () => {
    prisma.wallet.upsert.mockResolvedValue({
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

  it('handles concurrent duplicate attempts through unique constraint race fallback', async () => {
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
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(0),
      })
      .mockResolvedValueOnce({
        userId: 1,
        depositedBalance: new Prisma.Decimal(0),
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(0),
      });

    prisma.wallet.update
      .mockResolvedValueOnce({
        userId: 7,
        depositedBalance: new Prisma.Decimal(35000),
      })
      .mockResolvedValueOnce({
        userId: 25,
        earnedBalance: new Prisma.Decimal(14250),
      })
      .mockResolvedValueOnce({
        userId: 1,
        earnedBalance: new Prisma.Decimal(750),
      });

    const duplicateError = new PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.purchasedChapter.create.mockRejectedValue(duplicateError);

    await expect(
      service.purchaseChapter(7, { chapterId: 12, novelId: 3, price: 15000 }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'already_owned',
      }),
    );
  });

  it('passes purchase history pagination through purchase controller', async () => {
    const spy = jest.spyOn(service, 'listPurchaseHistory').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });

    await expect(
      controller.listPurchaseHistory({ user: { id: 9 } }, '1', '20'),
    ).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });

    expect(spy).toHaveBeenCalledWith(9, { page: 1, pageSize: 20 });
  });

  it('passes chapter id and quoted price through purchase controller', async () => {
    jest.spyOn(service, 'resolveChapterPurchaseQuote').mockResolvedValue({
      id: 12,
      chapterNumber: 2,
      title: 'Chapter 2',
      isLocked: true,
      effectivePrice: 15000,
      priceSource: 'novel_default',
    } as any);

    const spy = jest
      .spyOn(service, 'purchaseChapter')
      .mockResolvedValue({ status: 'purchased' } as any);

    await expect(
      controller.purchaseChapter({ user: { id: 9 } }, 12, {
        novelId: 3,
      }),
    ).resolves.toEqual({ status: 'purchased' });

    expect(service.resolveChapterPurchaseQuote).toHaveBeenCalledWith(3, 12, 9);
    expect(spy).toHaveBeenCalledWith(9, {
      chapterId: 12,
      novelId: 3,
      price: 15000,
    });
  });

  it('returns free chapter for vip_permanent users without charging', async () => {
    jest.spyOn(service, 'resolveChapterPurchaseQuote').mockResolvedValue({
      id: 12,
      chapterNumber: 2,
      title: 'Chapter 2',
      isLocked: false,
      effectivePrice: 0,
      priceSource: 'vip_subscription',
    } as any);

    const purchaseSpy = jest.spyOn(service, 'purchaseChapter');

    await expect(
      controller.purchaseChapter({ user: { id: 11 } }, 12, {
        novelId: 3,
      }),
    ).resolves.toEqual({
      status: 'free_chapter',
      chapterId: 12,
      novelId: 3,
      purchasedChapterId: null,
      effectivePrice: 0,
    });

    expect(service.resolveChapterPurchaseQuote).toHaveBeenCalledWith(3, 12, 11);
    expect(purchaseSpy).not.toHaveBeenCalled();
  });
});
