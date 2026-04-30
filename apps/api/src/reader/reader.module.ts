import { Module } from '@nestjs/common';
import { AdSettingsModule } from '../ad-settings/ad-settings.module';
import { PrismaService } from '../prisma.service';
import { ReaderService } from './reader.service';
import { ReaderDiscoveryController } from './reader-discovery.controller';
import { ReaderChapterController } from './reader-chapter.controller';
import { ReaderPersonalController } from './reader-personal.controller';

@Module({
  imports: [AdSettingsModule],
  controllers: [
    ReaderDiscoveryController,
    ReaderChapterController,
    ReaderPersonalController,
  ],
  providers: [ReaderService, PrismaService],
})
export class ReaderModule {}
