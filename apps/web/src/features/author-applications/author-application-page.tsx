"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ProfilePanel,
  ProfileShell,
} from "@/features/profile-layout/profile-shell";
import { fetchMyAuthorApplication, submitMyAuthorApplication } from "./api";
import type {
  AuthorApplicationRecord,
  UpsertAuthorApplicationInput,
} from "./types";

interface AuthorApplicationFormState {
  penName: string;
  bio: string;
  facebookUrl: string;
  telegramUrl: string;
  otherPlatformName: string;
  otherPlatformUrl: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranch: string;
}

function emptyForm(): AuthorApplicationFormState {
  return {
    penName: "",
    bio: "",
    facebookUrl: "",
    telegramUrl: "",
    otherPlatformName: "",
    otherPlatformUrl: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "",
    bankBranch: "",
  };
}

function toFormState(
  application: AuthorApplicationRecord | null,
): AuthorApplicationFormState {
  if (!application) {
    return emptyForm();
  }

  return {
    penName: application.penName ?? "",
    bio: application.bio ?? "",
    facebookUrl: application.facebookUrl ?? "",
    telegramUrl: application.telegramUrl ?? "",
    otherPlatformName: application.otherPlatformName ?? "",
    otherPlatformUrl: application.otherPlatformUrl ?? "",
    bankAccountName: application.bankAccountName ?? "",
    bankAccountNumber: application.bankAccountNumber ?? "",
    bankName: application.bankName ?? "",
    bankBranch: application.bankBranch ?? "",
  };
}

function toPayload(
  form: AuthorApplicationFormState,
): UpsertAuthorApplicationInput {
  return {
    penName: form.penName.trim(),
    bio: form.bio.trim() || undefined,
    facebookUrl: form.facebookUrl.trim(),
    telegramUrl: form.telegramUrl.trim() || undefined,
    otherPlatformName: form.otherPlatformName.trim() || undefined,
    otherPlatformUrl: form.otherPlatformUrl.trim() || undefined,
    bankAccountName: form.bankAccountName.trim(),
    bankAccountNumber: form.bankAccountNumber.trim(),
    bankName: form.bankName.trim(),
    bankBranch: form.bankBranch.trim() || undefined,
  };
}

function statusLabel(status: AuthorApplicationRecord["approvalStatus"] | null) {
  switch (status) {
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Bị từ chối";
    case "PENDING":
      return "Đang chờ duyệt";
    default:
      return "Chưa gửi";
  }
}

