import { UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Prisma, TransactionType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth';
import { FinanceService } from '../finance.service';
import { UserWalletController } from '../user-wallet.controller';
import type {
  UserWalletTransactionsQuery,
  UserWalletTransactionsResponse,
} from '../types';

describe('User wallet transactions API', () => {
  const prisma = {
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  let service: FinanceService;
  let controller: UserWalletController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    controller = new UserWalletController(service);
  });

  function makeGuardContext(user?: { id?: number; role?: string }): any {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    };
  }

  describe('JwtAuthGuard', () => {
    it('throws UnauthorizedException when request.user is absent', () => {
      const guard = new JwtAuthGuard();

      expect(() => guard.canActivate(makeGuardContext())).toThrow(
        UnauthorizedException,
      );
    });

    it('returns true when request.user.id is a positive integer', () => {
      const guard = new JwtAuthGuard();

      expect(guard.canActivate(makeGuardContext({ id: 7 }))).toBe(true);
    });

    it('does not require ADMIN role for authenticated users', () => {
      const guard = new JwtAuthGuard();

      expect(guard.canActivate(makeGuardContext({ id: 9, role: 'USER' }))).toBe(
        true,
      );
      expect(
        guard.canActivate(makeGuardContext({ id: 10, role: 'AUTHOR' })),
      ).toBe(true);
      expect(
        guard.canActivate(makeGuardContext({ id: 11, role: 'ADMIN' })),
      ).toBe(true);
    });
  });

  describe('FinanceService.listUserWalletTransactions', () => {
    it('loads wallet summary from the authenticated user and transactions from the Transaction table', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 42,
        balance: 150000,
        kimTe: 150,
        vipLevelId: 2,
        currentVipLevelId: null,
        wallet: null,
        vipLevel: { name: 'Silver' },
        currentVipLevel: null,
      });
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await service.listUserWalletTransactions(42, {
        page: 2,
        pageSize: 10,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        select: {
          id: true,
          balance: true,
          kimTe: true,
          vipLevelId: true,
          currentVipLevelId: true,
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
              vndValue: true,
              colorCode: true,
              iconUrl: true,
            },
          },
          currentVipLevel: {
            select: {
              id: true,
              name: true,
              vndValue: true,
              colorCode: true,
              iconUrl: true,
            },
          },
        },
      });
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        skip: 10,
        take: 10,
        select: {
          id: true,
          transactionDate: true,
          amountIn: true,
          amountOut: true,
          accumulated: true,
          type: true,
          content: true,
          sepayCode: true,
          referenceCode: true,
          gateway: true,
        },
      });
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: { userId: 42 },
      });
    });

    it('defaults invalid pagination and caps pageSize at 50', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        balance: 0,
        kimTe: 0,
        vipLevelId: null,
        currentVipLevelId: null,
        wallet: null,
        vipLevel: null,
        currentVipLevel: null,
      });
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(101);

      await expect(
        service.listUserWalletTransactions(7, {
          page: -1,
          pageSize: 500,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          page: 1,
          pageSize: 50,
          total: 101,
          totalPages: 3,
        }),
      );

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 7 },
          skip: 0,
          take: 50,
        }),
      );
    });

    it('maps summary fields and signed credit/debit rows', async () => {
      const creditDate = new Date('2026-04-27T01:00:00.000Z');
      const debitDate = new Date('2026-04-27T00:00:00.000Z');
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        balance: 240000,
        kimTe: 240,
        vipLevelId: 4,
        currentVipLevelId: null,
        wallet: null,
        vipLevel: { name: 'Platinum' },
        currentVipLevel: null,
      });
      prisma.transaction.findMany.mockResolvedValue([
          {
            id: 201,
            transactionDate: creditDate,
            amountIn: new Prisma.Decimal(100000),
            amountOut: new Prisma.Decimal(0),
            accumulated: new Prisma.Decimal(240000),
            type: TransactionType.DEPOSIT,
            content: 'Top up via SePay',
            sepayCode: 'SP201',
            referenceCode: 'REF201',
            gateway: 'SePay',
          },
          {
            id: 202,
            transactionDate: debitDate,
            amountIn: new Prisma.Decimal(0),
            amountOut: new Prisma.Decimal(15000),
            accumulated: new Prisma.Decimal(225000),
            type: TransactionType.PURCHASE_CHAPTER,
            content: null,
            sepayCode: null,
            referenceCode: 'BUY202',
            gateway: 'UNKNOWN',
          },
      ]);
      prisma.transaction.count.mockResolvedValue(2);

      await expect(service.listUserWalletTransactions(7, {})).resolves.toEqual({
        summary: {
          balance: 240000,
          kimTe: 240,
          vipLevelId: 4,
          vipLevelName: 'Platinum',
        },
        items: [
          {
            transactionId: 201,
            transactionDate: creditDate,
            amountIn: 100000,
            amountOut: 0,
            amount: 100000,
            direction: 'CREDIT',
            type: TransactionType.DEPOSIT,
            status: 'COMPLETED',
            description: 'Top up via SePay',
            sepayCode: 'SP201',
            referenceCode: 'REF201',
            gateway: 'SePay',
            balanceAfter: 240000,
          },
          {
            transactionId: 202,
            transactionDate: debitDate,
            amountIn: 0,
            amountOut: 15000,
            amount: -15000,
            direction: 'DEBIT',
            type: TransactionType.PURCHASE_CHAPTER,
            status: 'COMPLETED',
            description: 'BUY202',
            sepayCode: null,
            referenceCode: 'BUY202',
            gateway: 'UNKNOWN',
            balanceAfter: 225000,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('normalizes stale user balance from the wallet row for dashboard-backed accounts', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        balance: 0,
        kimTe: 0,
        vipLevelId: null,
        currentVipLevelId: 7,
        wallet: {
          balance: new Prisma.Decimal(10063102),
          depositedBalance: new Prisma.Decimal(1828000),
          earnedBalance: new Prisma.Decimal(372000),
          totalDeposited: new Prisma.Decimal(2200000),
        },
        vipLevel: null,
        currentVipLevel: {
          id: 7,
          name: 'Tier 7',
          vndValue: 2000000,
          colorCode: null,
          iconUrl: null,
        },
      });
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await expect(service.listUserWalletTransactions(7, {})).resolves.toEqual(
        expect.objectContaining({
          summary: {
            balance: 1828000,
            kimTe: 2200000,
            vipLevelId: 7,
            vipLevelName: 'Tier 7',
          },
        }),
      );
    });

    it('throws when authenticated user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await expect(service.listUserWalletTransactions(7, {})).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('contracts', () => {
    it('supports paginated wallet transaction responses with summary and signed rows', () => {
      const query: UserWalletTransactionsQuery = {
        page: 2,
        pageSize: 10,
      };

      const response: UserWalletTransactionsResponse = {
        summary: {
          balance: 120000,
          kimTe: 120,
          vipLevelId: 3,
          vipLevelName: 'Gold',
        },
        items: [
          {
            transactionId: 101,
            transactionDate: new Date('2026-04-27T00:00:00.000Z'),
            amountIn: 50000,
            amountOut: 0,
            amount: 50000,
            direction: 'CREDIT',
            type: 'DEPOSIT',
            status: 'COMPLETED',
            description: 'TOPUP:SEPAY:ORDER-101',
            sepayCode: 'SP101',
            referenceCode: 'REF101',
            gateway: 'SePay',
            balanceAfter: 120000,
          },
        ],
        page: query.page as number,
        pageSize: query.pageSize as number,
        total: 1,
        totalPages: 1,
      };

      expect(response.items[0]).toEqual(
        expect.objectContaining({
          amount: 50000,
          direction: 'CREDIT',
          sepayCode: 'SP101',
          referenceCode: 'REF101',
        }),
      );
    });
  });

  describe('UserWalletController', () => {
    it('is protected by JwtAuthGuard metadata', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, UserWalletController);

      expect(guards).toContain(JwtAuthGuard);
    });

    it('passes req.user.id to the service and never accepts a query userId', async () => {
      const spy = jest
        .spyOn(service, 'listUserWalletTransactions')
        .mockResolvedValue({
          summary: {
            balance: 0,
            kimTe: 0,
            vipLevelId: null,
            vipLevelName: null,
          },
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 1,
        });

      await controller.listTransactions({ user: { id: 17 } }, '3', '25');

      expect(spy).toHaveBeenCalledWith(17, {
        page: 3,
        pageSize: 25,
      });
    });

    it('omits invalid caller-controlled user id query params entirely', async () => {
      const spy = jest
        .spyOn(service, 'listUserWalletTransactions')
        .mockResolvedValue({
          summary: {
            balance: 0,
            kimTe: 0,
            vipLevelId: null,
            vipLevelName: null,
          },
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 1,
        });

      await controller.listTransactions(
        { user: { id: 18 } },
        undefined,
        undefined,
      );

      expect(spy).toHaveBeenCalledWith(18, {
        page: undefined,
        pageSize: undefined,
      });
    });
  });
});
