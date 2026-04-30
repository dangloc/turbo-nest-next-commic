import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { AuthorApplicationsController } from './author-applications.controller';
import { AuthorApplicationsService } from './author-applications.service';
import { AuthController } from './auth.controller';
import { AuthEmailService } from './auth-email.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { LocalAuthService } from './local-auth.service';
import { RolesGuard } from './guards/roles.guard';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'google' })],
  controllers: [AuthController, AuthorApplicationsController],
  providers: [
    PrismaService,
    GoogleStrategy,
    RolesGuard,
    AuthorApplicationsService,
    AuthEmailService,
    LocalAuthService,
    AuthRateLimitService,
  ],
  exports: [RolesGuard, AuthRateLimitService],
})
export class AuthModule {}
