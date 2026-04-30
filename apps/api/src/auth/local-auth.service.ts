import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, type Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import * as wordpressHashNode from 'wordpress-hash-node';
import { PrismaService } from '../prisma.service';
import { AuthEmailService } from './auth-email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_SALT_ROUNDS = 10;
const WORDPRESS_PORTABLE_HASH_PATTERN = /^\$(P|H)\$/i;
const WORDPRESS_BCRYPT_HASH_PATTERN = /^\$wp/;
const PHP_BCRYPT_HASH_PATTERN = /^\$2y\$/;
const WORDPRESS_MD5_HASH_PATTERN = /^[a-f0-9]{32}$/i;
const WORDPRESS_SHA384_HMAC_KEY = 'wp-sha384';
const WORDPRESS_MAX_PASSWORD_LENGTH = 4096;

const wordpressHasher = wordpressHashNode as unknown as {
  CheckPassword(password: string, hash: string): boolean;
};

export interface AuthSessionUser {
  id: number;
  email: string;
  username: string | null;
  nickname: string | null;
  avatar: string | null;
  role: Role;
  adminDashboardModules: Prisma.JsonValue | null;
  authorDashboardModules: Prisma.JsonValue | null;
}

export interface LocalAuthResult {
  user: AuthSessionUser;
}

export interface LocalLoginResult extends LocalAuthResult {
  legacyPasswordUpgraded: boolean;
}

@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async register(input: RegisterDto): Promise<LocalAuthResult> {
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();

    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại');
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const maxUser = await tx.user.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });

      const nextUserId = (maxUser?.id ?? 0) + 1;

      const createdUser = await tx.user.create({
        data: {
          id: nextUserId,
          username,
          email,
          password: passwordHash,
          nickname: username,
          role: Role.USER,
        },
      });

      await tx.wallet.create({
        data: {
          userId: createdUser.id,
          depositedBalance: '0',
          earnedBalance: '0',
          totalDeposited: '0',
        },
      });

      return createdUser;
    });

    try {
      await this.authEmailService.sendWelcomeEmail({
        id: user.id,
        email: user.email,
        username,
      });
    } catch (error) {
      this.logger.warn(
        `Welcome email failed for user ID: ${user.id}`,
        error as Error,
      );
    }

    return {
      user: this.toSessionUser(user),
    };
  }

  async login(input: LoginDto): Promise<LocalLoginResult> {
    const identifier = input.username.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordMatches = await this.verifyPassword(
      input.password,
      user.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const legacyPasswordUpgraded = this.shouldUpgradePasswordHash(user.password)
      ? await this.upgradeLegacyPassword(
          user.id,
          this.normalizeWordPressPassword(input.password),
        )
      : false;

    return {
      user: this.toSessionUser(user),
      legacyPasswordUpgraded,
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user?.password) {
      throw new UnauthorizedException('Invalid current password');
    }

    const currentMatches = await this.verifyPassword(
      currentPassword,
      user.password,
    );
    if (!currentMatches) {
      throw new UnauthorizedException('Invalid current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
      },
    });
  }

  private async verifyPassword(password: string, passwordHash: string) {
    try {
      const wordpressPassword = this.normalizeWordPressPassword(password);

      if (this.isWordPressMd5Hash(passwordHash)) {
        return this.verifyWordPressMd5Password(wordpressPassword, passwordHash);
      }

      if (wordpressPassword.length > WORDPRESS_MAX_PASSWORD_LENGTH) {
        return false;
      }

      if (this.isWordPressBcryptHash(passwordHash)) {
        return this.verifyWordPressBcryptPassword(
          wordpressPassword,
          passwordHash,
        );
      }

      if (this.isPortableWordPressHash(passwordHash)) {
        return wordpressHasher.CheckPassword(wordpressPassword, passwordHash);
      }

      if (this.isPhpBcryptHash(passwordHash)) {
        return bcrypt.compare(
          wordpressPassword,
          this.normalizeBcryptHash(passwordHash),
        );
      }

      return await bcrypt.compare(
        password,
        this.normalizeBcryptHash(passwordHash),
      );
    } catch {
      return false;
    }
  }

  private async upgradeLegacyPassword(userId: number, password: string) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
      },
    });

    this.logger.log(
      `Upgraded legacy WordPress password for user ID: ${userId}`,
    );
    return true;
  }

  private async verifyWordPressBcryptPassword(
    wordpressPassword: string,
    passwordHash: string,
  ) {
    const passwordToVerify = createHmac('sha384', WORDPRESS_SHA384_HMAC_KEY)
      .update(wordpressPassword, 'utf8')
      .digest('base64');
    const bcryptHash = this.normalizeBcryptHash(passwordHash.slice(3));

    return bcrypt.compare(passwordToVerify, bcryptHash);
  }

  private verifyWordPressMd5Password(
    wordpressPassword: string,
    passwordHash: string,
  ) {
    const candidate = createHash('md5').update(wordpressPassword).digest('hex');
    const candidateBuffer = Buffer.from(candidate, 'utf8');
    const storedBuffer = Buffer.from(passwordHash.toLowerCase(), 'utf8');

    return (
      candidateBuffer.length === storedBuffer.length &&
      timingSafeEqual(candidateBuffer, storedBuffer)
    );
  }

  private normalizeBcryptHash(value: string) {
    return PHP_BCRYPT_HASH_PATTERN.test(value)
      ? value.replace(PHP_BCRYPT_HASH_PATTERN, '$2b$')
      : value;
  }

  private isWordPressBcryptHash(value: string) {
    return WORDPRESS_BCRYPT_HASH_PATTERN.test(value);
  }

  private isPortableWordPressHash(value: string) {
    return WORDPRESS_PORTABLE_HASH_PATTERN.test(value);
  }

  private isWordPressMd5Hash(value: string) {
    return WORDPRESS_MD5_HASH_PATTERN.test(value);
  }

  private isPhpBcryptHash(value: string) {
    return PHP_BCRYPT_HASH_PATTERN.test(value);
  }

  private normalizeWordPressPassword(value: string) {
    return value.trim();
  }

  private shouldUpgradePasswordHash(value: string) {
    return (
      this.isWordPressBcryptHash(value) ||
      this.isPortableWordPressHash(value) ||
      this.isWordPressMd5Hash(value) ||
      this.isPhpBcryptHash(value)
    );
  }

  private toSessionUser(
    user: Pick<
      User,
      | 'id'
      | 'email'
      | 'username'
      | 'nickname'
      | 'avatar'
      | 'role'
      | 'adminDashboardModules'
      | 'authorDashboardModules'
    >,
  ): AuthSessionUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      adminDashboardModules: user.adminDashboardModules,
      authorDashboardModules: user.authorDashboardModules,
    };
  }
}
