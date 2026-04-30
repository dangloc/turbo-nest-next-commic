import { Controller, Get, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ReaderService } from './reader.service';

@Controller('reader')
export class ReaderDiscoveryController {
  constructor(private readonly readerService: ReaderService) {}

  @Get('novels')
  async listNovels(
    @Query('q') q?: string,
    @Query('author') author?: string,
    @Query('releaseYear') releaseYear?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy')
    sortBy?: 'viewCount' | 'updatedAt' | 'createdAt' | 'recommendationVotes',
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('status') status?: string,
  ) {
    return this.readerService.listNovels({
      q,
      author,
      releaseYear,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortDir,
      category,
      tag,
      status,
    });
  }

  @Get('authors/:id')
  async getAuthorProfile(
    @Req() req: { user?: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'viewCount' | 'updatedAt' | 'createdAt',
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.readerService.getAuthorProfile(
      id,
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy,
        sortDir,
      },
      req.user?.id,
    );
  }
}
