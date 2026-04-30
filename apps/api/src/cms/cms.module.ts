import { Module } from '@nestjs/common';
import { CmsImportController } from './cms-import.controller';
import { CmsImportService } from './cms-import.service';
import { ParserService } from './parser.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CmsImportController],
  providers: [CmsImportService, ParserService, PrismaService],
})
export class CmsModule {}
