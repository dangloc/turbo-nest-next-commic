import { BadRequestException, Injectable } from '@nestjs/common';
import type { AdSettings, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  ADMIN_DASHBOARD_MODULES,
  AUTHOR_DASHBOARD_MODULES,
  getRoleDefaultAdminDashboardModules,
  getRoleDefaultAuthorDashboardModules,
  type AdminDashboardModule,
  type AuthorDashboardModule,
} from '../auth/dashboard-access';

export const AD_SETTINGS_ID = 1;
export const DEFAULT_REWARD_AD_POINTS = 500;
export const DEFAULT_REWARD_AD_DAILY_LIMIT = 3;
export const DEFAULT_REWARD_AD_VIEW_SECONDS = 30;
export const DEFAULT_CHAPTER_GATE_EVERY_CHAPTERS = 3;
export const DEFAULT_CHAPTER_GATE_WAIT_SECONDS = 8;
export const DEFAULT_ADMIN_ROLE_DASHBOARD_MODULES: AdminDashboardModule[] = [
  'overview',
  'users',
  'novels',
  'wallets',
];
export const DEFAULT_AUTHOR_ROLE_DASHBOARD_MODULES: AuthorDashboardModule[] = [
  'novels',
  'terms',
  'earnings',
];

export const DEFAULT_AD_SETTINGS = {
  id: AD_SETTINGS_ID,
  smartlinkUrl:
    'https://www.profitablecpmratenetwork.com/ni7wuaw7?key=427193865a33189ad265257631962c82',
  chapterGateAffiliateUrl: null,
  nativeBannerCode:
    '<script async="async" data-cfasync="false" src="https://pl29296888.profitablecpmratenetwork.com/fb61445035348c55835c05d9c8c6db17/invoke.js"></script>\n<div id="container-fb61445035348c55835c05d9c8c6db17"></div>',
  nativeBannerScriptSrc:
    'https://pl29296888.profitablecpmratenetwork.com/fb61445035348c55835c05d9c8c6db17/invoke.js',
  nativeBannerContainerId: 'container-fb61445035348c55835c05d9c8c6db17',
  adsEnabled: true,
  rewardAdsEnabled: true,
  nativeBannerEnabled: true,
  chapterGateEnabled: true,
  rewardAdPoints: DEFAULT_REWARD_AD_POINTS,
  rewardAdDailyLimit: DEFAULT_REWARD_AD_DAILY_LIMIT,
  rewardAdViewSeconds: DEFAULT_REWARD_AD_VIEW_SECONDS,
  chapterGateEveryChapters: DEFAULT_CHAPTER_GATE_EVERY_CHAPTERS,
  chapterGateWaitSeconds: DEFAULT_CHAPTER_GATE_WAIT_SECONDS,
  adminRoleDashboardModules: [...DEFAULT_ADMIN_ROLE_DASHBOARD_MODULES],
  authorRoleDashboardModules: [...DEFAULT_AUTHOR_ROLE_DASHBOARD_MODULES],
} as const;

export interface UpdateAdSettingsInput {
  smartlinkUrl?: string | null;
  chapterGateAffiliateUrl?: string | null;
  nativeBannerCode?: string | null;
  adsEnabled?: boolean;
  rewardAdsEnabled?: boolean;
  nativeBannerEnabled?: boolean;
  chapterGateEnabled?: boolean;
  rewardAdPoints?: number | string | null;
  rewardAdDailyLimit?: number | string | null;
  rewardAdViewSeconds?: number | string | null;
  chapterGateEveryChapters?: number | string | null;
  chapterGateWaitSeconds?: number | string | null;
  adminRoleDashboardModules?: readonly AdminDashboardModule[] | null;
  authorRoleDashboardModules?: readonly AuthorDashboardModule[] | null;
}

export interface AdSettingsResponse {
  id: number;
  smartlinkUrl: string | null;
  chapterGateAffiliateUrl: string | null;
  nativeBannerCode: string | null;
  nativeBannerScriptSrc: string | null;
  nativeBannerContainerId: string | null;
  adsEnabled: boolean;
  rewardAdsEnabled: boolean;
  nativeBannerEnabled: boolean;
  chapterGateEnabled: boolean;
  rewardAdPoints: number;
  rewardAdDailyLimit: number;
  rewardAdViewSeconds: number;
  chapterGateEveryChapters: number;
  chapterGateWaitSeconds: number;
  adminRoleDashboardModules: AdminDashboardModule[];
  authorRoleDashboardModules: AuthorDashboardModule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicAdSettingsResponse {
  smartlinkUrl: string | null;
  chapterGateAffiliateUrl: string | null;
  nativeBannerScriptSrc: string | null;
  nativeBannerContainerId: string | null;
  adsEnabled: boolean;
  rewardAdsEnabled: boolean;
  nativeBannerEnabled: boolean;
  chapterGateEnabled: boolean;
  rewardAdPoints: number;
  rewardAdDailyLimit: number;
  rewardAdViewSeconds: number;
  chapterGateEveryChapters: number;
  chapterGateWaitSeconds: number;
}

export interface RewardAdsRuntimeSettings {
  enabled: boolean;
  smartlinkUrl: string | null;
  points: number;
  dailyLimit: number;
  viewSeconds: number;
}

export interface ChapterGateRuntimeSettings {
  enabled: boolean;
  smartlinkUrl: string | null;
  chapterGateAffiliateUrl: string | null;
  everyChapters: number;
  waitSeconds: number;
}

@Injectable()
export class AdSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminSettings(): Promise<AdSettingsResponse> {
    const settings = await this.ensureSettings();

