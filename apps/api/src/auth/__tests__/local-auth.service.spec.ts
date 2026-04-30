import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, createHmac } from 'node:crypto';
import * as wordpressHashNode from 'wordpress-hash-node';
import { AuthEmailService } from '../auth-email.service';
import { LocalAuthService } from '../local-auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('wordpress-hash-node', () => ({
  CheckPassword: jest.fn(),
}));

describe('LocalAuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const authEmailService = {
    sendWelcomeEmail: jest.fn(),
  } as unknown as AuthEmailService;

  beforeEach(() => {
    (bcrypt.hash as jest.Mock).mockReset();
    (bcrypt.compare as jest.Mock).mockReset();
    (wordpressHashNode.CheckPassword as jest.Mock).mockReset();
    prisma.user.findUnique.mockReset();
    prisma.user.findFirst.mockReset();
    prisma.user.create.mockReset();
    prisma.user.update.mockReset();
    prisma.wallet.create.mockReset();
    prisma.$transaction.mockReset();
    (authEmailService.sendWelcomeEmail as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers a new user with bcrypt password and sends a welcome email', async () => {
    const service = new LocalAuthService(prisma, authEmailService);
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('bcrypt-hash');
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        user: {
          findFirst: jest.fn().mockResolvedValue({ id: 9 }),
          create: jest.fn().mockResolvedValue({
            id: 10,
            username: 'reader_one',
            email: 'reader@example.com',
            password: 'bcrypt-hash',
            nickname: 'reader_one',
            avatar: null,
            role: Role.USER,
          }),
        },
        wallet: {
          create: jest.fn().mockResolvedValue({}),
        },
      }),
    );

    await expect(
      service.register({
        username: 'reader_one',
        email: 'reader@example.com',
        password: 'reader123',
      } as any),
    ).resolves.toEqual({
      user: {
        id: 10,
        email: 'reader@example.com',
        username: 'reader_one',
        nickname: 'reader_one',
        avatar: null,
        role: Role.USER,
      },
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('reader123', 10);
    expect(authEmailService.sendWelcomeEmail).toHaveBeenCalledWith({
      id: 10,
      email: 'reader@example.com',
      username: 'reader_one',
    });
  });

  it('logs in with bcrypt passwords', async () => {
    const service = new LocalAuthService(prisma, authEmailService);
    prisma.user.findFirst.mockResolvedValue({
      id: 21,
      email: 'reader@example.com',
      username: 'reader_one',
      password: '$2b$10$bcryptHashValue',
      nickname: 'Reader One',
      avatar: null,
      role: Role.USER,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({
        username: 'reader@example.com',
        password: 'reader123',
      } as any),
    ).resolves.toEqual({
      legacyPasswordUpgraded: false,
      user: {
        id: 21,
        email: 'reader@example.com',
        username: 'reader_one',
        nickname: 'Reader One',
        avatar: null,
        role: Role.USER,
      },
    });
  });

  it('upgrades legacy WordPress passwords after a successful login', async () => {
    const service = new LocalAuthService(prisma, authEmailService);
    prisma.user.findFirst.mockResolvedValue({
      id: 31,
      email: 'legacy@example.com',
      username: 'legacy_reader',
      password: '$P$legacyWordPressHash',
      nickname: 'Legacy Reader',
      avatar: null,
      role: Role.USER,
    });
    (wordpressHashNode.CheckPassword as jest.Mock).mockReturnValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('upgraded-bcrypt-hash');
    prisma.user.update.mockResolvedValue({
      id: 31,
      email: 'legacy@example.com',
      username: 'legacy_reader',
      password: 'upgraded-bcrypt-hash',
      nickname: 'Legacy Reader',
      avatar: null,
      role: Role.USER,
    });

    await expect(
      service.login({
        username: 'legacy@example.com',
        password: 'reader123',
      } as any),
    ).resolves.toEqual({
      legacyPasswordUpgraded: true,
      user: {
        id: 31,
        email: 'legacy@example.com',
        username: 'legacy_reader',
        nickname: 'Legacy Reader',
        avatar: null,
        role: Role.USER,
      },
    });
  });

  it('logs in with WordPress $wp bcrypt passwords and upgrades them', async () => {
    const service = new LocalAuthService(prisma, authEmailService);
    prisma.user.findFirst.mockResolvedValue({
      id: 41,
      email: 'wpbcrypt@example.com',
      username: 'wpbcrypt_reader',
      password: '$wp$2y$10$wordpressHashValue',
      nickname: 'WP Bcrypt Reader',
      avatar: null,
      role: Role.USER,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('upgraded-bcrypt-hash');
    prisma.user.update.mockResolvedValue({
      id: 41,
      email: 'wpbcrypt@example.com',
      username: 'wpbcrypt_reader',
      password: 'upgraded-bcrypt-hash',
      nickname: 'WP Bcrypt Reader',
      avatar: null,
      role: Role.USER,
    });

    await expect(
      service.login({
        username: 'wpbcrypt@example.com',
        password: '  reader123  ',
      } as any),
    ).resolves.toEqual({
      legacyPasswordUpgraded: true,
      user: {
        id: 41,
        email: 'wpbcrypt@example.com',
        username: 'wpbcrypt_reader',
        nickname: 'WP Bcrypt Reader',
        avatar: null,
        role: Role.USER,
      },
    });

    const expectedPrehash = createHmac('sha384', 'wp-sha384')
      .update('reader123', 'utf8')
      .digest('base64');

    expect(bcrypt.compare).toHaveBeenCalledWith(
      expectedPrehash,
      '$2b$10$wordpressHashValue',
    );
    expect(bcrypt.hash).toHaveBeenCalledWith('reader123', 10);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: { password: 'upgraded-bcrypt-hash' },
    });
  });

  it('normalizes PHP $2y$ bcrypt hashes before verifying and upgrading', async () => {
    const service = new LocalAuthService(prisma, authEmailService);
    prisma.user.findFirst.mockResolvedValue({
      id: 42,
      email: 'phpbcrypt@example.com',
      username: 'phpbcrypt_reader',
      password: '$2y$10$phpBcryptHashValue',
      nickname: 'PHP Bcrypt Reader',
      avatar: null,
      role: Role.USER,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('upgraded-bcrypt-hash');
    prisma.user.update.mockResolvedValue({
      id: 42,
      email: 'phpbcrypt@example.com',
      username: 'phpbcrypt_reader',
      password: 'upgraded-bcrypt-hash',
      nickname: 'PHP Bcrypt Reader',
      avatar: null,
      role: Role.USER,
    });

    await expect(
      service.login({
        username: 'phpbcrypt@example.com',
        password: '  reader123  ',
      } as any),
    ).resolves.toMatchObject({
      legacyPasswordUpgraded: true,
      user: {
        id: 42,
        email: 'phpbcrypt@example.com',
      },
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'reader123',
      '$2b$10$phpBcryptHashValue',
    );
    expect(bcrypt.hash).toHaveBeenCalledWith('reader123', 10);
  });

  it('supports legacy WordPress MD5 passwords and upgrades them', async () => {
    const service = new LocalAuthService(prisma, authEmailService);
    const md5Password = createHash('md5').update('reader123').digest('hex');

    prisma.user.findFirst.mockResolvedValue({
      id: 43,
      email: 'md5@example.com',
      username: 'md5_reader',
      password: md5Password,
      nickname: 'MD5 Reader',
      avatar: null,
      role: Role.USER,
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('upgraded-bcrypt-hash');
    prisma.user.update.mockResolvedValue({
      id: 43,
      email: 'md5@example.com',
      username: 'md5_reader',
      password: 'upgraded-bcrypt-hash',
      nickname: 'MD5 Reader',
      avatar: null,
      role: Role.USER,
    });

    await expect(
      service.login({
        username: 'md5@example.com',
        password: '  reader123  ',
      } as any),
    ).resolves.toMatchObject({
      legacyPasswordUpgraded: true,
      user: {
        id: 43,
        email: 'md5@example.com',
      },
    });

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith('reader123', 10);
  });

  it('changes password when current password is valid', async () => {
    const service = new LocalAuthService(prisma, authEmailService);
    prisma.user.findUnique.mockResolvedValue({
      id: 21,
      password: '$2b$10$currentHash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-bcrypt-hash');

    await expect(
      service.changePassword(21, 'current123', 'newpass123'),
    ).resolves.toBeUndefined();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: { password: 'new-bcrypt-hash' },
    });
  });

  it('rejects password change with invalid current password', async () => {
    const service = new LocalAuthService(prisma, authEmailService);
    prisma.user.findUnique.mockResolvedValue({
      id: 21,
      password: '$2b$10$currentHash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword(21, 'wrong-password', 'newpass123'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
