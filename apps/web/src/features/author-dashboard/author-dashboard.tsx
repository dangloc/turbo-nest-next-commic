"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppContext } from "../../providers/app-provider";
import {
  approveAuthorApplication,
  fetchAdminAuthorApplications,
  fetchMyAuthorApplication,
  rejectAuthorApplication,
} from "../author-applications/api";
import type {
  AdminAuthorApplicationsQuery,
  AuthorApplicationRecord,
  AuthorApplicationsListResponse,
} from "../author-applications/types";
import { canAccessDashboardPath } from "../../lib/dashboard-access";
import { bootstrapAuthorDashboardSession } from "./api";

type GuardState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

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

function statusVariant(status: AuthorApplicationRecord["approvalStatus"]) {
  switch (status) {
    case "APPROVED":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(status: AuthorApplicationRecord["approvalStatus"]) {
  switch (status) {
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Bị từ chối";
    default:
      return "Chờ duyệt";
  }
}

function summaryCards(data: AuthorApplicationsListResponse | null) {
  return [
    {
      title: "Đơn chờ duyệt",
      value: (data?.summary.pending ?? 0).toLocaleString("vi-VN"),
    },
    {
      title: "Đã duyệt",
      value: (data?.summary.approved ?? 0).toLocaleString("vi-VN"),
    },
    {
      title: "Từ chối",
      value: (data?.summary.rejected ?? 0).toLocaleString("vi-VN"),
    },
    {
      title: "Tổng hồ sơ",
      value: (data?.summary.totalApplications ?? 0).toLocaleString("vi-VN"),
    },
  ];
}

export function AuthorDashboardView() {
  const router = useRouter();
  const { user, loaded, setUser } = useContext(AppContext);
  const [guardState, setGuardState] = useState<GuardState>({
    status: "loading",
  });

  const [myApplication, setMyApplication] =
    useState<AuthorApplicationRecord | null>(null);
  const [applications, setApplications] =
    useState<AuthorApplicationsListResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [filters, setFilters] = useState<AdminAuthorApplicationsQuery>({
    status: "PENDING",
    search: "",
    page: 1,
    pageSize: 20,
  });
  const [rejectTarget, setRejectTarget] =
    useState<AuthorApplicationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusyUserId, setActionBusyUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const session = await bootstrapAuthorDashboardSession(user);
      if (cancelled) {
        return;
      }

      if (session.kind === "redirect") {
        router.replace(session.to);
        return;
      }

      setUser(session.user);
      setGuardState({ status: "ready" });
    })().catch(() => {
      if (!cancelled) {
        setGuardState({
          status: "error",
          message: "Unable to load author dashboard. Please retry.",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loaded, router, setUser, user]);

  const isAdminView = user?.role === "ADMIN" || user?.id === 1;
  const canManageNovels = canAccessDashboardPath(user, "/dashboard/novels");
  const canManageTerms = canAccessDashboardPath(user, "/dashboard/terms");
  const canViewEarnings = canAccessDashboardPath(user, "/dashboard/earnings");

  async function loadAuthorData(signal?: AbortSignal) {
    setIsLoadingData(true);
    setMessage(null);

    if (isAdminView) {
      const result = await fetchAdminAuthorApplications(
        filters,
        undefined,
        signal,
      );
      if (signal?.aborted) {
        return;
      }

      if (!result.ok) {
        setApplications(null);
        setMessage({
          tone: "error",
          text:
            result.error.message || "Không thể tải danh sách hồ sơ tác giả.",
        });
        setIsLoadingData(false);
        return;
      }

      setApplications(result.data);
      setIsLoadingData(false);
      return;
    }

    const result = await fetchMyAuthorApplication(undefined, signal);
    if (signal?.aborted) {
      return;
    }

    if (!result.ok) {
      setMyApplication(null);
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể tải hồ sơ tác giả.",
      });
      setIsLoadingData(false);
      return;
    }

    setMyApplication(result.data.application);
    setIsLoadingData(false);
  }

  useEffect(() => {
    if (guardState.status !== "ready") {
      return;
    }

    const controller = new AbortController();
    void loadAuthorData(controller.signal);
    return () => controller.abort();
  }, [
    guardState.status,
    isAdminView,
    filters.page,
    filters.pageSize,
    filters.search,
    filters.status,
  ]);

  async function handleApprove(application: AuthorApplicationRecord) {
    setActionBusyUserId(application.userId);
    setMessage(null);

    const result = await approveAuthorApplication(application.userId);
    setActionBusyUserId(null);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể duyệt hồ sơ tác giả.",
      });
      return;
    }

    setMessage({
      tone: "success",
      text: `Đã duyệt hồ sơ của ${application.nickname ?? application.email}.`,
    });
    await loadAuthorData();
  }

  async function handleReject() {
    if (!rejectTarget) {
      return;
    }

    setActionBusyUserId(rejectTarget.userId);
    setMessage(null);

    const result = await rejectAuthorApplication(
      rejectTarget.userId,
      rejectReason,
    );
    setActionBusyUserId(null);

    if (!result.ok) {
      setMessage({
        tone: "error",
        text: result.error.message || "Không thể từ chối hồ sơ tác giả.",
      });
      return;
    }

    setRejectReason("");
    setRejectTarget(null);
    setMessage({
      tone: "success",
      text: `Đã từ chối hồ sơ của ${rejectTarget.nickname ?? rejectTarget.email}.`,
    });
    await loadAuthorData();
  }

  const adminCards = useMemo(() => summaryCards(applications), [applications]);

  if (!loaded || guardState.status === "loading") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Đang tải kênh tác giả...
        </p>
      </div>
    );
  }

  if (guardState.status === "error") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm font-medium text-destructive">
          {guardState.message}
        </p>
      </div>
    );
  }

  if (isAdminView) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Kênh tác giả
            </h1>
            <p className="text-sm text-muted-foreground">
              Tiếp nhận hồ sơ đăng ký tác giả, xét duyệt quyền đăng truyện và
              kiểm tra thông tin rút tiền.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadAuthorData()}
            disabled={isLoadingData}
          >
            Làm mới
          </Button>
        </div>

        {message ? (
          <div
            className={
              message.tone === "success"
                ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
                : "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            }
          >
            {message.text}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {adminCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardTitle>{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Danh sách hồ sơ tác giả</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Admin duyệt hoặc từ chối hồ sơ trực tiếp tại đây.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Input
                  value={filters.search ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                      page: 1,
                    }))
                  }
                  placeholder="Tìm theo email, username, bút danh..."
                  className="sm:w-72"
                />
                <Select
                  value={filters.status ?? "ALL"}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      status: value as AdminAuthorApplicationsQuery["status"],
                      page: 1,
                    }))
                  }
                  options={[
                    { value: "ALL", label: "Tất cả trạng thái" },
                    { value: "PENDING", label: "Chờ duyệt" },
                    { value: "APPROVED", label: "Đã duyệt" },
                    { value: "REJECTED", label: "Bị từ chối" },
                  ]}
                  className="sm:w-44"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tài khoản</TableHead>
                  <TableHead>Bút danh</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Ngân hàng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày gửi</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Đang tải hồ sơ tác giả...
                    </TableCell>
                  </TableRow>
                ) : applications && applications.items.length > 0 ? (
                  applications.items.map((item) => (
                    <TableRow key={item.userId}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {item.nickname ?? item.username ?? item.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            User ID {item.userId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.penName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <a
                            href={item.facebookUrl ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary underline underline-offset-2"
                          >
                            Facebook
                          </a>
                          <div className="text-xs text-muted-foreground">
                            {item.telegramUrl ??
                              item.otherPlatformUrl ??
                              "Không có link phụ"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{item.bankName ?? "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.bankAccountName ?? "-"} •{" "}
                            {item.bankAccountNumber ?? "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Badge variant={statusVariant(item.approvalStatus)}>
                            {statusLabel(item.approvalStatus)}
                          </Badge>
                          {item.rejectedReason ? (
                            <div className="max-w-xs text-xs text-destructive">
                              {item.rejectedReason}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              router.push(`/dashboard/users/${item.userId}`)
                            }
                          >
                            User
                          </Button>
                          {item.approvalStatus === "PENDING" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={actionBusyUserId === item.userId}
                                onClick={() => void handleApprove(item)}
                              >
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={actionBusyUserId === item.userId}
                                onClick={() => setRejectTarget(item)}
                              >
                                Từ chối
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Chưa có hồ sơ tác giả phù hợp bộ lọc.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Trang {applications?.page ?? 1} / {applications?.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={(applications?.page ?? 1) <= 1}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.max(1, (applications?.page ?? 1) - 1),
                }))
              }
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                (applications?.page ?? 1) >= (applications?.totalPages ?? 1)
              }
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: (applications?.page ?? 1) + 1,
                }))
              }
            >
              Sau
            </Button>
          </div>
        </div>

        <Dialog
          open={Boolean(rejectTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setRejectTarget(null);
              setRejectReason("");
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Từ chối hồ sơ tác giả</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Lý do từ chối sẽ hiển thị lại cho user để họ chỉnh sửa và gửi
                lại hồ sơ.
              </p>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={5}
                maxLength={500}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Thiếu thông tin, link chưa hợp lệ, sai tài khoản ngân hàng..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Hủy
              </Button>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={
                  !rejectTarget || actionBusyUserId === rejectTarget.userId
                }
                onClick={() => void handleReject()}
              >
                Xác nhận từ chối
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Kênh tác giả</h1>
        <p className="text-sm text-muted-foreground">
          Trang điều phối quyền tác giả, doanh thu và quản lý nội dung của bạn.
        </p>
      </div>

      {message ? (
        <div
          className={
            message.tone === "success"
              ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
              : "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
        >
          {message.text}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Trạng thái hồ sơ tác giả</CardTitle>
            <p className="text-sm text-muted-foreground">
              Khi được duyệt, bạn có thể đăng truyện, theo dõi doanh thu và gửi
              yêu cầu rút tiền.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadAuthorData()}
            disabled={isLoadingData}
          >
            Làm mới
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr,280px]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge
                variant={statusVariant(
                  myApplication?.approvalStatus ?? "PENDING",
                )}
              >
                {myApplication
                  ? statusLabel(myApplication.approvalStatus)
                  : "Chưa gửi hồ sơ"}
              </Badge>
              {myApplication?.approvedAt ? (
                <span className="text-sm text-muted-foreground">
                  Duyệt lúc {formatDate(myApplication.approvedAt)}
                </span>
              ) : null}
            </div>

            {isLoadingData ? (
              <p className="text-sm text-muted-foreground">
                Đang tải hồ sơ tác giả...
              </p>
            ) : myApplication ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Bút danh
                    </div>
                    <div className="mt-2 text-sm font-medium">
                      {myApplication.penName}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Ngân hàng
                    </div>
                    <div className="mt-2 text-sm font-medium">
                      {myApplication.bankName ?? "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {myApplication.bankAccountNumber ?? "-"}
                    </div>
                  </div>
                </div>

                {myApplication.rejectedReason ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    <p className="font-medium">Lý do từ chối</p>
                    <p className="mt-1">{myApplication.rejectedReason}</p>
                  </div>
                ) : null}

                <p className="text-sm text-muted-foreground">
                  Cập nhật đầy đủ thông tin hồ sơ ở khu vực tài khoản cá nhân.
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Bạn chưa tạo hồ sơ tác giả.
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <h2 className="text-sm font-semibold">Lối tắt</h2>
            <div className="mt-3 flex flex-col gap-2">
              {canManageNovels ? (
                <Link
                  href="/dashboard/novels"
                  className="shd-btn shd-btn--default shd-btn--md"
                >
                  Quản lý truyện
                </Link>
              ) : (
                <Button disabled>Quản lý truyện</Button>
              )}
              {canManageTerms ? (
                <Link
                  href="/dashboard/terms"
                  className="shd-btn shd-btn--outline shd-btn--md"
                >
                  Danh mục
                </Link>
              ) : (
                <Button variant="outline" disabled>
                  Danh mục
                </Button>
              )}
              {canViewEarnings ? (
                <Link
                  href="/dashboard/earnings"
                  className="shd-btn shd-btn--outline shd-btn--md"
                >
                  Doanh thu
                </Link>
              ) : (
                <Button variant="outline" disabled>
                  Doanh thu
                </Button>
              )}
              <Link
                href="/profile/author"
                className="shd-btn shd-btn--ghost shd-btn--md"
              >
                Chỉnh hồ sơ tác giả
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {myApplication?.approvalStatus !== "APPROVED" ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Hồ sơ của bạn chưa ở trạng thái duyệt hoàn tất nên một số thao tác
            quản lý nội dung có thể bị chặn ở backend.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
