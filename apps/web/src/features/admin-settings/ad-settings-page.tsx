"use client";

import { RefreshCcw, Save, Settings2 } from "lucide-react";
import { useContext, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { ApiResult } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import {
  ADMIN_DASHBOARD_MODULE_OPTIONS,
  AUTHOR_DASHBOARD_MODULE_OPTIONS,
  isSuperAdmin,
  type AdminDashboardModule,
  type AuthorDashboardModule,
} from "@/lib/dashboard-access";
import { AppContext } from "@/providers/app-provider";
import { DEFAULT_PUBLIC_AD_SETTINGS } from "../ads/api";
import {
  fetchAdminAdSettings,
  fetchDashboardRoleSettings,
  updateAdminAdSettings,
  updateDashboardRoleSettings,
} from "./api";
import type {
  AdminAdSettingsResponse,
  DashboardRoleSettingsResponse,
  UpdateAdminAdSettingsInput,
  UpdateDashboardRoleSettingsInput,
} from "./types";

function toFormState(
  settings: AdminAdSettingsResponse,
): UpdateAdminAdSettingsInput {
  return {
    smartlinkUrl: settings.smartlinkUrl,
    chapterGateAffiliateUrl: settings.chapterGateAffiliateUrl,
    nativeBannerCode: settings.nativeBannerCode,
    adsEnabled: settings.adsEnabled,
    rewardAdsEnabled: settings.rewardAdsEnabled,
    nativeBannerEnabled: settings.nativeBannerEnabled,
    chapterGateEnabled: settings.chapterGateEnabled,
    rewardAdPoints: settings.rewardAdPoints,
    rewardAdDailyLimit: settings.rewardAdDailyLimit,
    rewardAdViewSeconds: settings.rewardAdViewSeconds,
    chapterGateEveryChapters: settings.chapterGateEveryChapters,
    chapterGateWaitSeconds: settings.chapterGateWaitSeconds,
  };
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("vi-VN");
}

function normalizePositiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function toggleModule<T extends string>(current: T[], module: T) {
  return current.includes(module)
    ? current.filter((item) => item !== module)
    : [...current, module];
}

function StatusCard({
  title,
  enabled,
  detail,
}: {
  title: string;
  enabled: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold">{enabled ? "Bật" : "Tắt"}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

export function AdSettingsPage() {
  const { loaded, user } = useContext(AppContext);
  const [form, setForm] = useState<UpdateAdminAdSettingsInput>({
    smartlinkUrl: DEFAULT_PUBLIC_AD_SETTINGS.smartlinkUrl,
    chapterGateAffiliateUrl: DEFAULT_PUBLIC_AD_SETTINGS.chapterGateAffiliateUrl,
    nativeBannerCode: null,
    adsEnabled: DEFAULT_PUBLIC_AD_SETTINGS.adsEnabled,
    rewardAdsEnabled: DEFAULT_PUBLIC_AD_SETTINGS.rewardAdsEnabled,
    nativeBannerEnabled: DEFAULT_PUBLIC_AD_SETTINGS.nativeBannerEnabled,
    chapterGateEnabled: DEFAULT_PUBLIC_AD_SETTINGS.chapterGateEnabled,
    rewardAdPoints: DEFAULT_PUBLIC_AD_SETTINGS.rewardAdPoints,
    rewardAdDailyLimit: DEFAULT_PUBLIC_AD_SETTINGS.rewardAdDailyLimit,
    rewardAdViewSeconds: DEFAULT_PUBLIC_AD_SETTINGS.rewardAdViewSeconds,
    chapterGateEveryChapters:
      DEFAULT_PUBLIC_AD_SETTINGS.chapterGateEveryChapters,
    chapterGateWaitSeconds: DEFAULT_PUBLIC_AD_SETTINGS.chapterGateWaitSeconds,
  });
  const [snapshot, setSnapshot] = useState<AdminAdSettingsResponse | null>(
    null,
  );
  const [roleSettings, setRoleSettings] =
    useState<DashboardRoleSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRoleSettings, setIsSavingRoleSettings] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [roleMessage, setRoleMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [roleDraft, setRoleDraft] = useState<UpdateDashboardRoleSettingsInput>({
    adminRoleDashboardModules: ADMIN_DASHBOARD_MODULE_OPTIONS.map(
      (item) => item.value,
    ),
    authorRoleDashboardModules: AUTHOR_DASHBOARD_MODULE_OPTIONS.map(
      (item) => item.value,
    ),
  });
  const superAdmin = loaded && isSuperAdmin(user);

  async function loadSettings(signal?: AbortSignal) {
    setIsLoading(true);
    setMessage(null);
    setRoleMessage(null);

    const [settingsResult, roleSettingsResult] = await Promise.all([
      fetchAdminAdSettings(undefined, signal),
      superAdmin
        ? fetchDashboardRoleSettings(undefined, signal)
        : Promise.resolve<ApiResult<DashboardRoleSettingsResponse> | null>(
            null,
          ),
    ]);
    if (signal?.aborted) {
      return;
    }

    if (!settingsResult.ok) {
      setMessage({
        tone: "error",
        text:
          settingsResult.error.message || "Không thể tải cấu hình quảng cáo.",
      });
      setIsLoading(false);
      return;
    }

    setSnapshot(settingsResult.data);
    setForm(toFormState(settingsResult.data));

    if (roleSettingsResult?.ok) {
      setRoleSettings(roleSettingsResult.data);
      setRoleDraft(roleSettingsResult.data);
    } else if (roleSettingsResult && !roleSettingsResult.ok) {
      setRoleMessage({
        tone: "error",
        text:
          roleSettingsResult.error.message ||
          "Không thể tải quyền dashboard theo role.",
      });
    } else {
      setRoleSettings(null);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const controller = new AbortController();
    void loadSettings(controller.signal);
    return () => controller.abort();
  }, [loaded, superAdmin]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const payload: UpdateAdminAdSettingsInput = {
      smartlinkUrl: form.smartlinkUrl?.trim() || null,
      chapterGateAffiliateUrl: form.chapterGateAffiliateUrl?.trim() || null,
      nativeBannerCode: form.nativeBannerCode?.trim() || null,
      adsEnabled: form.adsEnabled,
      rewardAdsEnabled: form.rewardAdsEnabled,
      nativeBannerEnabled: form.nativeBannerEnabled,
      chapterGateEnabled: form.chapterGateEnabled,
      rewardAdPoints: form.rewardAdPoints,
      rewardAdDailyLimit: form.rewardAdDailyLimit,
      rewardAdViewSeconds: form.rewardAdViewSeconds,
      chapterGateEveryChapters: form.chapterGateEveryChapters,
      chapterGateWaitSeconds: form.chapterGateWaitSeconds,
    };

    const result = await updateAdminAdSettings(payload);
    setIsSaving(false);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể lưu cấu hình quảng cáo.",
      });
      return;
    }

    setSnapshot(result.data);
    setForm(toFormState(result.data));
    setMessage({
      tone: "success",
      text: "Đã lưu cấu hình quảng cáo và nhiệm vụ hằng ngày.",
    });
  }

  async function handleSaveRoleSettings() {
    setIsSavingRoleSettings(true);
    setRoleMessage(null);

    const result = await updateDashboardRoleSettings(roleDraft);
    setIsSavingRoleSettings(false);

    if (!result.ok) {
      setRoleMessage({
        tone: "error",
        text:
          result.error.message ||
          "Không thể lưu quyền dashboard mặc định theo role.",
      });
      return;
    }

    setRoleSettings(result.data);
    setRoleDraft(result.data);
    setRoleMessage({
      tone: "success",
      text: "Đã lưu quyền dashboard mặc định cho ADMIN và AUTHOR.",
    });
  }

  const disabled = isLoading || isSaving;

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Settings2 className="h-5 w-5" />
            Cấu hình quảng cáo
          </h1>
          <p className="text-sm text-muted-foreground">
            Quản lý smartlink, native banner, reward ads và chapter gate từ
            admin dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={disabled}
            onClick={() => void loadSettings()}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
            Tải lại
          </Button>
          <Button className="gap-2" disabled={disabled} type="submit">
            <Save className="h-4 w-4" />
            {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="Toàn bộ quảng cáo"
          enabled={form.adsEnabled}
          detail={
            form.adsEnabled
              ? "Quảng cáo được phép hiển thị nếu toggle con đang bật."
              : "Tắt ở đây sẽ ẩn toàn bộ quảng cáo mà không mất cấu hình chi tiết."
          }
        />
        <StatusCard
          title="Reward ads"
          enabled={form.adsEnabled && form.rewardAdsEnabled}
          detail={`+${form.rewardAdPoints.toLocaleString("vi-VN")} điểm / ${form.rewardAdDailyLimit} lượt mỗi ngày`}
        />
        <StatusCard
          title="Chapter gate"
          enabled={form.adsEnabled && form.chapterGateEnabled}
          detail={
            form.chapterGateAffiliateUrl
              ? `Chèn sau mỗi ${form.chapterGateEveryChapters} chương, chờ ${form.chapterGateWaitSeconds}s, xoay giữa smartlink và affiliate`
              : `Chèn sau mỗi ${form.chapterGateEveryChapters} chương, chờ ${form.chapterGateWaitSeconds}s`
          }
        />
        <StatusCard
          title="Native banner"
          enabled={form.adsEnabled && form.nativeBannerEnabled}
          detail={
            snapshot?.nativeBannerContainerId
              ? `Container: ${snapshot.nativeBannerContainerId}`
              : "Chưa có banner code"
          }
        />
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            message.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Công tắc tổng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              checked={form.adsEnabled}
              disabled={disabled}
              onCheckedChange={(value) =>
                setForm((current) => ({
                  ...current,
                  adsEnabled: Boolean(value),
                }))
              }
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Bật quảng cáo toàn hệ thống
              </span>
              <span className="block text-xs text-muted-foreground">
                Khi tắt, reward ads, chapter gate và native banner đều bị ẩn.
                Các toggle con vẫn được giữ nguyên để bạn bật lại nhanh.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Smartlink dùng chung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="smartlink-url">
              Smartlink URL
            </label>
            <Input
              id="smartlink-url"
              value={form.smartlinkUrl ?? ""}
              disabled={disabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  smartlinkUrl: event.target.value,
                }))
              }
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Link này là link chính cho reward ads và chapter gate. Nếu có thêm
              affiliate URL ở dưới, chapter gate sẽ mở xen kẽ giữa 2 link.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reward ads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                checked={form.rewardAdsEnabled}
                disabled={disabled}
                onCheckedChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    rewardAdsEnabled: Boolean(value),
                  }))
                }
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">
                  Bật nhiệm vụ xem quảng cáo
                </span>
                <span className="block text-xs text-muted-foreground">
                  Ẩn/hiện dòng nhiệm vụ số 6 và chặn tạo session mới khi tắt.
                </span>
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reward-points">
                  Điểm thưởng
                </label>
                <Input
                  id="reward-points"
                  type="number"
                  min={1}
                  disabled={disabled}
                  value={form.rewardAdPoints}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rewardAdPoints: normalizePositiveInteger(
                        event.target.value,
                        current.rewardAdPoints,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reward-limit">
                  Giới hạn / ngày
                </label>
                <Input
                  id="reward-limit"
                  type="number"
                  min={1}
                  disabled={disabled}
                  value={form.rewardAdDailyLimit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rewardAdDailyLimit: normalizePositiveInteger(
                        event.target.value,
                        current.rewardAdDailyLimit,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="reward-seconds">
                  Thời gian xem
                </label>
                <Input
                  id="reward-seconds"
                  type="number"
                  min={5}
                  disabled={disabled}
                  value={form.rewardAdViewSeconds}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rewardAdViewSeconds: normalizePositiveInteger(
                        event.target.value,
                        current.rewardAdViewSeconds,
                      ),
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chapter gate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                checked={form.chapterGateEnabled}
                disabled={disabled}
                onCheckedChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    chapterGateEnabled: Boolean(value),
                  }))
                }
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">
                  Bật quảng cáo chặn giữa chapter
                </span>
                <span className="block text-xs text-muted-foreground">
                  Sau mỗi N chapter, user phải mở nội dung tài trợ trước khi đi
                  tiếp.
                </span>
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="chapter-threshold"
                >
                  Mỗi bao nhiêu chapter
                </label>
                <Input
                  id="chapter-threshold"
                  type="number"
                  min={1}
                  disabled={disabled}
                  value={form.chapterGateEveryChapters}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      chapterGateEveryChapters: normalizePositiveInteger(
                        event.target.value,
                        current.chapterGateEveryChapters,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="chapter-wait">
                  Chờ bao nhiêu giây
                </label>
                <Input
                  id="chapter-wait"
                  type="number"
                  min={1}
                  disabled={disabled}
                  value={form.chapterGateWaitSeconds}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      chapterGateWaitSeconds: normalizePositiveInteger(
                        event.target.value,
                        current.chapterGateWaitSeconds,
                      ),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="chapter-gate-affiliate-url"
              >
                Affiliate URL xen kẽ (ví dụ Shopee)
              </label>
              <Input
                id="chapter-gate-affiliate-url"
                value={form.chapterGateAffiliateUrl ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    chapterGateAffiliateUrl: event.target.value,
                  }))
                }
                placeholder="https://shopee.vn/..."
              />
              <p className="text-xs text-muted-foreground">
                Chỉ áp dụng cho chapter gate. Reward ads vẫn dùng smartlink
                chính. Nếu nhập link này, thứ tự mở sẽ là smartlink, affiliate,
                smartlink, affiliate.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Native banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              checked={form.nativeBannerEnabled}
              disabled={disabled}
              onCheckedChange={(value) =>
                setForm((current) => ({
                  ...current,
                  nativeBannerEnabled: Boolean(value),
                }))
              }
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Bật native banner
              </span>
              <span className="block text-xs text-muted-foreground">
                Hiển thị banner tài trợ ở trang chi tiết truyện và chi tiết
                chapter.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="native-banner-code">
              Native banner code
            </label>
            <textarea
              id="native-banner-code"
              className={cn("shd-input min-h-44 resize-y py-3")}
              disabled={disabled}
              value={form.nativeBannerCode ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nativeBannerCode: event.target.value,
                }))
              }
              placeholder='<script src="..."></script>
