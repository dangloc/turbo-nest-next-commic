import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdSettingsModule } from './ad-settings/ad-settings.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { AuthModule } from './auth/auth.module';
import { ChaptersController } from './chapters/chapters.controller';
import { ChaptersService } from './chapters/chapters.service';
import { CmsModule } from './cms/cms.module';
import { FinanceModule } from './finance/finance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NovelsController } from './novels/novels.controller';
import { NovelsService } from './novels/novels.service';
import { PrismaService } from './prisma.service';
import { ReaderModule } from './reader/reader.module';
import { RewardAdsModule } from './reward-ads/reward-ads.module';
import { SocialModule } from './social/social.module';
import { TermsController } from './terms/terms.controller';
import { UploadController } from './upload/upload.controller';
import { UsersController } from './users/users.controller';

@Module({
  imports: [
    AuthModule,
    AdSettingsModule,
    CmsModule,
    ReaderModule,
    RewardAdsModule,
    SocialModule,
    FinanceModule,
    NotificationsModule,
  ],
  controllers: [
    AppController,
    NovelsController,
    ChaptersController,
    TermsController,
    UploadController,
    UsersController,
  ],
  providers: [AppService, PrismaService, NovelsService, ChaptersService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
