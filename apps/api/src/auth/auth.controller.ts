import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Optional,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PointTransactionType } from '@prisma/client';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import {
  getRoleDefaultAdminDashboardModules,
  getRoleDefaultAuthorDashboardModules,
  resolveDashboardAccess,
  type DashboardRoleDefaults,
} from './dashboard-access';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { type AuthSessionUser, LocalAuthService } from './local-auth.service';
import {
  createSessionToken,
  getCookieValue,
  type SessionTokenPayload,
  verifySessionToken,
} from './session-token';

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email: string;
    role: 'USER' | 'AUTHOR' | 'ADMIN';
  };
};

type SessionRequest = Request & {
  user?: {
    id: number;
    role: string;
  };
};

interface ProfileUpdateInput {
  email?: string;
  displayName?: string | null;
  nickname?: string | null;
  avatar?: string | null;
}

const SESSION_COOKIE = 'commic_session';
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;
const REMEMBER_ME_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const DAILY_LOGIN_REWARD_POINTS = 1000;
const REWARD_POINT_EXPIRATION_MONTHS = 1;
const VIETNAM_TIME_OFFSET_MS = 7 * 60 * 60 * 1000;

function getWebOrigin() {
  return process.env.WEB_ORIGIN ?? 'http://localhost:3000';
}

function normalizeNickname(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('nickname must be a string');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length < 2 || trimmed.length > 40) {
    throw new BadRequestException(
      'nickname must be between 2 and 40 characters',
    );
  }

  return trimmed;
}

function normalizeEmail(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('email must be a string');
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    throw new BadRequestException('email is required');
  }

  if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
    throw new BadRequestException('email must be a valid email address');
  }

  return trimmed;
}

function normalizeAvatar(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('avatar must be a string');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 255) {
    throw new BadRequestException('avatar must be 255 characters or fewer');
  }

  return trimmed;
}

function buildCookieOptions(rememberMe: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: rememberMe ? REMEMBER_ME_MAX_AGE : SESSION_MAX_AGE,
  };
}

function toPublicUser(
  user: AuthSessionUser,
  dashboardRoleDefaults?: DashboardRoleDefaults,
) {
  const access = resolveDashboardAccess(user, dashboardRoleDefaults);

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role,
    isSuperAdmin: access.isSuperAdmin,
    hasDashboardAccess: access.hasDashboardAccess,
    adminDashboardModules: access.adminDashboardModules,
    authorDashboardModules: access.authorDashboardModules,
  };
}

function getClientKey(req: Request) {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.ip || 'unknown';
}

function getVietnamDayBounds(now = new Date()) {
  const shifted = new Date(now.getTime() + VIETNAM_TIME_OFFSET_MS);
  const startShiftedUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );

  return {
    start: new Date(startShiftedUtc - VIETNAM_TIME_OFFSET_MS),
    end: new Date(
      startShiftedUtc - VIETNAM_TIME_OFFSET_MS + 24 * 60 * 60 * 1000,
    ),
  };
}

function getRewardPointActiveCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - REWARD_POINT_EXPIRATION_MONTHS);
  return cutoff;
}

