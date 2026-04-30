import { Module } from '@nestjs/common';
import { AdSettingsModule } from '../ad-settings/ad-settings.module';
import { PrismaService } from '../prisma.service';
import { RewardAdsController } from './reward-ads.controller';
import { RewardAdsService } from './reward-ads.service';

@Module({
  imports: [AdSettingsModule],
  controllers: [RewardAdsController],
  providers: [RewardAdsService, PrismaService],
})
export class RewardAdsModule {}
