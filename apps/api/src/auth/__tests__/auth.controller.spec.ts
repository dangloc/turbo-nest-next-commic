import { AuthController } from '../auth.controller';
import { createSessionToken } from '../session-token';

describe('AuthController', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const localAuthService = {
    changePassword: jest.fn(),
  } as any;

  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
    localAuthService.changePassword.mockReset();
  });

  it('redirects callback with token and sets session cookie when user exists', () => {
    const controller = new AuthController(prisma);
    const req = {
      user: {
        id: 12,
        email: 'reader@example.com',
        role: 'USER',
      },
    } as any;
    const res = {
      cookie: jest.fn(),
      redirect: jest.fn(),
    } as any;

    controller.googleCallback(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'commic_session',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/login\?token=/),
    );
  });

  it('returns null user when no token is provided', async () => {
    const controller = new AuthController(prisma);
    const req = {
      header: jest.fn().mockReturnValue(undefined),
      headers: {},
    } as any;

    await expect(controller.me(req)).resolves.toEqual({ user: null });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns profile payload for authenticated profile request', async () => {
    const controller = new AuthController(prisma);
    const token = createSessionToken({ id: 21, email: 'profile@example.com', role: 'USER' }, 24 * 60 * 60 * 1000);

    prisma.user.findUnique.mockResolvedValue({
      id: 21,
      email: 'profile@example.com',
      username: 'reader21',
      nickname: 'Reader 21',
      avatar: 'https://cdn.local/avatar.png',
      role: 'USER',
      adminDashboardModules: null,
      authorDashboardModules: null,
      updatedAt: new Date('2026-04-09T11:00:00.000Z'),
    });

    await expect(
      controller.getProfile({
        header: jest.fn().mockReturnValue(`Bearer ${token}`),
        headers: {},
      } as any),
    ).resolves.toEqual({
      profile: {
        id: 21,
        email: 'profile@example.com',
        role: 'USER',
        nickname: 'Reader 21',
        avatar: 'https://cdn.local/avatar.png',
        updatedAt: new Date('2026-04-09T11:00:00.000Z'),
      },
      session: {
        tokenSource: 'bearer',
      },
    });
  });

  it('updates profile with display name and email normalization', async () => {
    const controller = new AuthController(prisma);
    const token = createSessionToken({ id: 31, email: 'writer@example.com', role: 'AUTHOR' }, 24 * 60 * 60 * 1000);

    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 31,
        email: 'writer@example.com',
        username: 'writer',
        role: 'AUTHOR',
        nickname: 'Writer',
        avatar: null,
        adminDashboardModules: null,
        authorDashboardModules: null,
        updatedAt: new Date('2026-04-09T12:00:00.000Z'),
      });

    prisma.user.update.mockResolvedValue({
      id: 31,
      email: 'writer+new@example.com',
      username: null,
      role: 'AUTHOR',
      nickname: 'Writer Prime',
      avatar: 'https://cdn.local/writer.png',
      adminDashboardModules: null,
      authorDashboardModules: null,
      updatedAt: new Date('2026-04-09T12:00:00.000Z'),
    });

    await expect(
      controller.updateProfile(
        {
          header: jest.fn().mockReturnValue(`Bearer ${token}`),
          headers: {},
        } as any,
        {
          displayName: '  Writer Prime  ',
          email: ' WRITER+NEW@EXAMPLE.COM ',
          avatar: ' https://cdn.local/writer.png ',
        },
      ),
    ).resolves.toEqual({
      profile: {
        id: 31,
        email: 'writer+new@example.com',
        role: 'AUTHOR',
        nickname: 'Writer Prime',
        avatar: 'https://cdn.local/writer.png',
        updatedAt: new Date('2026-04-09T12:00:00.000Z'),
      },
      session: {
        tokenSource: 'bearer',
      },
    });
  });

  it('rejects duplicate email updates', async () => {
    const controller = new AuthController(prisma);
    const token = createSessionToken({ id: 31, email: 'writer@example.com', role: 'AUTHOR' }, 24 * 60 * 60 * 1000);

    prisma.user.findUnique.mockResolvedValueOnce({ id: 99 });

    await expect(
      controller.updateProfile(
        {
          header: jest.fn().mockReturnValue(`Bearer ${token}`),
          headers: {},
        } as any,
        {
          email: 'dup@example.com',
        },
      ),
    ).rejects.toThrow('email is already in use');
  });

  it('changes password for authenticated user', async () => {
    const controller = new AuthController(prisma, localAuthService);
    const token = createSessionToken({ id: 44, email: 'reader@example.com', role: 'USER' }, 24 * 60 * 60 * 1000);

    await expect(
      controller.changePassword(
        {
          header: jest.fn().mockReturnValue(`Bearer ${token}`),
          headers: {},
        } as any,
        {
          currentPassword: 'oldpass123',
          newPassword: 'newpass123',
        },
      ),
    ).resolves.toEqual({ success: true });

    expect(localAuthService.changePassword).toHaveBeenCalledWith(
      44,
      'oldpass123',
      'newpass123',
    );
  });

  it('clears session cookie on logout', () => {
    const controller = new AuthController(prisma);
    const res = {
      clearCookie: jest.fn(),
    } as any;

    const result = controller.logout(res);

    expect(res.clearCookie).toHaveBeenCalledWith('commic_session', {
      path: '/',
    });
    expect(result).toEqual({ success: true });
  });
});
