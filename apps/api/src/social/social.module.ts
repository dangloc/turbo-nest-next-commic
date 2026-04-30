import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SocialCommentsController } from './social-comments.controller';
import { SocialReactionsController } from './social-reactions.controller';
import { SocialService } from './social.service';

@Module({
  controllers: [SocialCommentsController, SocialReactionsController],
  providers: [SocialService, PrismaService],
})
export class SocialModule {}
