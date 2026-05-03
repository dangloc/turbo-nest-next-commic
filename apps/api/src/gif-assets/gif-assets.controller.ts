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
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard } from '../auth';
import {
  GifAssetsService,
  type CreateGifAssetInput,
} from './gif-assets.service';

@Controller()
export class GifAssetsController {
  constructor(private readonly gifAssetsService: GifAssetsService) {}

  @Get('gifs')
  async listPublic(
    @Query('keyword') keyword?: string,
    @Query('category') category?: string,
  ) {
    return this.gifAssetsService.listPublic({ keyword, category });
  }

  @Post('admin/gifs')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async create(@Body() body: CreateGifAssetInput) {
    return this.gifAssetsService.create(body);
  }

  @Get('admin/gifs')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async listAdmin(
    @Query('keyword') keyword?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.gifAssetsService.listAdmin({
      keyword,
      category,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Delete('admin/gifs/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.gifAssetsService.delete(id);
  }

  @Patch('admin/gifs/:id/toggle')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.gifAssetsService.toggleActive(id);
  }
}