<div id="container-..."></div>'
            />
            <p className="text-xs text-muted-foreground">
              Hệ thống sẽ tự tách ra `script src` và `container id` để render ở
              frontend.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Script src
              </p>
              <p className="mt-2 break-all text-sm">
                {snapshot?.nativeBannerScriptSrc ?? "-"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Container id
              </p>
              <p className="mt-2 break-all text-sm">
                {snapshot?.nativeBannerContainerId ?? "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {superAdmin ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Quyền dashboard theo role</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cấu hình mặc định cho ADMIN và AUTHOR. Từng user vẫn có thể ghi
                đè riêng ở màn hình chi tiết user.
              </p>
            </div>
            <Button
              type="button"
              className="gap-2"
              disabled={isLoading || isSavingRoleSettings}
              onClick={() => void handleSaveRoleSettings()}
            >
              <Save className="h-4 w-4" />
              {isSavingRoleSettings ? "Đang lưu..." : "Lưu quyền theo role"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {roleMessage ? (
              <div
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm",
                  roleMessage.tone === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                {roleMessage.text}
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">ADMIN mặc định</h3>
                    <p className="text-xs text-muted-foreground">
                      Ví dụ: quản lý truyện, user, ví; có thể bỏ Settings nếu
                      không muốn.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRoleDraft((current) => ({
                          ...current,
                          adminRoleDashboardModules:
                            ADMIN_DASHBOARD_MODULE_OPTIONS.map(
                              (item) => item.value,
                            ),
                        }))
                      }
                    >
                      Chọn tất cả
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRoleDraft((current) => ({
                          ...current,
                          adminRoleDashboardModules: [],
                        }))
                      }
                    >
                      Bỏ hết
                    </Button>
                  </div>
                </div>

                {ADMIN_DASHBOARD_MODULE_OPTIONS.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={roleDraft.adminRoleDashboardModules.includes(
                        item.value as AdminDashboardModule,
                      )}
                      onCheckedChange={() =>
                        setRoleDraft((current) => ({
                          ...current,
                          adminRoleDashboardModules: toggleModule(
                            current.adminRoleDashboardModules,
                            item.value as AdminDashboardModule,
                          ),
                        }))
                      }
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">AUTHOR mặc định</h3>
                    <p className="text-xs text-muted-foreground">
                      Theo dõi truyện, danh mục và doanh thu khi tác phẩm phát
                      sinh giao dịch.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRoleDraft((current) => ({
                          ...current,
                          authorRoleDashboardModules:
                            AUTHOR_DASHBOARD_MODULE_OPTIONS.map(
                              (item) => item.value,
                            ),
                        }))
                      }
                    >
                      Chọn tất cả
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRoleDraft((current) => ({
                          ...current,
                          authorRoleDashboardModules: [],
                        }))
                      }
                    >
                      Bỏ hết
                    </Button>
                  </div>
                </div>

                {AUTHOR_DASHBOARD_MODULE_OPTIONS.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={roleDraft.authorRoleDashboardModules.includes(
                        item.value as AuthorDashboardModule,
                      )}
                      onCheckedChange={() =>
                        setRoleDraft((current) => ({
                          ...current,
                          authorRoleDashboardModules: toggleModule(
                            current.authorRoleDashboardModules,
                            item.value as AuthorDashboardModule,
                          ),
                        }))
                      }
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium">
                        {item.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {roleSettings ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    ADMIN hiện tại
                  </p>
                  <p className="mt-2 text-sm">
                    {roleSettings.adminRoleDashboardModules.join(", ") ||
                      "Không có"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    AUTHOR hiện tại
                  </p>
                  <p className="mt-2 text-sm">
                    {roleSettings.authorRoleDashboardModules.join(", ") ||
                      "Không có"}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Tạo lúc
            </p>
            <p className="mt-2 text-sm">
              {formatDateTime(snapshot?.createdAt)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Cập nhật gần nhất
            </p>
            <p className="mt-2 text-sm">
              {formatDateTime(snapshot?.updatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