function makeDailyLoginReference(userId: number, dayStart: Date) {
  return `DAILY_LOGIN:${userId}:${dayStart.toISOString().slice(0, 10)}`;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly localAuthService?: LocalAuthService,
    @Optional() private readonly authRateLimitService?: AuthRateLimitService,
  ) {}

  private getRateLimitService() {
    return this.authRateLimitService ?? new AuthRateLimitService();
  }

  private resolveSession(req: SessionRequest) {
    if (req.user?.id) {
      return {
        parsed: {
          id: req.user.id,
          email: '',
          role: req.user.role,
          iat: Date.now(),
          exp: Date.now() + SESSION_MAX_AGE,
        } as SessionTokenPayload,
        source: req.header('authorization')?.startsWith('Bearer ')
          ? 'bearer'
          : 'cookie',
      } as const;
    }

    const authHeader = req.header('authorization');
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;
    const cookieToken = getCookieValue(req.headers.cookie, SESSION_COOKIE);
    const token = bearer ?? cookieToken;

    if (!token) {
      return null;
    }

    const parsed = verifySessionToken(token);
    if (!parsed) {
      return null;
    }

    req.user = {
      id: parsed.id,
      role: parsed.role,
    };

    return {
      parsed,
      source: bearer ? 'bearer' : 'cookie',
    } as const;
  }

  private async getSessionUserById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        adminDashboardModules: true,
        authorDashboardModules: true,
        updatedAt: true,
      },
    });
  }

  private async getDashboardRoleDefaults(): Promise<DashboardRoleDefaults> {
    const settings = await this.prisma.adSettings?.findUnique({
      where: { id: 1 },
      select: {
        adminRoleDashboardModules: true,
        authorRoleDashboardModules: true,
      },
    });

    return {
      adminDashboardModules: getRoleDefaultAdminDashboardModules(
        settings?.adminRoleDashboardModules,
      ),
      authorDashboardModules: getRoleDefaultAuthorDashboardModules(
        settings?.authorRoleDashboardModules,
      ),
    };
  }

  private async buildLocalAuthResponse(
    user: AuthSessionUser,
    rememberMe = false,
  ) {
    const maxAge = rememberMe ? REMEMBER_ME_MAX_AGE : SESSION_MAX_AGE;
    const token = createSessionToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      maxAge,
    );
    const dashboardRoleDefaults = await this.getDashboardRoleDefaults();

    return {
      token,
      user: toPublicUser(user, dashboardRoleDefaults),
      session: {
        tokenSource: 'cookie' as const,
        rememberMe,
        maxAge,
      },
    };
  }

  private async awardDailyLoginMission(userId: number) {
    const pointTransaction = (
      this.prisma as unknown as {
        pointTransaction?: {
          findFirst: typeof this.prisma.pointTransaction.findFirst;
          aggregate: typeof this.prisma.pointTransaction.aggregate;
          create: typeof this.prisma.pointTransaction.create;
        };
      }
    ).pointTransaction;

    if (!pointTransaction) {
      return;
    }

    const now = new Date();
    const today = getVietnamDayBounds(now);
    const existingToday = await pointTransaction.findFirst({
      where: {
        userId,
        reason: 'DAILY_LOGIN',
        amount: { gt: 0 },
        createdAt: {
          gte: today.start,
          lt: today.end,
        },
      },
      select: { id: true },
    });

    if (existingToday) {
      return;
    }

    const activePointCutoff = getRewardPointActiveCutoff(now);
    const currentBalance = await pointTransaction.aggregate({
      where: {
        userId,
        createdAt: { gte: activePointCutoff },
      },
      _sum: { amount: true },
    });
    const currentPointBalance = Math.max(0, currentBalance._sum.amount ?? 0);

    await pointTransaction.create({
      data: {
        userId,
        amount: DAILY_LOGIN_REWARD_POINTS,
        balanceAfter: currentPointBalance + DAILY_LOGIN_REWARD_POINTS,
        type: PointTransactionType.EARN,
        reason: 'DAILY_LOGIN',
        referenceId: makeDailyLoginReference(userId, today.start),
      },
    });
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return { ok: true };
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const user = req.user;
    if (!user) {
      return res.redirect(`${getWebOrigin()}/auth/login?error=missing_user`);
    }

    const token = createSessionToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      SESSION_MAX_AGE,
    );

    res.cookie(SESSION_COOKIE, token, buildCookieOptions(false));
    void this.awardDailyLoginMission(user.id);

    return res.redirect(
      `${getWebOrigin()}/auth/login?token=${encodeURIComponent(token)}`,
    );
  }

  @Post('register')
  @HttpCode(201)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!this.localAuthService) {
      throw new Error('Local auth service is not available');
    }

    this.getRateLimitService().consume('register', getClientKey(req));

    const result = await this.localAuthService.register(body);
    await this.awardDailyLoginMission(result.user.id);
    const payload = await this.buildLocalAuthResponse(result.user);

    res.cookie(SESSION_COOKIE, payload.token, buildCookieOptions(false));

    return payload;
  }

  @Post('login')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!this.localAuthService) {
      throw new Error('Local auth service is not available');
    }

    this.getRateLimitService().consume('login', getClientKey(req));

    const result = await this.localAuthService.login(body);
    await this.awardDailyLoginMission(result.user.id);
    const payload = await this.buildLocalAuthResponse(
      result.user,
      body.rememberMe ?? false,
    );

    res.cookie(
      SESSION_COOKIE,
      payload.token,
      buildCookieOptions(body.rememberMe ?? false),
    );

    return payload;
  }

  @Get('me')
  async me(@Req() req: SessionRequest) {
    const session = this.resolveSession(req);
    if (!session) {
      return { user: null };
    }

    const user = await this.getSessionUserById(session.parsed.id);
    const dashboardRoleDefaults = await this.getDashboardRoleDefaults();
    return {
      user: user
        ? {
            id: user.id,
            email: user.email,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            role: user.role,
            ...resolveDashboardAccess(user, dashboardRoleDefaults),
          }
        : null,
    };
  }

  @Get('profile')
  async getProfile(@Req() req: SessionRequest) {
    const session = this.resolveSession(req);
    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.getSessionUserById(session.parsed.id);
    if (!user) {
      throw new UnauthorizedException('Session user not found');
    }

    return {
      profile: {
        id: user.id,
        email: user.email,
        role: user.role,
        nickname: user.nickname,
        avatar: user.avatar,
        updatedAt: user.updatedAt,
      },
      session: {
        tokenSource: session.source,
      },
    };
  }

  @Patch('profile')
  async updateProfile(@Req() req: SessionRequest, @Body() body: ProfileUpdateInput) {
    const session = this.resolveSession(req);
    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    const data: { email?: string; nickname?: string | null; avatar?: string | null } = {};

    if (body.email !== undefined) {
      const normalizedEmail = normalizeEmail(body.email);
      if (normalizedEmail) {
        const existingEmail = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (existingEmail && existingEmail.id !== session.parsed.id) {
          throw new BadRequestException('email is already in use');
        }

        data.email = normalizedEmail;
      }
    }

    if (body.displayName !== undefined) {
      data.nickname = normalizeNickname(body.displayName);
    } else if (body.nickname !== undefined) {
      data.nickname = normalizeNickname(body.nickname);
    }

    if (body.avatar !== undefined) {
      data.avatar = normalizeAvatar(body.avatar);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one profile field is required');
    }

    const updated = await this.prisma.user.update({
      where: { id: session.parsed.id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        nickname: true,
        avatar: true,
        updatedAt: true,
      },
    });

    return {
      profile: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        nickname: updated.nickname,
        avatar: updated.avatar,
        updatedAt: updated.updatedAt,
      },
      session: {
        tokenSource: session.source,
      },
    };
  }

  @Post('password')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async changePassword(@Req() req: SessionRequest, @Body() body: ChangePasswordDto) {
    const session = this.resolveSession(req);
    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!this.localAuthService) {
      throw new Error('Local auth service is not available');
    }

    await this.localAuthService.changePassword(
      session.parsed.id,
      body.currentPassword,
      body.newPassword,
    );

    return { success: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { success: true };
  }
}
