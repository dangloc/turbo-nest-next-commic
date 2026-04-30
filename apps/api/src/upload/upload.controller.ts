import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import {
  imageFilter,
  MAX_IMAGE_SIZE,
  optimizeAndSaveImage,
} from './image-optimizer';

@Controller('upload')
@UseGuards(RolesGuard)
export class UploadController {
  @Post('novel-featured')
  @Roles('ADMIN', 'AUTHOR')
  @DashboardModules('novels')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
    }),
  )
  async uploadFeatured(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('File is required');
    return optimizeAndSaveImage(file, 'featured');
  }

  @Post('novel-banner')
  @Roles('ADMIN', 'AUTHOR')
  @DashboardModules('novels')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
    }),
  )
  async uploadBanner(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('File is required');
    return optimizeAndSaveImage(file, 'banner');
  }

  @Post('avatar')
  @Roles('USER', 'AUTHOR', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFilter,
      limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('File is required');
    return optimizeAndSaveImage(file, 'avatar');
  }
}
