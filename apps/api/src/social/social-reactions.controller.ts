import {
  Body,
  Controller,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentReactionType } from '@prisma/client';
import { Roles, RolesGuard } from '../auth';
import { SocialService } from './social.service';

@Controller('social')
@UseGuards(RolesGuard)
export class SocialReactionsController {
  constructor(private readonly socialService: SocialService) {}

  @Post('comments/:commentId/reactions')
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async toggleReaction(
    @Req() req: { user?: { id: number } },
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body('type', new ParseEnumPipe(CommentReactionType))
    type: CommentReactionType,
  ) {
    return this.socialService.toggleReaction(req.user?.id as number, {
      commentId,
      type,
    });
  }
}
