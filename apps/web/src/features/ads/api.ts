import { apiRequest } from "@/lib/api/http";
import type { ApiResult } from "@/lib/api/types";

export const DEFAULT_PUBLIC_AD_SETTINGS: PublicAdSettings = {
  smartlinkUrl: null,
  chapterGateAffiliateUrl: null,
  nativeBannerScriptSrc: null,
  nativeBannerContainerId: null,
  adsEnabled: true,
  rewardAdsEnabled: true,
  nativeBannerEnabled: true,
  chapterGateEnabled: true,
  rewardAdPoints: 500,
  rewardAdDailyLimit: 3,
  rewardAdViewSeconds: 30,
  chapterGateEveryChapters: 3,
  chapterGateWaitSeconds: 8,
};

export interface PublicAdSettings {
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

export async function fetchPublicAdSettings(
  signal?: AbortSignal,
): Promise<ApiResult<PublicAdSettings>> {
  return apiRequest<PublicAdSettings>("/ad-settings/public", {
    method: "GET",
    signal,
  });
}
