"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionUser } from "@/lib/api/types";
import { getSessionToken, persistSessionToStorage } from "@/lib/auth/session-store";
import { resolveImageUrl } from "@/lib/image";
import { AppContext } from "@/providers/app-provider";
import { ProfilePanel, ProfileShell } from "../profile-layout/profile-shell";
import {
  changePassword,
  fetchProfile,
  updateProfile,
  uploadAvatarImage,
  type ProfileResponse,
} from "../profile/api";

interface ProfileFormState {
  displayName: string;
  email: string;
  avatar: string;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function toSessionUser(payload: ProfileResponse): SessionUser {
  return {
    id: payload.profile.id,
    email: payload.profile.email,
    nickname: payload.profile.nickname,
    displayName: payload.profile.nickname,
    avatar: payload.profile.avatar,
    role: payload.profile.role,
  };
}

function initialPasswordForm(): PasswordFormState {
  return {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

export function UserProfilePage() {
  const { loaded, setUser } = useContext(AppContext);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: ProfileResponse }
    | { status: "error"; message: string }
  >({ status: "loading" });
  const [form, setForm] = useState<ProfileFormState>({
    displayName: "",
    email: "",
    avatar: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(
    initialPasswordForm,
  );
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    void (async () => {
      const token = getSessionToken() ?? undefined;
      const result = await fetchProfile(token, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setState({
          status: "error",
          message: result.error.message || "Không thể tải hồ sơ.",
        });
        return;
      }

      setState({ status: "ready", data: result.data });
      setForm({
        displayName: result.data.profile.nickname ?? "",
        email: result.data.profile.email,
        avatar: result.data.profile.avatar ?? "",
      });

      const sessionUser = toSessionUser(result.data);
      persistSessionToStorage(sessionUser);
      setUser(sessionUser);
    })();

    return () => controller.abort();
  }, [loaded, setUser]);

  const profile = state.status === "ready" ? state.data.profile : null;
  const avatarPreview = useMemo(
    () => form.avatar.trim() || profile?.avatar || "",
    [form.avatar, profile?.avatar],
  );
  const avatarPreviewUrl = useMemo(
    () => resolveImageUrl(avatarPreview) ?? "",
    [avatarPreview],
  );
  const avatarInitial = useMemo(() => {
    const seed = form.displayName || profile?.nickname || profile?.email || "U";
    return seed.trim().slice(0, 1).toUpperCase() || "U";
  }, [form.displayName, profile?.email, profile?.nickname]);

  async function onSubmitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage(null);

    const token = getSessionToken() ?? undefined;
    const result = await updateProfile(
      {
        displayName: form.displayName,
        email: form.email,
        avatar: form.avatar,
      },
      token,
    );

    setProfileBusy(false);

    if (!result.ok) {
      setProfileMessage(result.error.message || "Không thể cập nhật hồ sơ.");
      return;
    }

    setState({ status: "ready", data: result.data });
    setForm({
      displayName: result.data.profile.nickname ?? "",
      email: result.data.profile.email,
      avatar: result.data.profile.avatar ?? "",
    });

    const sessionUser = toSessionUser(result.data);
    persistSessionToStorage(sessionUser);
    setUser(sessionUser);
    setProfileMessage("Đã cập nhật thông tin.");
  }

  async function onAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    setAvatarBusy(true);
    setProfileMessage(null);

    const token = getSessionToken() ?? undefined;
    const uploadResult = await uploadAvatarImage(file, token);
    if (!uploadResult.ok) {
      setAvatarBusy(false);
      setProfileMessage(uploadResult.error.message || "Không thể tải ảnh đại diện.");
      input.value = "";
      return;
    }

    const saveResult = await updateProfile({ avatar: uploadResult.data.url }, token);
    setAvatarBusy(false);
    input.value = "";

    if (!saveResult.ok) {
      setForm((current) => ({ ...current, avatar: uploadResult.data.url }));
      setProfileMessage(
        saveResult.error.message ||
          "Đã tải ảnh lên nhưng chưa lưu được vào hồ sơ. Vui lòng bấm cập nhật lại.",
      );
      return;
    }

    setState({ status: "ready", data: saveResult.data });
    setForm({
      displayName: saveResult.data.profile.nickname ?? "",
      email: saveResult.data.profile.email,
      avatar: saveResult.data.profile.avatar ?? "",
    });

    const sessionUser = toSessionUser(saveResult.data);
    persistSessionToStorage(sessionUser);
    setUser(sessionUser);
    setProfileMessage("Đã cập nhật ảnh đại diện.");
  }

