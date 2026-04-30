import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Role, User } from '@prisma/client';
import { Profile, Strategy } from 'passport-google-oauth20';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly prisma: PrismaService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? 'dev-google-client-id',
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ?? 'dev-google-client-secret',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        'http://localhost:3000/auth/google/callback',
      scope: ['profile', 'email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<User> {
    const provider = 'google';
    const providerId = profile.id;
    const email = profile.emails?.[0]?.value?.toLowerCase();
    const nickname =
      profile.displayName ||
      profile.username ||
      profile.name?.givenName ||
      'google-user';
    const avatar = this.normalizeGoogleAvatar(profile.photos?.[0]?.value);

    if (!email) {
      throw new UnauthorizedException('Google account email is required');
    }

    try {
      const providerLink = await this.prisma.userProvider.findUnique({
        where: {
          provider_providerId: {
            provider,
            providerId,
          },
        },
        include: {
          user: true,
        },
      });

      if (providerLink?.user) {
        return this.applyGoogleAvatarIfMissing(providerLink.user, avatar);
      }

      const existingByEmail = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (existingByEmail) {
        await this.prisma.userProvider.create({
          data: {
            userId: existingByEmail.id,
            provider,
            providerId,
          },
        });

        return this.applyGoogleAvatarIfMissing(existingByEmail, avatar);
      }

      const created = await this.prisma.$transaction(async (tx) => {
        const maxUser = await tx.user.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true },
        });
        const nextUserId = (maxUser?.id ?? 0) + 1;

        const user = await tx.user.create({
          data: {
            id: nextUserId,
            email,
            password: '',
            nickname,
            avatar,
            role: Role.USER,
          },
        });

        await tx.userProvider.create({
          data: {
            userId: user.id,
            provider,
            providerId,
          },
        });

        await tx.wallet.create({
          data: {
            userId: user.id,
            depositedBalance: '0',
            earnedBalance: '0',
            totalDeposited: '0',
          },
        });

        return user;
      });

      return created;
    } catch (error) {
      this.logger.error('Google account linking failed', error as Error);
      throw new UnauthorizedException('Unable to authenticate Google user');
    }
  }

  private normalizeGoogleAvatar(value: string | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length > 255) {
      return null;
    }

    return trimmed;
  }

  private async applyGoogleAvatarIfMissing(
    user: User,
    avatar: string | null,
  ): Promise<User> {
    if (!avatar || user.avatar) {
      return user;
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: { avatar },
    });
  }
}
