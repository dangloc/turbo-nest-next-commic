import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard } from '../auth';
import { SocialService } from './social.service';
import type {
  CreateOrUpdateNovelReviewInput,
  CreateSocialCommentInput,
} from './types';

@Controller('social')
export class SocialCommentsController {
  constructor(private readonly socialService: SocialService) {}

  @Get('reviews/recent')
  async listRecentReviews(@Query('limit') limit?: string) {
    return this.socialService.listRecentReviews(
      limit ? this.parseInteger(limit, 'limit') : undefined,
    );
  }

  @Get('novels/:novelId/reviews/summary')
  async getNovelReviewSummary(
    @Param('novelId', ParseIntPipe) novelId: number,
    @Req() req: { user?: { id: number } },
  ) {
    return this.socialService.getNovelReviewSummary(novelId, req.user?.id);
  }

  @Get('novels/:novelId/reviews')
  async listNovelReviews(
    @Param('novelId', ParseIntPipe) novelId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.socialService.listNovelReviews(
      novelId,
      page ? this.parseInteger(page, 'page') : undefined,
      pageSize ? this.parseInteger(pageSize, 'pageSize') : undefined,
    );
  }

  @Post('novels/:novelId/reviews')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async upsertNovelReview(
    @Param('novelId', ParseIntPipe) novelId: number,
    @Req() req: { user?: { id: number } },
    @Body() body: CreateOrUpdateNovelReviewInput,
  ) {
    return this.socialService.upsertNovelReview(
      req.user?.id as number,
      novelId,
      body,
    );
  }

  @Get('comments')
  async listComments(
    @Query('novelId') novelId?: string,
    @Query('chapterId') chapterId?: string,
    @Req() req?: { user?: { id: number } },
  ) {
    return this.socialService.listComments(
      {
        novelId: novelId ? this.parseInteger(novelId, 'novelId') : undefined,
        chapterId: chapterId
          ? this.parseInteger(chapterId, 'chapterId')
          : undefined,
      },
      req?.user?.id,
    );
  }

  @Post('comments')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async createComment(
    @Req() req: { user?: { id: number } },
    @Body() body: CreateSocialCommentInput,
  ) {
    return this.socialService.createComment(req.user?.id as number, body);
  }

  private parseInteger(value: string, fieldName: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return parsed;
  }
}
