import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import { CreateNovelDto } from './dto/create-novel.dto';
import { ListNovelsQueryDto } from './dto/list-novels-query.dto';
import { UpdateNovelDto } from './dto/update-novel.dto';
import { NovelsService } from './novels.service';

type NovelRequest = {
  user?: {
    id: number;
    role: string;
  };
};

@Controller('novels')
@DashboardModules('novels')
export class NovelsController {
  constructor(private readonly novelsService: NovelsService) {}

  @Get()
  async findAll(
    @Req() req: NovelRequest,
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: ListNovelsQueryDto,
  ) {
    return this.novelsService.findAll(query, req.user);
  }

  @Get(':id/first-chapter')
  async findFirstChapter(@Param('id', ParseIntPipe) id: number) {
    return this.novelsService.findFirstChapter(id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.novelsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AUTHOR')
  async create(
    @Req() req: NovelRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: CreateNovelDto,
  ) {
    return this.novelsService.create(req.user, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AUTHOR')
  async update(
    @Req() req: NovelRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: UpdateNovelDto,
  ) {
    return this.novelsService.update(id, req.user, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AUTHOR')
  async remove(
    @Req() req: NovelRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.novelsService.remove(id, req.user);
  }
}
