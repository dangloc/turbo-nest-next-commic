import { Role, type User } from '@prisma/client';
import { GoogleStrategy } from '../strategies/google.strategy';

describe('GoogleStrategy', () => {
  const baseProfile = {
    id: 'google-123',
    displayName: 'Test User',
    emails: [{ value: 'legacy@example.com' }],
  } as any;

  it('returns linked user when provider id already exists', async () => {
    const linkedUser = {
      id: 7,
      email: 'legacy@example.com',
      role: Role.USER,
    } as User;
    const prisma = {
      userProvider: {
        findUnique: jest.fn().mockResolvedValue({ user: linkedUser }),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    const strategy = new GoogleStrategy(prisma);
    const result = await strategy.validate('a', 'b', baseProfile);

    expect(result).toBe(linkedUser);
    expect(prisma.userProvider.findUnique).toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('links provider when email matches an existing user', async () => {
    const existingUser = {
      id: 9,
      email: 'legacy@example.com',
      role: Role.USER,
    } as User;
    const prisma = {
      userProvider: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(existingUser),
      },
      $transaction: jest.fn(),
    } as any;

    const strategy = new GoogleStrategy(prisma);
    const result = await strategy.validate('a', 'b', baseProfile);

    expect(result).toBe(existingUser);
    expect(prisma.userProvider.create).toHaveBeenCalledWith({
      data: {
        userId: existingUser.id,
        provider: 'google',
        providerId: 'google-123',
      },
    });
  });

  it('creates a new user and wallet when no legacy account exists', async () => {
    const createdUser = {
      id: 12,
      email: 'legacy@example.com',
      role: Role.USER,
    } as User;
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 11 }),
        create: jest.fn().mockResolvedValue(createdUser),
      },
      userProvider: {
        create: jest.fn().mockResolvedValue({}),
      },
      wallet: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const prisma = {
      userProvider: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(tx)),
    } as any;

    const strategy = new GoogleStrategy(prisma);
    const result = await strategy.validate('a', 'b', baseProfile);

    expect(result).toBe(createdUser);
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: Role.USER,
          email: 'legacy@example.com',
        }),
      }),
    );
    expect(tx.wallet.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: createdUser.id,
        depositedBalance: '0',
        earnedBalance: '0',
        totalDeposited: '0',
      }),
    });
  });
});
