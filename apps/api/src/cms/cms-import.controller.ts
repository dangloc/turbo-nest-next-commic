import {
  BadRequestException,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import { CmsImportService } from './cms-import.service';

const ALLOWED_EXTENSIONS = ['.txt', '.doc', '.docx'];

export function cmsImportFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  const lowerName = file.originalname.toLowerCase();
  const allowed = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!allowed) {
    cb(new BadRequestException('Only .txt, .doc, and .docx files are supported'), false);
    return;
  }
  cb(null, true);
}

@Controller('admin/novels')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'AUTHOR')
@DashboardModules('novels')
export class CmsImportController {
  constructor(private readonly cmsImportService: CmsImportService) {}

  @Post(':novelId/import-chapters')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: cmsImportFileFilter,
      limits: { files: 1, fileSize: 10 * 1024 * 1024 },
    }),
  )
  async importChapters(
    @Param('novelId', ParseIntPipe) novelId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('File upload is required');
    return this.cmsImportService.importChapters(novelId, file);
  }
}
