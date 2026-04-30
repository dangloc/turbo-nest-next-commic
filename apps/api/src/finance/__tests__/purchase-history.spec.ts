import { Prisma } from '@prisma/client';
import { FinanceService } from '../finance.service';
import { PurchaseController } from '../purchase.controller';

describe('Finance purchase history API', () => {
  const prisma = {
    purchasedChapter: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    novel: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  let service: FinanceService;
  let controller: PurchaseController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    controller = new PurchaseController(service);

    prisma.$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) =>
      Promise.all(ops),
    );
  });

  it('returns paginated purchase history with chapter, author, and unlock metadata', async () => {
    prisma.purchasedChapter.findMany.mockResolvedValue([
      {
        id: 801,
        chapterId: 120,
        novelId: 55,
        purchasedAt: new Date('2026-04-12T10:00:00.000Z'),
        pricePaid: new Prisma.Decimal(15000),
        chapter: {
          title: 'Chapter 12',
        },
        novel: {
          title: 'Commic Novel',
          uploader: {
            id: 9,
            nickname: 'Author Nine',
            email: 'a9@example.com',
          },
        },
      },
    ]);
    prisma.purchasedChapter.count.mockResolvedValue(101);

    await expect(
      service.listPurchaseHistory(7, { page: 2, pageSize: 20 }),
    ).resolves.toEqual({
      items: [
        {
          purchasedChapterId: 801,
          chapterId: 120,
          chapterTitle: 'Chapter 12',
          novelId: 55,
          novelTitle: 'Commic Novel',
          authorId: 9,
          authorDisplayName: 'Author Nine',
          purchasedAt: new Date('2026-04-12T10:00:00.000Z'),
          pricePaid: 15000,
          unlockStatus: 'UNLOCKED',
        },
      ],
      page: 2,
      pageSize: 20,
      total: 101,
      totalPages: 6,
    });
  });

  it('applies default pagination and marks unavailable rows when chapter relation is missing', async () => {
    prisma.purchasedChapter.findMany.mockResolvedValue([
      {
        id: 900,
        chapterId: 45,
        novelId: 12,
        purchasedAt: new Date('2026-04-11T09:00:00.000Z'),
        pricePaid: new Prisma.Decimal(8000),
        chapter: null,
        novel: {
          title: 'Archived Novel',
          uploader: {
            id: 4,
            nickname: null,
            email: 'author4@example.com',
          },
        },
      },
    ]);
    prisma.purchasedChapter.count.mockResolvedValue(1);

    await expect(service.listPurchaseHistory(8, {})).resolves.toEqual({
      items: [
        {
          purchasedChapterId: 900,
          chapterId: 45,
          chapterTitle: 'Chapter #45',
          novelId: 12,
          novelTitle: 'Archived Novel',
          authorId: 4,
          authorDisplayName: 'author4@example.com',
          purchasedAt: new Date('2026-04-11T09:00:00.000Z'),
          pricePaid: 8000,
          unlockStatus: 'UNAVAILABLE',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('purchase history controller passes authenticated user id and pagination through', async () => {
    const spy = jest.spyOn(service, 'listPurchaseHistory').mockResolvedValue({
      items: [],
      page: 3,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    await expect(
      controller.listPurchaseHistory({ user: { id: 14 } }, '3', '10'),
    ).resolves.toEqual({
      items: [],
      page: 3,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    expect(spy).toHaveBeenCalledWith(14, { page: 3, pageSize: 10 });
  });
});

describe('Finance combo purchase history API', () => {
  const prisma = {
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    novel: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  let service: FinanceService;
  let controller: PurchaseController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    controller = new PurchaseController(service);

    prisma.$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) =>
      Promise.all(ops),
    );
  });

  it('returns paginated combo purchase history from COMBO_PURCHASE transactions', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 501,
        amountOut: new Prisma.Decimal(45000),
        content: 'COMBO_PURCHASE:55:chapters:3',
        transactionDate: new Date('2026-04-10T08:00:00.000Z'),
      },
    ]);
    prisma.transaction.count.mockResolvedValue(1);
    prisma.novel.findMany.mockResolvedValue([
      {
        id: 55,
        title: 'Commic Novel',
      },
    ]);

    await expect(
      service.listComboPurchaseHistory(7, { page: 1, pageSize: 20 }),
    ).resolves.toEqual({
      items: [
        {
          transactionId: 501,
          novelId: 55,
          novelTitle: 'Commic Novel',
          purchasedChapterCount: 3,
          chargedAmount: 45000,
          purchasedAt: new Date('2026-04-10T08:00:00.000Z'),
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns novelTitle as fallback when novel not found in lookup', async () => {
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 502,
        amountOut: new Prisma.Decimal(20000),
        content: 'COMBO_PURCHASE:99:chapters:2',
        transactionDate: new Date('2026-04-09T07:00:00.000Z'),
      },
    ]);
    prisma.transaction.count.mockResolvedValue(1);
    prisma.novel.findMany.mockResolvedValue([]);

    const result = await service.listComboPurchaseHistory(8, {});
    expect(result.items[0].novelTitle).toBe('Novel #99');
  });

  it('applies default pagination when query params are omitted', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);
    prisma.novel.findMany.mockResolvedValue([]);

    const result = await service.listComboPurchaseHistory(9, {});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('only queries COMBO_PURCHASE transaction type rows for the requesting user', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);
    prisma.novel.findMany.mockResolvedValue([]);

    await service.listComboPurchaseHistory(10, { page: 1, pageSize: 10 });

    const findManyCall = prisma.transaction.findMany.mock.calls[0][0];
    expect(findManyCall.where.userId).toBe(10);
    expect(findManyCall.where.type).toBe('COMBO_PURCHASE');
  });

  it('combo history controller passes authenticated user id and pagination through', async () => {
    const spy = jest
      .spyOn(service, 'listComboPurchaseHistory')
      .mockResolvedValue({
        items: [],
        page: 2,
        pageSize: 10,
        total: 0,
        totalPages: 1,
      });

    await expect(
      controller.listComboPurchaseHistory({ user: { id: 22 } }, '2', '10'),
    ).resolves.toEqual({
      items: [],
      page: 2,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    expect(spy).toHaveBeenCalledWith(22, { page: 2, pageSize: 10 });
  });
});