    return {
      ...settings,
      adminRoleDashboardModules: getRoleDefaultAdminDashboardModules(
        settings.adminRoleDashboardModules,
      ),
      authorRoleDashboardModules: getRoleDefaultAuthorDashboardModules(
        settings.authorRoleDashboardModules,
      ),
    };
  }

  async getPublicSettings(): Promise<PublicAdSettingsResponse> {
    const settings = await this.ensureSettings();

    return {
      smartlinkUrl:
        settings.adsEnabled &&
        (settings.rewardAdsEnabled || settings.chapterGateEnabled)
          ? settings.smartlinkUrl
          : null,
      chapterGateAffiliateUrl:
        settings.adsEnabled && settings.chapterGateEnabled
          ? settings.chapterGateAffiliateUrl
          : null,
      nativeBannerScriptSrc:
        settings.adsEnabled && settings.nativeBannerEnabled
          ? settings.nativeBannerScriptSrc
          : null,
      nativeBannerContainerId:
        settings.adsEnabled && settings.nativeBannerEnabled
          ? settings.nativeBannerContainerId
          : null,
      adsEnabled: settings.adsEnabled,
      rewardAdsEnabled: settings.adsEnabled && settings.rewardAdsEnabled,
      nativeBannerEnabled: settings.adsEnabled && settings.nativeBannerEnabled,
      chapterGateEnabled: settings.adsEnabled && settings.chapterGateEnabled,
      rewardAdPoints: settings.rewardAdPoints,
      rewardAdDailyLimit: settings.rewardAdDailyLimit,
      rewardAdViewSeconds: settings.rewardAdViewSeconds,
      chapterGateEveryChapters: settings.chapterGateEveryChapters,
      chapterGateWaitSeconds: settings.chapterGateWaitSeconds,
    };
  }

  async getRewardAdsRuntimeSettings(): Promise<RewardAdsRuntimeSettings> {
    const settings = await this.ensureSettings();

    return {
      enabled: settings.adsEnabled && settings.rewardAdsEnabled,
      smartlinkUrl:
        settings.adsEnabled && settings.rewardAdsEnabled
          ? settings.smartlinkUrl
          : null,
      points: settings.rewardAdPoints,
      dailyLimit: settings.rewardAdDailyLimit,
      viewSeconds: settings.rewardAdViewSeconds,
    };
  }

  async getChapterGateRuntimeSettings(): Promise<ChapterGateRuntimeSettings> {
    const settings = await this.ensureSettings();

    return {
      enabled: settings.adsEnabled && settings.chapterGateEnabled,
      smartlinkUrl:
        settings.adsEnabled && settings.chapterGateEnabled
          ? settings.smartlinkUrl
          : null,
      chapterGateAffiliateUrl:
        settings.adsEnabled && settings.chapterGateEnabled
          ? settings.chapterGateAffiliateUrl
          : null,
      everyChapters: settings.chapterGateEveryChapters,
      waitSeconds: settings.chapterGateWaitSeconds,
    };
  }

