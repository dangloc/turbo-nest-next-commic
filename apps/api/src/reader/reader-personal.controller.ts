import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard } from '../auth';
import { ReaderService } from './reader.service';

@Controller('reader/me')
@UseGuards(RolesGuard)
@Roles('USER', 'AUTHOR', 'ADMIN')
export class ReaderPersonalController {
  constructor(private readonly readerService: ReaderService) {}

  @Get('missions')
  async getMissionBoard(@Req() req: { user?: { id: number } }) {
    return this.readerService.getMissionBoard(req.user?.id as number);
  }

  @Get('points/transactions')
  async listPointTransactions(
    @Req() req: { user?: { id: number } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.readerService.listPointTransactions(req.user?.id as number, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('bookmarks')
  async listBookmarks(
    @Req() req: { user?: { id: number } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
  ) {
    const hasPagination =
      page !== undefined || pageSize !== undefined || limit !== undefined;

    return this.readerService.listBookmarks(
      req.user?.id as number,
      hasPagination
        ? {
            page: page ? Number(page) : undefined,
            pageSize:
              pageSize !== undefined || limit !== undefined
                ? Number(pageSize ?? limit)
                : undefined,
          }
        : undefined,
    );
  }

  @Post('bookmarks')
  async addBookmark(
    @Req() req: { user?: { id: number } },
    @Body() body: { novelId: number; chapterId?: number; note?: string },
  ) {
    return this.readerService.addBookmark(req.user?.id as number, body);
  }

  @Delete('bookmarks/:bookmarkId')
  async removeBookmark(
    @Req() req: { user?: { id: number } },
    @Param('bookmarkId', ParseIntPipe) bookmarkId: number,
  ) {
    return this.readerService.removeBookmark(
      req.user?.id as number,
      bookmarkId,
    );
  }

  @Get('novels/:novelId/recommendations')
  async getNovelRecommendationStatus(
    @Req() req: { user?: { id: number } },
    @Param('novelId', ParseIntPipe) novelId: number,
  ) {
    return this.readerService.getNovelRecommendationStatus(
      req.user?.id,
      novelId,
    );
  }

  @Post('novels/:novelId/recommendations')
  async recommendNovel(
    @Req() req: { user?: { id: number } },
    @Param('novelId', ParseIntPipe) novelId: number,
    @Body() body: { votes: number },
  ) {
    return this.readerService.recommendNovel(
      req.user?.id as number,
      novelId,
      body.votes,
    );
  }

  @Put('reading-history')
  async upsertReadingHistory(
    @Req() req: { user?: { id: number } },
    @Body()
    body: { novelId: number; chapterId?: number; progressPercent: number },
  ) {
    return this.readerService.upsertReadingHistory(req.user?.id as number, body);
  }

  @Get('reading-history')
  async listReadingHistory(
    @Req() req: { user?: { id: number } },
    @Query('novelId') novelId?: string,
  ) {
    return this.readerService.listReadingHistory(
      req.user?.id as number,
      novelId ? Number(novelId) : undefined,
    );
  }

  @Post('chapter-opens')
  async syncChapterOpen(
    @Req() req: { user?: { id: number } },
    @Body()
    body: {
      chapterId: number;
      novelId?: number;
      progressPercent?: number;
      clientUpdatedAt?: string;
    },
  ) {
    return this.readerService.syncChapterOpen(req.user?.id as number, body);
  }

  @Get('chapters/:chapterId/like')
  async getChapterLikeStatus(
    @Req() req: { user?: { id: number } },
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ) {
    return this.readerService.getChapterLikeStatus(
      req.user?.id as number,
      chapterId,
    );
  }

  @Post('chapters/:chapterId/like')
  async likeChapter(
    @Req() req: { user?: { id: number } },
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ) {
    return this.readerService.likeChapter(req.user?.id as number, chapterId);
  }

  @Post('follows/authors/:authorId')
  async followAuthor(
    @Req() req: { user?: { id: number } },
    @Param('authorId', ParseIntPipe) authorId: number,
  ) {
    return this.readerService.followAuthor(req.user?.id as number, authorId);
  }

  @Delete('follows/authors/:authorId')
  async unfollowAuthor(
    @Req() req: { user?: { id: number } },
    @Param('authorId', ParseIntPipe) authorId: number,
  ) {
    return this.readerService.unfollowAuthor(req.user?.id as number, authorId);
  }
}
