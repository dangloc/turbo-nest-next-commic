import { AuthorApprovalStatus, Prisma, WithdrawalStatus } from '@prisma/client';
import { FinanceService } from '../finance.service';
import { WithdrawalAuthorController } from '../withdrawal-author.controller';

describe('Finance author withdrawal APIs', () => {
  const prisma = {
    authorProfile: {
      findUnique: jest.fn(),
    },
    wallet: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    withdrawalRequest: {
      create: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  } as any;

  let service: FinanceService;
  let controller: WithdrawalAuthorController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma);
    controller = new WithdrawalAuthorController(service);
    prisma.authorProfile.findUnique.mockResolvedValue({
      id: 31,
      userId: 25,
      approvalStatus: AuthorApprovalStatus.APPROVED,
    });
  });

  it('creates pending withdrawal request and freezes earned balance', async () => {
    prisma.wallet.upsert.mockResolvedValue({
      userId: 25,
      earnedBalance: new Prisma.Decimal(200000),
      depositedBalance: new Prisma.Decimal(0),
      totalDeposited: new Prisma.Decimal(0),
    });
    prisma.wallet.update.mockResolvedValue({
      userId: 25,
      earnedBalance: new Prisma.Decimal(150000),
    });
    prisma.withdrawalRequest.create.mockResolvedValue({
      id: 61,
      amount: new Prisma.Decimal(50000),
      status: WithdrawalStatus.PENDING,
      authorProfileId: 31,
      requestedAt: new Date('2026-04-08T12:00:00.000Z'),
    });
    prisma.transaction.create.mockResolvedValue({ id: 91 });

    await expect(
      service.createWithdrawalRequest(25, 50000, 'weekly payout'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 61,
        status: WithdrawalStatus.PENDING,
        amount: 50000,
        earnedBalance: 150000,
      }),
    );

    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 25,
          amountOut: new Prisma.Decimal(50000),
          content: 'WITHDRAWAL_FREEZE:61',
        }),
      }),
    );
  });

  it('rejects request above earned balance without updates', async () => {
    prisma.wallet.upsert.mockResolvedValue({
      userId: 25,
      earnedBalance: new Prisma.Decimal(10000),
      depositedBalance: new Prisma.Decimal(0),
      totalDeposited: new Prisma.Decimal(0),
    });

    await expect(service.createWithdrawalRequest(25, 50000)).rejects.toThrow(
      'Insufficient earned balance',
    );

    expect(prisma.wallet.update).not.toHaveBeenCalled();
    expect(prisma.withdrawalRequest.create).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('controller forwards authenticated user and body', async () => {
    const spy = jest
      .spyOn(service, 'createWithdrawalRequest')
      .mockResolvedValue({ id: 12 } as any);

    await expect(
      controller.createRequest(
        { user: { id: 25 } },
        { amount: 10000, note: 'n' },
      ),
    ).resolves.toEqual({ id: 12 });

    expect(spy).toHaveBeenCalledWith(25, 10000, 'n');
  });

  it('rejects unapproved author profile', async () => {
    prisma.authorProfile.findUnique.mockResolvedValue({
      id: 31,
      userId: 25,
      approvalStatus: AuthorApprovalStatus.PENDING,
    });

    await expect(service.createWithdrawalRequest(25, 10000)).rejects.toThrow(
      'Author profile is not approved',
    );
  });
});
