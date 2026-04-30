import { AuthorApprovalStatus, Role } from '@prisma/client';
import { AuthorApplicationsService } from '../author-applications.service';

describe('AuthorApplicationsService', () => {
  const prisma = {
    authorProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  } as any;

  let service: AuthorApplicationsService;

  const baseInput = {
    penName: 'Tac Gia A',
    bio: 'Gioi thieu',
    facebookUrl: 'facebook.com/tgia',
    telegramUrl: 'https://t.me/tgia',
    otherPlatformName: 'Wattpad',
    otherPlatformUrl: 'wattpad.com/tgia',
    bankAccountName: 'Tac Gia A',
    bankAccountNumber: '123456789',
    bankName: 'VCB',
    bankBranch: 'HCM',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthorApplicationsService(prisma);
  });

  it('creates a new pending author application for the current user', async () => {
    prisma.authorProfile.findUnique.mockResolvedValue(null);
    prisma.authorProfile.create.mockResolvedValue({
      id: 11,
      userId: 25,
      penName: 'Tac Gia A',
      bio: 'Gioi thieu',
      facebookUrl: 'https://facebook.com/tgia',
      telegramUrl: 'https://t.me/tgia',
      otherPlatformName: 'Wattpad',
      otherPlatformUrl: 'https://wattpad.com/tgia',
      bankAccountName: 'Tac Gia A',
      bankAccountNumber: '123456789',
      bankName: 'VCB',
      bankBranch: 'HCM',
      approvalStatus: AuthorApprovalStatus.PENDING,
      approvedAt: null,
      rejectedReason: null,
      createdAt: new Date('2026-04-30T12:00:00.000Z'),
      updatedAt: new Date('2026-04-30T12:00:00.000Z'),
      user: {
        id: 25,
        email: 'author@example.com',
        username: 'author',
        nickname: 'Author',
        avatar: null,
        role: Role.USER,
      },
    });

    await expect(service.submitOwnApplication(25, baseInput)).resolves.toEqual(
      expect.objectContaining({
        application: expect.objectContaining({
          userId: 25,
          approvalStatus: AuthorApprovalStatus.PENDING,
          facebookUrl: 'https://facebook.com/tgia',
        }),
      }),
    );

    expect(prisma.authorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 25,
          approvalStatus: AuthorApprovalStatus.PENDING,
          facebookUrl: 'https://facebook.com/tgia',
          otherPlatformUrl: 'https://wattpad.com/tgia',
        }),
      }),
    );
  });

  it('resubmits a rejected application back to pending', async () => {
    prisma.authorProfile.findUnique.mockResolvedValue({
      id: 11,
      approvalStatus: AuthorApprovalStatus.REJECTED,
    });
    prisma.authorProfile.update.mockResolvedValue({
      id: 11,
      userId: 25,
      penName: 'Tac Gia A',
      bio: null,
      facebookUrl: 'https://facebook.com/tgia',
      telegramUrl: null,
      otherPlatformName: null,
      otherPlatformUrl: null,
      bankAccountName: 'Tac Gia A',
      bankAccountNumber: '123456789',
      bankName: 'VCB',
      bankBranch: null,
      approvalStatus: AuthorApprovalStatus.PENDING,
      approvedAt: null,
      rejectedReason: null,
      createdAt: new Date('2026-04-29T12:00:00.000Z'),
      updatedAt: new Date('2026-04-30T12:00:00.000Z'),
      user: {
        id: 25,
        email: 'author@example.com',
        username: 'author',
        nickname: 'Author',
        avatar: null,
        role: Role.USER,
      },
    });

    await service.submitOwnApplication(25, {
      ...baseInput,
      telegramUrl: undefined,
      otherPlatformName: undefined,
      otherPlatformUrl: undefined,
      bio: undefined,
      bankBranch: undefined,
    });

    expect(prisma.authorProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvalStatus: AuthorApprovalStatus.PENDING,
          approvedAt: null,
          rejectedReason: null,
        }),
      }),
    );
  });

  it('approves a pending application and upgrades the user role to AUTHOR', async () => {
    prisma.authorProfile.findUnique.mockResolvedValue({
      id: 11,
      userId: 25,
      penName: 'Tac Gia A',
      bio: null,
      facebookUrl: 'https://facebook.com/tgia',
      telegramUrl: null,
      otherPlatformName: null,
      otherPlatformUrl: null,
      bankAccountName: 'Tac Gia A',
      bankAccountNumber: '123456789',
      bankName: 'VCB',
      bankBranch: null,
      approvalStatus: AuthorApprovalStatus.PENDING,
      approvedAt: null,
      rejectedReason: null,
      createdAt: new Date('2026-04-29T12:00:00.000Z'),
      updatedAt: new Date('2026-04-30T12:00:00.000Z'),
      user: {
        id: 25,
        email: 'author@example.com',
        username: 'author',
        nickname: 'Author',
        avatar: null,
        role: Role.USER,
      },
    });
    prisma.user.update.mockResolvedValue({ id: 25, role: Role.AUTHOR });
    prisma.authorProfile.update.mockResolvedValue({
      id: 11,
      userId: 25,
      penName: 'Tac Gia A',
      bio: null,
      facebookUrl: 'https://facebook.com/tgia',
      telegramUrl: null,
      otherPlatformName: null,
      otherPlatformUrl: null,
      bankAccountName: 'Tac Gia A',
      bankAccountNumber: '123456789',
      bankName: 'VCB',
      bankBranch: null,
      approvalStatus: AuthorApprovalStatus.APPROVED,
      approvedAt: new Date('2026-04-30T13:00:00.000Z'),
      rejectedReason: null,
      createdAt: new Date('2026-04-29T12:00:00.000Z'),
      updatedAt: new Date('2026-04-30T13:00:00.000Z'),
      user: {
        id: 25,
        email: 'author@example.com',
        username: 'author',
        nickname: 'Author',
        avatar: null,
        role: Role.AUTHOR,
      },
    });

    await expect(service.approveApplication(1, 25)).resolves.toEqual(
      expect.objectContaining({
        application: expect.objectContaining({
          userId: 25,
          role: Role.AUTHOR,
          approvalStatus: AuthorApprovalStatus.APPROVED,
        }),
      }),
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 25 },
      data: { role: Role.AUTHOR },
    });
  });
});
