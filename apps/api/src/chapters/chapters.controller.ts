import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

type ChapterRequest = {
  user?: {
    id: number;
    role: string;
  };
};

@Controller()
@DashboardModules('novels')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Get('novels/:novelId/chapters')
  async listByNovel(@Param('novelId', ParseIntPipe) novelId: number) {
    return this.chaptersService.listByNovel(novelId);
  }

  @Get('chapters/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chaptersService.findOne(id);
  }

  @Post('novels/:novelId/chapters')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AUTHOR')
  async create(
    @Param('novelId', ParseIntPipe) novelId: number,
    @Req() req: ChapterRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: CreateChapterDto,
  ) {
    return this.chaptersService.create(novelId, req.user, body);
  }

  @Patch('chapters/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AUTHOR')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: ChapterRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: UpdateChapterDto,
  ) {
    return this.chaptersService.update(id, req.user, body);
  }

  @Delete('novels/:novelId/chapters')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AUTHOR')
  async removeAll(
    @Param('novelId', ParseIntPipe) novelId: number,
    @Req() req: ChapterRequest,
  ) {
    return this.chaptersService.removeAllByNovel(novelId, req.user);
  }

  @Delete('chapters/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AUTHOR')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: ChapterRequest) {
    return this.chaptersService.remove(id, req.user);
  }
}
