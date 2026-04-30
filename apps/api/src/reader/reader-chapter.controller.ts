import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ReaderService } from './reader.service';

@Controller('reader')
export class ReaderChapterController {
  constructor(private readonly readerService: ReaderService) {}

  @Get('chapters/:id/context')
  async getChapterContext(
    @Param('id', ParseIntPipe) id: number,
    @Query('novelId') novelId?: string,
  ) {
    return this.readerService.getChapterContext(
      id,
      novelId ? Number(novelId) : undefined,
    );
  }

  @Get('chapters/:id')
  async readChapter(
    @Param('id', ParseIntPipe) id: number,
    @Query('novelId') novelId?: string,
  ) {
    return this.readerService.readChapter(
      id,
      novelId ? Number(novelId) : undefined,
    );
  }
}
