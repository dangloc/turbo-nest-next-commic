import type { PublicAdSettings } from "../ads/api";
import type {
  AdminDashboardModule,
  AuthorDashboardModule,
} from "@/lib/dashboard-access";

export interface AdminAdSettingsResponse extends PublicAdSettings {
  id: number;
  nativeBannerCode: string | null;
  adminRoleDashboardModules: AdminDashboardModule[];
  authorRoleDashboardModules: AuthorDashboardModule[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardRoleSettingsResponse {
  adminRoleDashboardModules: AdminDashboardModule[];
  authorRoleDashboardModules: AuthorDashboardModule[];
}

export interface UpdateAdminAdSettingsInput {
  smartlinkUrl: string | null;
  chapterGateAffiliateUrl: string | null;
  nativeBannerCode: string | null;
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

export interface UpdateDashboardRoleSettingsInput {
  adminRoleDashboardModules: AdminDashboardModule[];
  authorRoleDashboardModules: AuthorDashboardModule[];
}
