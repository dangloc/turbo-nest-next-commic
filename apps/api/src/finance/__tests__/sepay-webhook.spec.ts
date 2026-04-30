import 'reflect-metadata';
import { validate } from 'class-validator';
import { Prisma, TransactionType } from '@prisma/client';
import { SePayWebhookDto } from '../sepay-webhook.dto';
import {
  buildSePayUsernameCandidates,
  WalletService,
} from '../wallet.service';

function buildDto(overrides: Partial<SePayWebhookDto> = {}) {
  return Object.assign(new SePayWebhookDto(), {
    gateway: 'SePay',
    transactionDate: '2026-04-01T12:00:00.000Z',
    accountNumber: '123456789',
    subAccount: '987654321',
    transferType: 'in',
    transferAmount: 50000,
    accumulated: 300000,
    code: 'SP-123',
    content: 'PAY user_name',
    referenceCode: 'REF-001',
    ...overrides,
  });
}

describe('SePay webhook DTO', () => {
  it('rejects invalid transfer type and non-positive amount', async () => {
    const dto = buildDto({ transferType: 'out' as 'in', transferAmount: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid payload', async () => {
    const dto = buildDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('SePay username heuristic', () => {
  it('builds single, adjacent, and combined candidates', () => {
    const candidates = buildSePayUsernameCandidates('Hello World user');
    expect(candidates).toEqual([
      'hello',
      'world',
      'user',
      'hello world',
      'world user',
      'helloworlduser',
    ]);
  });
});

describe('WalletService SePay handling', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    vipLevel: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  } as any;

  let service: WalletService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WalletService(prisma);
  });

  it('short-circuits when transaction code already processed', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 7, balance: 0, kimTe: 0 });
    prisma.transaction.findFirst.mockResolvedValue({ id: 99 });

    await expect(service.handleSePayWebhook(buildDto(), { raw: true })).resolves.toEqual({
      status: 'ok',
      processed: false,
      reason: 'duplicate',
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates balance, kimTe, vipLevel and inserts transaction atomically', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 7, balance: 0, kimTe: 0 });
    prisma.transaction.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValueOnce({ id: 7 });
    prisma.wallet.upsert.mockResolvedValue({
      userId: 7,
      depositedBalance: new Prisma.Decimal(0),
      totalDeposited: new Prisma.Decimal(0),
    });
    prisma.wallet.update.mockResolvedValue({
      userId: 7,
      depositedBalance: new Prisma.Decimal(50000),
      totalDeposited: new Prisma.Decimal(50000),
    });
    prisma.vipLevel.findFirst.mockResolvedValue({ id: 3 });
    prisma.transaction.create.mockResolvedValue({ id: 100 });

    await expect(service.handleSePayWebhook(buildDto(), { raw: true })).resolves.toEqual({
      status: 'ok',
      processed: true,
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.wallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        create: expect.objectContaining({
          userId: 7,
          depositedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        }),
      }),
    );
    expect(prisma.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7 },
        data: expect.objectContaining({
          depositedBalance: new Prisma.Decimal(50000),
          totalDeposited: new Prisma.Decimal(50000),
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          balance: 50000,
          kimTe: 50000,
          vipLevelId: 3,
          currentVipLevelId: 3,
        },
      }),
    );
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: TransactionType.DEPOSIT,
          gateway: 'SePay',
          accumulated: new Prisma.Decimal(50000),
        }),
      }),
    );
  });

  it('settles SePay payment IPN by customer id instead of parsing username text', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, balance: 0, kimTe: 0 });
    prisma.transaction.findFirst.mockResolvedValue(null);
    prisma.wallet.upsert.mockResolvedValue({
      userId: 1,
      depositedBalance: new Prisma.Decimal(0),
      totalDeposited: new Prisma.Decimal(0),
    });
    prisma.wallet.update.mockResolvedValue({
      userId: 1,
      depositedBalance: new Prisma.Decimal(200000),
      totalDeposited: new Prisma.Decimal(200000),
    });
    prisma.vipLevel.findFirst.mockResolvedValue({ id: 4 });
    prisma.user.update.mockResolvedValueOnce({ id: 1 });
    prisma.transaction.create.mockResolvedValue({ id: 20879 });

    const payload = {
      notification_type: 'ORDER_PAID',
      order: {
        id: 'order-uuid',
        order_id: 'PAY512669EEA7E9C4F10',
        order_status: 'CAPTURED',
        order_amount: '200000.00',
        order_invoice_number: 'TOPUP-1777248403217',
        order_description: 'Nap tien 200000',
      },
      transaction: {
        transaction_id: '69eea7eef0dc5',
        transaction_date: '2026-04-27 07:03:58',
        transaction_status: 'APPROVED',
        transaction_amount: '200000',
      },
      customer: {
        customer_id: '1',
      },
    };

    await expect(
      service.handleSePayPaymentIpn(payload, payload),
    ).resolves.toEqual({
      success: true,
      result: {
        status: 'ok',
        processed: true,
      },
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        balance: true,
        kimTe: true,
      },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          amountIn: new Prisma.Decimal(200000),
          referenceCode: 'TOPUP-1777248403217',
          sepayCode: '69eea7eef0dc5',
          content: 'Nap tien 200000',
        }),
      }),
    );
  });
});
