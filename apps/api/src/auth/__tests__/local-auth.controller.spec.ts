import { AuthController } from '../auth.controller';
import { LocalAuthService } from '../local-auth.service';

describe('LocalAuthController', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const localAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  } as unknown as LocalAuthService;

  beforeEach(() => {
    (localAuthService.register as jest.Mock).mockReset();
    (localAuthService.login as jest.Mock).mockReset();
  });

  it('registers a new account, sets a 24 hour cookie, and returns the session payload', async () => {
    (localAuthService.register as jest.Mock).mockResolvedValue({
      user: {
        id: 41,
        email: 'reader@example.com',
        username: 'reader_one',
        nickname: 'reader_one',
        avatar: null,
        role: 'USER',
      },
    });
    const controller = new AuthController(prisma, localAuthService);
    const res = {
      cookie: jest.fn(),
    } as any;

    await expect(
      controller.register(
        {
          username: 'reader_one',
          email: 'reader@example.com',
          password: 'reader123',
        } as any,
        { header: jest.fn().mockReturnValue(undefined), ip: '127.0.0.1' } as any,
        res,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        user: {
          id: 41,
          email: 'reader@example.com',
          username: 'reader_one',
          nickname: 'reader_one',
          avatar: null,
          role: 'USER',
        },
        session: {
          tokenSource: 'cookie',
          rememberMe: false,
          maxAge: 24 * 60 * 60 * 1000,
        },
      }),
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'commic_session',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      }),
    );
    expect(localAuthService.register).toHaveBeenCalledWith({
      username: 'reader_one',
      email: 'reader@example.com',
      password: 'reader123',
    });
  });

  it('logs a user in and extends the cookie for rememberMe', async () => {
    (localAuthService.login as jest.Mock).mockResolvedValue({
      user: {
        id: 42,
        email: 'reader@example.com',
        username: 'reader_one',
        nickname: 'Reader One',
        avatar: null,
        role: 'USER',
      },
      legacyPasswordUpgraded: true,
    });
    const controller = new AuthController(prisma, localAuthService);
    const res = {
      cookie: jest.fn(),
    } as any;

    await expect(
      controller.login(
        {
          username: 'reader@example.com',
          password: 'reader123',
          rememberMe: true,
        } as any,
        { header: jest.fn().mockReturnValue(undefined), ip: '127.0.0.1' } as any,
        res,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        user: {
          id: 42,
          email: 'reader@example.com',
          username: 'reader_one',
          nickname: 'Reader One',
          avatar: null,
          role: 'USER',
        },
        session: {
          tokenSource: 'cookie',
          rememberMe: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        },
      }),
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'commic_session',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(localAuthService.login).toHaveBeenCalledWith({
      username: 'reader@example.com',
      password: 'reader123',
      rememberMe: true,
    });
  });
});
