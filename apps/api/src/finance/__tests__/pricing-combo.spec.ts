import { Prisma } from '@prisma/client';
import { FinanceService } from '../finance.service';

describe('Finance pricing and combo calculations', () => {
  const prisma = {
    novel: {
      findUnique: jest.fn(),
    },
    purchasedChapter: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    pointTransaction: {
      aggregate: jest.fn(),
    },
    vipSubscription: {
      findUnique: jest.fn(),
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
    prisma.purchasedChapter.findMany.mockResolvedValue([]);
    prisma.purchasedChapter.createMany.mockResolvedValue({ count: 0 });
    prisma.wallet.findUnique.mockResolvedValue(null);
    prisma.pointTransaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    prisma.vipSubscription.findUnique.mockResolvedValue(null);
    prisma.transaction.create
      .mockResolvedValueOnce({ id: 901 })
      .mockResolvedValueOnce({ id: 902 })
      .mockResolvedValueOnce({ id: 903 });
  });

  it('computes free threshold and per-chapter override pricing', async () => {
    prisma.novel.findUnique.mockResolvedValue({
      id: 99,
      uploaderId: 42,
      defaultChapterPrice: new Prisma.Decimal(10000),
      freeChapterCount: 2,
      comboDiscountPct: 10,
      chapters: [
        { id: 1, title: 'Chapter 1', priceOverride: null },
        { id: 2, title: 'Chapter 2', priceOverride: null },
        {
          id: 3,
          title: 'Chapter 3',
          priceOverride: new Prisma.Decimal(25000),
        },
      ],
    });

    const pricing = await service.getNovelPricing(99);

    expect(pricing.settings).toEqual({
      defaultChapterPrice: 10000,
      freeChapterCount: 2,
      comboDiscountPct: 10,
    });

    expect(pricing.chapters).toEqual([
      expect.objectContaining({
        id: 1,
        chapterNumber: 1,
        isLocked: false,
        effectivePrice: 0,
      }),
      expect.objectContaining({
        id: 2,
        chapterNumber: 2,
        isLocked: false,
        effectivePrice: 0,
      }),
      expect.objectContaining({
        id: 3,
        chapterNumber: 3,
        isLocked: true,
        effectivePrice: 25000,
        priceSource: 'chapter_override',
      }),
    ]);

    expect(pricing.combo).toEqual({
      lockedChapterCount: 1,
      originalTotalPrice: 25000,
      discountedTotalPrice: 22500,
    });
  });

  it('clamps combo discount percent to [0, 100]', async () => {
    prisma.novel.findUnique
      .mockResolvedValueOnce({
        id: 1,
        uploaderId: 2,
        defaultChapterPrice: new Prisma.Decimal(12000),
        freeChapterCount: 0,
        comboDiscountPct: 150,
        chapters: [{ id: 11, title: 'A', priceOverride: null }],
      })
      .mockResolvedValueOnce({
        id: 2,
        uploaderId: 3,
        defaultChapterPrice: new Prisma.Decimal(12000),
        freeChapterCount: 0,
        comboDiscountPct: -25,
        chapters: [{ id: 12, title: 'B', priceOverride: null }],
      });

    const high = await service.getNovelPricing(1);
    const low = await service.getNovelPricing(2);

    expect(high.settings.comboDiscountPct).toBe(100);
    expect(high.combo).toEqual({
      lockedChapterCount: 1,
      originalTotalPrice: 12000,
      discountedTotalPrice: 0,
    });

    expect(low.settings.comboDiscountPct).toBe(0);
    expect(low.combo).toEqual({
      lockedChapterCount: 1,
      originalTotalPrice: 12000,
      discountedTotalPrice: 12000,
    });
  });

  it('treats vip_2_months as full access while the subscription is active', async () => {
    prisma.novel.findUnique.mockResolvedValue({
      id: 15,
      uploaderId: 42,
      defaultChapterPrice: new Prisma.Decimal(10000),
      freeChapterCount: 0,
      comboDiscountPct: 30,
      chapters: [
        { id: 301, title: 'A', priceOverride: null },
        { id: 302, title: 'B', priceOverride: new Prisma.Decimal(5000) },
      ],
    });

    prisma.vipSubscription.findUnique.mockResolvedValue({
      packageType: 'vip_2_months',
      isActive: true,
      expiresAt: new Date('2099-12-31T00:00:00.000Z'),
    });

    const pricing = await service.getNovelPricing(15, 9);

    expect(pricing.chapters).toEqual([
      expect.objectContaining({
        id: 301,
        isLocked: false,
        effectivePrice: 0,
        priceSource: 'vip_subscription',
      }),
      expect.objectContaining({
        id: 302,
        isLocked: false,
        effectivePrice: 0,
        priceSource: 'vip_subscription',
      }),
    ]);

    expect(pricing.combo).toEqual({
      lockedChapterCount: 0,
      originalTotalPrice: 0,
      discountedTotalPrice: 0,
    });
  });

  it('includes current deposited balance and reward-point balance for authenticated pricing requests', async () => {
    prisma.novel.findUnique.mockResolvedValue({
      id: 19,
      uploaderId: 45,
      defaultChapterPrice: new Prisma.Decimal(15000),
      freeChapterCount: 1,
      comboDiscountPct: 20,
      chapters: [
        { id: 501, title: 'Chapter 1', priceOverride: null },
        { id: 502, title: 'Chapter 2', priceOverride: null },
      ],
    });
    prisma.wallet.findUnique.mockResolvedValue({
      depositedBalance: new Prisma.Decimal(12000),
    });
    prisma.pointTransaction.aggregate.mockResolvedValue({
      _sum: { amount: 9000 },
    });

    const pricing = await service.getNovelPricing(19, 8);

    expect(pricing.buyer).toEqual({
      depositedBalance: 12000,
      pointBalance: 9000,
      combinedBalance: 21000,
    });
  });

  it('does not grant access for expired vip_3_months subscriptions', async () => {
    prisma.novel.findUnique.mockResolvedValue({
      id: 16,
      uploaderId: 43,
      defaultChapterPrice: new Prisma.Decimal(10000),
      freeChapterCount: 0,
      comboDiscountPct: 20,
      chapters: [{ id: 401, title: 'A', priceOverride: null }],
    });

    prisma.vipSubscription.findUnique.mockResolvedValue({
      packageType: 'vip_3_months',
      isActive: true,
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
    });

    const pricing = await service.getNovelPricing(16, 10);

    expect(pricing.chapters[0]).toEqual(
      expect.objectContaining({
        id: 401,
        isLocked: true,
        effectivePrice: 10000,
        priceSource: 'novel_default',
      }),
    );
  });

  it('charges combo discount only for remaining locked chapters not already owned', async () => {
    prisma.novel.findUnique.mockResolvedValue({
      id: 7,
      uploaderId: 25,
      defaultChapterPrice: new Prisma.Decimal(1000),
      freeChapterCount: 1,
      comboDiscountPct: 25,
      chapters: [
        { id: 101, title: '1', priceOverride: null },
        { id: 102, title: '2', priceOverride: null },
        { id: 103, title: '3', priceOverride: null },
      ],
    });

    prisma.purchasedChapter.findMany.mockResolvedValue([{ chapterId: 102 }]);

    prisma.wallet.upsert
      .mockResolvedValueOnce({
        userId: 9,
        depositedBalance: new Prisma.Decimal(5000),
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(0),
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
        userId: 9,
        depositedBalance: new Prisma.Decimal(4250),
      })
      .mockResolvedValueOnce({
        userId: 25,
        earnedBalance: new Prisma.Decimal(712.5),
      })
      .mockResolvedValueOnce({
        userId: 1,
        earnedBalance: new Prisma.Decimal(37.5),
      });

    const result = await service.purchaseNovelCombo(9, { novelId: 7 });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'purchased',
        novelId: 7,
        purchasedChapterCount: 1,
        chargedAmount: 750,
        discountPct: 25,
        depositedBalance: 4250,
      }),
    );

    expect(prisma.purchasedChapter.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            userId: 9,
            novelId: 7,
            chapterId: 103,
            pricePaid: new Prisma.Decimal(750),
          }),
        ],
      }),
    );
  });

  it('handles 100 percent combo discount as zero payable without negative math', async () => {
    prisma.novel.findUnique.mockResolvedValue({
      id: 8,
      uploaderId: 30,
      defaultChapterPrice: new Prisma.Decimal(2000),
      freeChapterCount: 0,
      comboDiscountPct: 150,
      chapters: [
        { id: 201, title: 'A', priceOverride: null },
        { id: 202, title: 'B', priceOverride: null },
      ],
    });

    prisma.wallet.upsert
      .mockResolvedValueOnce({
        userId: 10,
        depositedBalance: new Prisma.Decimal(10),
        earnedBalance: new Prisma.Decimal(0),
        totalDeposited: new Prisma.Decimal(0),
      })
      .mockResolvedValueOnce({
        userId: 30,
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
        userId: 10,
        depositedBalance: new Prisma.Decimal(10),
      })
      .mockResolvedValueOnce({
        userId: 30,
        earnedBalance: new Prisma.Decimal(0),
      })
      .mockResolvedValueOnce({
        userId: 1,
        earnedBalance: new Prisma.Decimal(0),
      });

    const result = await service.purchaseNovelCombo(10, { novelId: 8 });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'purchased',
        novelId: 8,
        purchasedChapterCount: 2,
        chargedAmount: 0,
        discountPct: 100,
        depositedBalance: 10,
      }),
    );

    const payload = prisma.purchasedChapter.createMany.mock.calls[0][0];
    const paidValues = payload.data.map((row: { pricePaid: Prisma.Decimal }) =>
      row.pricePaid.toString(),
    );

    expect(paidValues).toEqual(['0', '0']);
  });
});