function statusVariant(
  status: AuthorApplicationRecord["approvalStatus"] | null,
) {
  switch (status) {
    case "APPROVED":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("vi-VN");
}

export function AuthorApplicationPage() {
  const [application, setApplication] =
    useState<AuthorApplicationRecord | null>(null);
  const [form, setForm] = useState<AuthorApplicationFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function load(signal?: AbortSignal) {
    setIsLoading(true);
    setMessage(null);

    const result = await fetchMyAuthorApplication(undefined, signal);
    if (signal?.aborted) {
      return;
    }

    if (!result.ok) {
      setApplication(null);
      setForm(emptyForm());
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể tải hồ sơ tác giả.",
      });
      setIsLoading(false);
      return;
    }

    setApplication(result.data.application);
    setForm(toFormState(result.data.application));
    setIsLoading(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const result = await submitMyAuthorApplication(toPayload(form));
    setIsSaving(false);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể gửi hồ sơ tác giả.",
      });
      return;
    }

    setApplication(result.data.application);
    setForm(toFormState(result.data.application));
    setMessage({
      tone: "success",
      text:
        result.data.application?.approvalStatus === "APPROVED"
          ? "Đã cập nhật hồ sơ tác giả."
          : "Đã gửi hồ sơ tác giả để admin xét duyệt.",
    });
  }

  return (
    <ProfileShell active="author">
      <ProfilePanel title="ĐĂNG KÝ TÁC GIẢ">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Bút danh *</span>
                  <Input
                    value={form.penName}
                    maxLength={80}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        penName: event.target.value,
                      }))
                    }
                    placeholder="Tên tác giả hiển thị"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Facebook *</span>
                  <Input
                    value={form.facebookUrl}
                    maxLength={255}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        facebookUrl: event.target.value,
                      }))
                    }
                    placeholder="https://facebook.com/..."
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Telegram</span>
                  <Input
                    value={form.telegramUrl}
                    maxLength={255}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        telegramUrl: event.target.value,
                      }))
                    }
                    placeholder="https://t.me/..."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Nền tảng khác</span>
                  <Input
                    value={form.otherPlatformName}
                    maxLength={80}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        otherPlatformName: event.target.value,
                      }))
                    }
                    placeholder="Wattpad, Blog, Fanpage..."
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium">
                    Link nền tảng khác
                  </span>
                  <Input
                    value={form.otherPlatformUrl}
                    maxLength={255}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        otherPlatformUrl: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium">Giới thiệu</span>
                  <textarea
                    value={form.bio}
                    rows={5}
                    maxLength={1000}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                    placeholder="Mô tả ngắn về bạn và định hướng nội dung."
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Chủ tài khoản *</span>
                  <Input
                    value={form.bankAccountName}
                    maxLength={120}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bankAccountName: event.target.value,
                      }))
                    }
                    placeholder="Nguyen Van A"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Số tài khoản *</span>
                  <Input
                    value={form.bankAccountNumber}
                    maxLength={40}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bankAccountNumber: event.target.value,
                      }))
                    }
                    placeholder="123456789"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Ngân hàng *</span>
                  <Input
                    value={form.bankName}
                    maxLength={120}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bankName: event.target.value,
                      }))
                    }
                    placeholder="Vietcombank"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Chi nhánh</span>
                  <Input
                    value={form.bankBranch}
                    maxLength={120}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bankBranch: event.target.value,
                      }))
                    }
                    placeholder="Chi nhánh giao dịch"
                  />
                </label>
              </div>

              {message ? (
                <p
                  className={
                    message.tone === "success"
                      ? "mt-4 text-sm text-emerald-600"
                      : "mt-4 text-sm text-destructive"
                  }
                >
                  {message.text}
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Hồ sơ bị từ chối có thể chỉnh sửa và gửi lại. Hồ sơ đã duyệt
                  vẫn có thể cập nhật thông tin thanh toán và liên hệ.
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button disabled={isLoading || isSaving} type="submit">
                  {isSaving
                    ? "Đang gửi..."
                    : application
                      ? application.approvalStatus === "APPROVED"
                        ? "Cập nhật hồ sơ tác giả"
                        : "Gửi lại hồ sơ"
                      : "Gửi đăng ký tác giả"}
                </Button>
                {application?.approvalStatus === "APPROVED" ? (
                  <Link
                    href="/dashboard/author"
                    className="shd-btn shd-btn--outline shd-btn--md"
                  >
                    Mở kênh tác giả
                  </Link>
                ) : null}
              </div>
            </form>

            <div className="space-y-4">
              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">
                      Trạng thái xét duyệt
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Admin sẽ kiểm tra thông tin trước khi cấp quyền đăng
                      truyện.
                    </p>
                  </div>
                  <Badge
                    variant={statusVariant(application?.approvalStatus ?? null)}
                  >
                    {statusLabel(application?.approvalStatus ?? null)}
                  </Badge>
                </div>

                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Ngày gửi</dt>
                    <dd className="mt-1 font-medium">
                      {formatDate(application?.createdAt)}
                    </dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">
                      Lần cập nhật gần nhất
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatDate(application?.updatedAt)}
                    </dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Ngày duyệt</dt>
                    <dd className="mt-1 font-medium">
                      {formatDate(application?.approvedAt)}
                    </dd>
                  </div>
                </dl>

                {application?.rejectedReason ? (
                  <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    <p className="font-medium">Lý do từ chối</p>
                    <p className="mt-1">{application.rejectedReason}</p>
                  </div>
                ) : null}
              </section>

              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold">Sau khi được duyệt</h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>
                    Được cấp role `AUTHOR` và mở quyền vào dashboard tác giả.
                  </li>
                  <li>
                    Chỉ nhìn thấy truyện của chính mình trong màn quản lý
                    truyện.
                  </li>
                  <li>Theo dõi doanh thu riêng và gửi yêu cầu rút tiền.</li>
                  <li>
                    Được gửi đề xuất term mới để admin duyệt trước khi xuất bản.
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </ProfilePanel>
    </ProfileShell>
  );
}