  async updateSettings(
    input: UpdateAdSettingsInput,
  ): Promise<AdSettingsResponse> {
    const data: Record<string, unknown> = {};

    if ('smartlinkUrl' in input) {
      data.smartlinkUrl = this.normalizeOptionalUrl(
        input.smartlinkUrl,
        'smartlinkUrl',
      );
    }

    if ('chapterGateAffiliateUrl' in input) {
      data.chapterGateAffiliateUrl = this.normalizeOptionalUrl(
        input.chapterGateAffiliateUrl,
        'chapterGateAffiliateUrl',
      );
    }

    if ('nativeBannerCode' in input) {
      const nativeBannerCode = input.nativeBannerCode?.trim() || null;
      const parsed = this.parseNativeBannerCode(nativeBannerCode);
      data.nativeBannerCode = nativeBannerCode;
      data.nativeBannerScriptSrc = parsed.scriptSrc;
      data.nativeBannerContainerId = parsed.containerId;
    }

    if ('adsEnabled' in input) {
      data.adsEnabled = Boolean(input.adsEnabled);
    }

    if ('rewardAdsEnabled' in input) {
      data.rewardAdsEnabled = Boolean(input.rewardAdsEnabled);
    }

    if ('nativeBannerEnabled' in input) {
      data.nativeBannerEnabled = Boolean(input.nativeBannerEnabled);
    }

    if ('chapterGateEnabled' in input) {
      data.chapterGateEnabled = Boolean(input.chapterGateEnabled);
    }

    if ('rewardAdPoints' in input) {
      data.rewardAdPoints = this.normalizePositiveInteger(
        input.rewardAdPoints,
        'rewardAdPoints',
        DEFAULT_REWARD_AD_POINTS,
        1,
        1_000_000,
      );
    }

    if ('rewardAdDailyLimit' in input) {
      data.rewardAdDailyLimit = this.normalizePositiveInteger(
        input.rewardAdDailyLimit,
        'rewardAdDailyLimit',
        DEFAULT_REWARD_AD_DAILY_LIMIT,
        1,
        20,
      );
    }

    if ('rewardAdViewSeconds' in input) {
      data.rewardAdViewSeconds = this.normalizePositiveInteger(
        input.rewardAdViewSeconds,
        'rewardAdViewSeconds',
        DEFAULT_REWARD_AD_VIEW_SECONDS,
        5,
        600,
      );
    }

    if ('chapterGateEveryChapters' in input) {
      data.chapterGateEveryChapters = this.normalizePositiveInteger(
        input.chapterGateEveryChapters,
        'chapterGateEveryChapters',
        DEFAULT_CHAPTER_GATE_EVERY_CHAPTERS,
        1,
        50,
      );
    }

    if ('chapterGateWaitSeconds' in input) {
      data.chapterGateWaitSeconds = this.normalizePositiveInteger(
        input.chapterGateWaitSeconds,
        'chapterGateWaitSeconds',
        DEFAULT_CHAPTER_GATE_WAIT_SECONDS,
        1,
        120,
      );
    }

    if ('adminRoleDashboardModules' in input) {
      data.adminRoleDashboardModules = this.normalizeDashboardModules(
        input.adminRoleDashboardModules,
        ADMIN_DASHBOARD_MODULES,
        'adminRoleDashboardModules',
      );
    }

    if ('authorRoleDashboardModules' in input) {
      data.authorRoleDashboardModules = this.normalizeDashboardModules(
        input.authorRoleDashboardModules,
        AUTHOR_DASHBOARD_MODULES,
        'authorRoleDashboardModules',
      );
    }

    const settings = await this.prisma.adSettings.upsert({
      where: { id: AD_SETTINGS_ID },
      create: {
        ...DEFAULT_AD_SETTINGS,
        ...data,
      },
      update: data,
    });

    return {
      ...settings,
      adminRoleDashboardModules: getRoleDefaultAdminDashboardModules(
        settings.adminRoleDashboardModules,
      ),
      authorRoleDashboardModules: getRoleDefaultAuthorDashboardModules(
        settings.authorRoleDashboardModules,
      ),
    };
  }

  async getSmartlinkUrl(): Promise<string | null> {
    const settings = await this.ensureSettings();
    if (
      !settings.adsEnabled ||
      !settings.rewardAdsEnabled ||
      !settings.smartlinkUrl
    ) {
      return null;
    }

    return settings.smartlinkUrl;
  }

  private async ensureSettings(): Promise<AdSettings> {
    const existing = await this.prisma.adSettings.findUnique({
      where: { id: AD_SETTINGS_ID },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.adSettings.upsert({
      where: { id: AD_SETTINGS_ID },
      create: DEFAULT_AD_SETTINGS,
      update: {},
    });
  }

  private normalizeOptionalUrl(
    value: string | null | undefined,
    field: string,
  ) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return new URL(trimmed).toString();
    } catch {
      throw new BadRequestException(`${field} must be a valid URL`);
    }
  }

  private normalizePositiveInteger(
    value: number | string | null | undefined,
    field: string,
    fallback: number,
    min: number,
    max: number,
  ) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    const parsed =
      typeof value === 'number' ? value : Number.parseInt(String(value), 10);

    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(
        `${field} must be an integer between ${min} and ${max}`,
      );
    }

    return parsed;
  }

  private parseNativeBannerCode(code: string | null): {
    scriptSrc: string | null;
    containerId: string | null;
  } {
    if (!code) {
      return { scriptSrc: null, containerId: null };
    }

    const scriptSrc =
      code.match(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)?.[1] ?? null;
    const containerId =
      code.match(/<div\b[^>]*\bid=["']([^"']+)["'][^>]*>/i)?.[1] ?? null;

    if (!scriptSrc || !containerId) {
      throw new BadRequestException(
        'nativeBannerCode must include a script src and container div id',
      );
    }

    return {
      scriptSrc: this.normalizeOptionalUrl(scriptSrc, 'nativeBannerScriptSrc'),
      containerId,
    };
  }

  private normalizeDashboardModules<T extends string>(
    value: readonly T[] | null | undefined,
    allowed: readonly T[],
    field: string,
  ) {
    if (!value) {
      return [...allowed];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException(`${field} must be an array`);
    }

    const allowedSet = new Set<string>(allowed);
    const normalized = value.filter((item, index) => {
      if (typeof item !== 'string' || !allowedSet.has(item)) {
        throw new BadRequestException(`${field} contains an invalid module`);
      }

      return value.indexOf(item) === index;
    });

    return normalized;
  }
}
