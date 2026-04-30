"use client";

import {
  ArrowLeft,
  RefreshCcw,
  Save,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  ADMIN_DASHBOARD_MODULE_OPTIONS,
  AUTHOR_DASHBOARD_MODULE_OPTIONS,
  getDashboardLandingHref,
  isSuperAdmin,
  type AdminDashboardModule,
  type AuthorDashboardModule,
} from "@/lib/dashboard-access";
import { AppContext } from "@/providers/app-provider";
import {
  fetchAdminUserDetail,
  updateAdminUser,
  updateAdminUserDashboardAccess,
  updateAdminUserRole,
} from "./api";
import type {
  AdminUserDetail,
  AdminUserRole,
  UpdateAdminUserInput,
} from "./types";

interface UserAccessPageProps {
  userId: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("vi-VN");
}

function toggleModule<T extends string>(current: T[], module: T) {
  return current.includes(module)
    ? current.filter((item) => item !== module)
    : [...current, module];
}

export function UserAccessPage({ userId }: UserAccessPageProps) {
  const router = useRouter();
  const { loaded, user } = useContext(AppContext);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [profileDraft, setProfileDraft] = useState<UpdateAdminUserInput>({
    email: "",
    username: "",
    nickname: "",
    avatar: "",
  });
  const [roleDraft, setRoleDraft] = useState<AdminUserRole>("USER");
  const [adminModulesDraft, setAdminModulesDraft] = useState<
    AdminDashboardModule[]
  >([]);
  const [authorModulesDraft, setAuthorModulesDraft] = useState<
    AuthorDashboardModule[]
  >([]);
  const [useAdminRoleDefaults, setUseAdminRoleDefaults] = useState(true);
  const [useAuthorRoleDefaults, setUseAuthorRoleDefaults] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function loadDetail(signal?: AbortSignal) {
    setIsLoading(true);
    setMessage(null);

    const result = await fetchAdminUserDetail(userId, undefined, signal);
    if (signal?.aborted) {
      return;
    }

    if (!result.ok) {
      setDetail(null);
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể tải thông tin user.",
      });
      setIsLoading(false);
      return;
    }

    const nextDetail = result.data;
    setDetail(nextDetail);
    setProfileDraft({
      email: nextDetail.email,
      username: nextDetail.username ?? "",
      nickname: nextDetail.nickname ?? "",
      avatar: nextDetail.avatar ?? "",
    });
    setRoleDraft(nextDetail.role);
    setAdminModulesDraft(nextDetail.adminDashboardModules);
    setAuthorModulesDraft(nextDetail.authorDashboardModules);
    setUseAdminRoleDefaults(nextDetail.adminDashboardModulesOverride === null);
    setUseAuthorRoleDefaults(nextDetail.authorDashboardModulesOverride === null);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (!isSuperAdmin(user)) {
      router.replace(getDashboardLandingHref(user) ?? "/profile");
      return;
    }

    const controller = new AbortController();
    void loadDetail(controller.signal);
    return () => controller.abort();
  }, [loaded, router, user, userId]);

  async function handleSaveProfile() {
    setIsSavingProfile(true);
    setMessage(null);

    const result = await updateAdminUser(userId, {
      email: profileDraft.email?.trim(),
      username: profileDraft.username?.trim() || null,
      nickname: profileDraft.nickname?.trim() || null,
      avatar: profileDraft.avatar?.trim() || null,
    });
    setIsSavingProfile(false);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể cập nhật thông tin user.",
      });
      return;
    }

    setDetail(result.data);
    setProfileDraft({
      email: result.data.email,
      username: result.data.username ?? "",
      nickname: result.data.nickname ?? "",
      avatar: result.data.avatar ?? "",
    });
    setMessage({
      tone: "success",
      text: "Đã cập nhật thông tin user.",
    });
  }

  async function handleSaveRole() {
    setIsSavingRole(true);
    setMessage(null);

    const result = await updateAdminUserRole(userId, { role: roleDraft });
    setIsSavingRole(false);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể cập nhật role.",
      });
      return;
    }

    setDetail(result.data);
    setRoleDraft(result.data.role);
    setMessage({
      tone: "success",
      text: "Đã cập nhật role cho user.",
    });
  }

  async function handleSaveAccess() {
    setIsSavingAccess(true);
    setMessage(null);

    const result = await updateAdminUserDashboardAccess(userId, {
      adminDashboardModules: useAdminRoleDefaults ? null : adminModulesDraft,
      authorDashboardModules: useAuthorRoleDefaults ? null : authorModulesDraft,
    });
    setIsSavingAccess(false);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể cập nhật quyền dashboard.",
      });
      return;
    }

    setDetail(result.data);
    setAdminModulesDraft(result.data.adminDashboardModules);
    setAuthorModulesDraft(result.data.authorDashboardModules);
    setUseAdminRoleDefaults(result.data.adminDashboardModulesOverride === null);
    setUseAuthorRoleDefaults(
      result.data.authorDashboardModulesOverride === null,
    );
    setMessage({
      tone: "success",
      text: "Đã lưu quyền dashboard cho user.",
    });
  }

  const locked = detail?.isSuperAdmin ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 w-fit gap-2"
            onClick={() => router.push("/dashboard/users")}
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách user
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <UserCog className="h-5 w-5" />
              Chỉnh sửa user
            </h1>
            <p className="text-sm text-muted-foreground">
              Super admin có thể sửa thông tin, đổi role và cấu hình quyền riêng
              cho từng user.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={isLoading}
          onClick={() => void loadDetail()}
        >
          <RefreshCcw className="h-4 w-4" />
          Tải lại
        </Button>
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

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Đang tải thông tin user...
          </CardContent>
        </Card>
      ) : detail ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {detail.name}
                  {detail.isSuperAdmin ? (
                    <Badge variant="secondary">Super Admin cố định</Badge>
                  ) : (
                    <Badge variant="outline">{detail.role}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-[auto,1fr,1fr]">
                <Avatar
                  src={profileDraft.avatar || detail.avatar}
                  fallback={(detail.name[0] ?? "U").toUpperCase()}
                  alt={detail.name}
                  className="h-16 w-16"
                />
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-medium">{detail.email}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Username</div>
                  <div className="font-medium">{detail.username ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ngày tạo</div>
                  <div className="font-medium">{formatDate(detail.createdAt)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cập nhật</div>
                  <div className="font-medium">{formatDate(detail.updatedAt)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tên hiển thị</div>
                  <div className="font-medium">{detail.nickname ?? detail.name}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Ví và điểm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Số dư</div>
                  <div className="font-medium">{formatCurrency(detail.balance)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Kim tệ</div>
                  <div className="font-medium">
                    {detail.kimTe.toLocaleString("vi-VN")}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Doanh thu tác giả</div>
                  <div className="font-medium">
                    {formatCurrency(detail.earnedBalance)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">VIP</div>
                  <div className="font-medium">{detail.vipLevelName ?? "Chưa có"}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {locked ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                User ID 1 luôn là super admin. Role và quyền dashboard của tài khoản
                này không cho phép chỉnh sửa.
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Thông tin cơ bản</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cập nhật email, username, nickname và avatar cho user.
                </p>
              </div>
              <Button
                type="button"
                className="gap-2"
                disabled={locked || isSavingProfile}
                onClick={() => void handleSaveProfile()}
              >
                <Save className="h-4 w-4" />
                {isSavingProfile ? "Đang lưu..." : "Lưu thông tin"}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="user-email">
                  Email
                </label>
                <Input
                  id="user-email"
                  value={profileDraft.email ?? ""}
                  disabled={locked || isSavingProfile}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="user-username">
                  Username
                </label>
                <Input
                  id="user-username"
                  value={profileDraft.username ?? ""}
                  disabled={locked || isSavingProfile}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="user-nickname">
                  Nickname
                </label>
                <Input
                  id="user-nickname"
                  value={profileDraft.nickname ?? ""}
                  disabled={locked || isSavingProfile}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      nickname: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="user-avatar">
                  Avatar URL
                </label>
                <Input
                  id="user-avatar"
                  value={profileDraft.avatar ?? ""}
                  disabled={locked || isSavingProfile}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      avatar: event.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Role</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Đổi role nền của user trước khi xét quyền dashboard.
                </p>
              </div>
              <Button
                type="button"
                className="gap-2"
                disabled={locked || isSavingRole}
                onClick={() => void handleSaveRole()}
              >
                <Save className="h-4 w-4" />
                {isSavingRole ? "Đang lưu..." : "Lưu role"}
              </Button>
            </CardHeader>
            <CardContent>
              <Select
                value={roleDraft}
                disabled={locked || isSavingRole}
                onValueChange={(value) => setRoleDraft(value as AdminUserRole)}
                options={[
                  { value: "USER", label: "USER - Độc giả" },
                  { value: "AUTHOR", label: "AUTHOR - Tác giả" },
                  { value: "ADMIN", label: "ADMIN - Quản trị" },
                ]}
                className="max-w-xs"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Ghi đè quyền dashboard</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tắt ghi đè để user dùng cấu hình mặc định theo role trong Settings.
                </p>
              </div>
              <Button
                type="button"
                className="gap-2"
                disabled={locked || isSavingAccess}
                onClick={() => void handleSaveAccess()}
              >
                <Save className="h-4 w-4" />
                {isSavingAccess ? "Đang lưu..." : "Lưu quyền dashboard"}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">ADMIN override</h3>
                    <p className="text-xs text-muted-foreground">
                      Chỉ áp dụng khi user có role ADMIN.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={useAdminRoleDefaults}
                      disabled={locked}
                      onCheckedChange={(value) =>
                        setUseAdminRoleDefaults(Boolean(value))
                      }
                    />
                    Dùng mặc định theo role
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={locked || useAdminRoleDefaults}
                    onClick={() =>
                      setAdminModulesDraft(
                        ADMIN_DASHBOARD_MODULE_OPTIONS.map((item) => item.value),
                      )
                    }
                  >
                    Chọn tất cả
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={locked || useAdminRoleDefaults}
                    onClick={() => setAdminModulesDraft([])}
                  >
                    Bỏ hết
                  </Button>
                </div>

                {ADMIN_DASHBOARD_MODULE_OPTIONS.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={adminModulesDraft.includes(item.value)}
                      disabled={locked || useAdminRoleDefaults}
                      onCheckedChange={() =>
                        setAdminModulesDraft((current) =>
                          toggleModule(current, item.value),
                        )
                      }
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium">{item.label}</span>
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
                    <h3 className="text-sm font-semibold">AUTHOR override</h3>
                    <p className="text-xs text-muted-foreground">
                      Dùng khi user có role AUTHOR, bao gồm danh mục và doanh thu.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={useAuthorRoleDefaults}
                      disabled={locked}
                      onCheckedChange={(value) =>
                        setUseAuthorRoleDefaults(Boolean(value))
                      }
                    />
                    Dùng mặc định theo role
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={locked || useAuthorRoleDefaults}
                    onClick={() =>
                      setAuthorModulesDraft(
                        AUTHOR_DASHBOARD_MODULE_OPTIONS.map((item) => item.value),
                      )
                    }
                  >
                    Chọn tất cả
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={locked || useAuthorRoleDefaults}
                    onClick={() => setAuthorModulesDraft([])}
                  >
                    Bỏ hết
                  </Button>
                </div>

                {AUTHOR_DASHBOARD_MODULE_OPTIONS.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      checked={authorModulesDraft.includes(item.value)}
                      disabled={locked || useAuthorRoleDefaults}
                      onCheckedChange={() =>
                        setAuthorModulesDraft((current) =>
                          toggleModule(current, item.value),
                        )
                      }
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