  async function onSubmitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("Mật khẩu mới và xác nhận không khớp.");
      return;
    }

    setPasswordBusy(true);
    const token = getSessionToken() ?? undefined;
    const result = await changePassword(
      {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
      token,
    );
    setPasswordBusy(false);

    if (!result.ok) {
      setPasswordMessage(result.error.message || "Không thể đổi mật khẩu.");
      return;
    }

    setPasswordForm(initialPasswordForm());
    setPasswordMessage("Đã đổi mật khẩu.");
  }

  return (
    <ProfileShell active="profile">
      <ProfilePanel title="THÔNG TIN CHUNG">
        {state.status === "loading" ? (
          <p className="profile-empty-state">Đang tải hồ sơ...</p>
        ) : state.status === "error" ? (
          <p className="profile-error-state">{state.message}</p>
        ) : (
          <div className="profile-account-forms">
            <form className="profile-account-form" onSubmit={onSubmitProfile}>
              <div className="profile-form-grid">
                <label>
                  <span>Tên hiển thị *</span>
                  <Input
                    maxLength={40}
                    minLength={2}
                    value={form.displayName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="Tên hiển thị"
                  />
                </label>

                <label>
                  <span>Email</span>
                  <Input value={form.email} disabled />
                </label>

                <label>
                  <span>Ảnh đại diện</span>
                  <Input
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={avatarBusy || profileBusy}
                    onChange={onAvatarFileChange}
                    type="file"
                  />
                  <small>
                    {avatarBusy
                      ? "Đang tải ảnh đại diện..."
                      : "Hỗ trợ JPG, PNG, WebP, GIF tối đa 5MB."}
                  </small>
                </label>

                <div className="profile-avatar-preview profile-avatar-preview--large">
                  {avatarPreviewUrl ? (
                    <img src={avatarPreviewUrl} alt="Avatar preview" />
                  ) : (
                    <span>{avatarInitial}</span>
                  )}
                </div>
              </div>

              {profileMessage ? (
                <p className="profile-info-note" role="status">
                  {profileMessage}
                </p>
              ) : (
                <p className="profile-info-note">
                  Lưu ý: Hãy kiểm tra kỹ thông tin trước khi thao tác.
                </p>
              )}

              <div className="profile-form-actions">
                <Button type="button" variant="outline">
                  Hủy bỏ
                </Button>
                <Button disabled={profileBusy} type="submit">
                  {profileBusy ? "Đang cập nhật..." : "Cập nhật thông tin"}
                </Button>
              </div>
            </form>

            <form className="profile-password-form" onSubmit={onSubmitPassword}>
              <h2>Đổi mật khẩu</h2>
              <div className="profile-form-grid">
                <label>
                  <span>Mật khẩu hiện tại</span>
                  <Input
                    autoComplete="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </label>
                <label>
                  <span>Mật khẩu mới</span>
                  <Input
                    autoComplete="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    placeholder="Nhập mật khẩu mới"
                  />
                </label>
                <label>
                  <span>Xác nhận mật khẩu mới</span>
                  <Input
                    autoComplete="new-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </label>
              </div>
              {passwordMessage ? (
                <p className="profile-inline-message" role="status">
                  {passwordMessage}
                </p>
              ) : null}
              <div className="profile-form-actions">
                <Button disabled={passwordBusy} type="submit" variant="outline">
                  {passwordBusy ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </ProfilePanel>
    </ProfileShell>
  );
}
