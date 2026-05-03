import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GifAssetsController } from './gif-assets.controller';
import { GifAssetsService } from './gif-assets.service';

@Module({
  controllers: [GifAssetsController],
  providers: [GifAssetsService, PrismaService],
})
export class GifAssetsModule {}
