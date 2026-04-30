import { BadRequestException } from '@nestjs/common';
import { AdSettingsService } from '../ad-settings.service';

describe('AdSettingsService', () => {
  it('updates numeric runtime settings and parses native banner code', async () => {
    const updated = {
      id: 1,
      smartlinkUrl: 'https://ads.example/smartlink',
      chapterGateAffiliateUrl: 'https://shopee.vn/affiliate-link',
      nativeBannerCode:
        '<script src="https://ads.example/banner.js"></script><div id="native-slot"></div>',
      nativeBannerScriptSrc: 'https://ads.example/banner.js',
      nativeBannerContainerId: 'native-slot',
      adsEnabled: true,
      rewardAdsEnabled: true,
      nativeBannerEnabled: true,
      chapterGateEnabled: true,
      rewardAdPoints: 900,
      rewardAdDailyLimit: 5,
      rewardAdViewSeconds: 45,
      chapterGateEveryChapters: 4,
      chapterGateWaitSeconds: 12,
      adminRoleDashboardModules: [
        'overview',
        'users',
        'author',
        'novels',
        'terms',
        'wallets',
        'settings',
      ],
      authorRoleDashboardModules: ['author', 'novels', 'terms', 'earnings'],
      createdAt: new Date('2026-04-30T10:00:00.000Z'),
      updatedAt: new Date('2026-04-30T10:05:00.000Z'),
    };
    const prisma = {
      adSettings: {
        upsert: jest.fn().mockResolvedValue(updated),
        findUnique: jest.fn(),
      },
    };
    const service = new AdSettingsService(prisma as any);

    await expect(
      service.updateSettings({
        smartlinkUrl: 'https://ads.example/smartlink',
        chapterGateAffiliateUrl: 'https://shopee.vn/affiliate-link',
        nativeBannerCode: updated.nativeBannerCode,
        adsEnabled: true,
        rewardAdPoints: '900',
        rewardAdDailyLimit: 5,
        rewardAdViewSeconds: '45',
        chapterGateEveryChapters: 4,
        chapterGateWaitSeconds: '12',
      }),
    ).resolves.toEqual(updated);

    expect(prisma.adSettings.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: expect.objectContaining({
        chapterGateAffiliateUrl: 'https://shopee.vn/affiliate-link',
        rewardAdPoints: 900,
        rewardAdDailyLimit: 5,
        rewardAdViewSeconds: 45,
        chapterGateEveryChapters: 4,
        chapterGateWaitSeconds: 12,
        nativeBannerScriptSrc: 'https://ads.example/banner.js',
        nativeBannerContainerId: 'native-slot',
      }),
      update: expect.objectContaining({
        chapterGateAffiliateUrl: 'https://shopee.vn/affiliate-link',
        rewardAdPoints: 900,
        rewardAdDailyLimit: 5,
        rewardAdViewSeconds: 45,
        chapterGateEveryChapters: 4,
        chapterGateWaitSeconds: 12,
        nativeBannerScriptSrc: 'https://ads.example/banner.js',
        nativeBannerContainerId: 'native-slot',
      }),
    });
  });

  it('masks public fields when features are disabled', async () => {
    const prisma = {
      adSettings: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          smartlinkUrl: 'https://ads.example/smartlink',
          chapterGateAffiliateUrl: 'https://shopee.vn/affiliate-link',
          nativeBannerCode: '<script></script><div id="slot"></div>',
          nativeBannerScriptSrc: 'https://ads.example/banner.js',
          nativeBannerContainerId: 'slot',
          adsEnabled: false,
          rewardAdsEnabled: false,
          nativeBannerEnabled: false,
          chapterGateEnabled: false,
          rewardAdPoints: 500,
          rewardAdDailyLimit: 3,
          rewardAdViewSeconds: 30,
          chapterGateEveryChapters: 3,
          chapterGateWaitSeconds: 8,
          createdAt: new Date('2026-04-30T10:00:00.000Z'),
          updatedAt: new Date('2026-04-30T10:00:00.000Z'),
        }),
        upsert: jest.fn(),
      },
    };
    const service = new AdSettingsService(prisma as any);

    await expect(service.getPublicSettings()).resolves.toEqual({
      smartlinkUrl: null,
      chapterGateAffiliateUrl: null,
      nativeBannerScriptSrc: null,
      nativeBannerContainerId: null,
      adsEnabled: false,
      rewardAdsEnabled: false,
      nativeBannerEnabled: false,
      chapterGateEnabled: false,
      rewardAdPoints: 500,
      rewardAdDailyLimit: 3,
      rewardAdViewSeconds: 30,
      chapterGateEveryChapters: 3,
      chapterGateWaitSeconds: 8,
    });
  });

  it('rejects invalid numeric settings', async () => {
    const prisma = {
      adSettings: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    const service = new AdSettingsService(prisma as any);

    await expect(
      service.updateSettings({
        rewardAdDailyLimit: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns chapter gate affiliate url only when chapter gate is enabled', async () => {
    const prisma = {
      adSettings: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          smartlinkUrl: 'https://ads.example/smartlink',
          chapterGateAffiliateUrl: 'https://shopee.vn/affiliate-link',
          nativeBannerCode: null,
          nativeBannerScriptSrc: null,
          nativeBannerContainerId: null,
          adsEnabled: true,
          rewardAdsEnabled: false,
          nativeBannerEnabled: false,
          chapterGateEnabled: true,
          rewardAdPoints: 500,
          rewardAdDailyLimit: 3,
          rewardAdViewSeconds: 30,
          chapterGateEveryChapters: 3,
          chapterGateWaitSeconds: 8,
          createdAt: new Date('2026-04-30T10:00:00.000Z'),
          updatedAt: new Date('2026-04-30T10:00:00.000Z'),
        }),
        upsert: jest.fn(),
      },
    };
    const service = new AdSettingsService(prisma as any);

    await expect(service.getPublicSettings()).resolves.toEqual({
      smartlinkUrl: 'https://ads.example/smartlink',
      chapterGateAffiliateUrl: 'https://shopee.vn/affiliate-link',
      nativeBannerScriptSrc: null,
      nativeBannerContainerId: null,
      adsEnabled: true,
      rewardAdsEnabled: false,
      nativeBannerEnabled: false,
      chapterGateEnabled: true,
      rewardAdPoints: 500,
      rewardAdDailyLimit: 3,
      rewardAdViewSeconds: 30,
      chapterGateEveryChapters: 3,
      chapterGateWaitSeconds: 8,
    });
  });
});
