import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AdSettingsController } from './ad-settings.controller';
import { AdSettingsService } from './ad-settings.service';

@Module({
  controllers: [AdSettingsController],
  providers: [AdSettingsService, PrismaService],
  exports: [AdSettingsService],
})
export class AdSettingsModule {}

