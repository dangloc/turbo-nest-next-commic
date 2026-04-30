"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CreditCard,
  DollarSign,
  Download,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNovels } from "@/features/author-dashboard/api";
import { useAdminWalletTransactions } from "@/features/admin-wallets/use-admin-wallet-transactions";
import type { AdminWalletTransactionRow } from "@/features/admin-wallets/types";
import { canAccessDashboardPath } from "@/lib/dashboard-access";
import { AppContext } from "@/providers/app-provider";

const monthlyRevenue = [
  { month: "Jan", value: 3900 },
  { month: "Feb", value: 2400 },
  { month: "Mar", value: 1250 },
  { month: "Apr", value: 5100 },
  { month: "May", value: 3100 },
  { month: "Jun", value: 4850 },
  { month: "Jul", value: 2800 },
  { month: "Aug", value: 3850 },
  { month: "Sep", value: 1500 },
  { month: "Oct", value: 3400 },
  { month: "Nov", value: 1600 },
  { month: "Dec", value: 2800 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0];
  const second = words[1]?.[0];
  if (first && second) {
    return (first + second).toUpperCase();
  }

  return (value.trim()[0] ?? "U").toUpperCase();
}

function RecentTransaction({ item }: { item: AdminWalletTransactionRow }) {
  const displayName = item.username || `Transaction #${item.transactionId}`;

  return (
    <div className="flex items-center gap-4">
      <Avatar fallback={getInitials(displayName)} className="h-9 w-9" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium leading-none">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {item.sepayCode ?? new Date(item.transactionDate).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="font-medium text-emerald-300">+{formatCurrency(item.amountIn)}</div>
      </div>
    </div>
  );
}

export function AdminOverview() {
  const { user } = useContext(AppContext);
  const [novelTotal, setNovelTotal] = useState(0);
  const [novelError, setNovelError] = useState<string | null>(null);
  const canViewWallets = canAccessDashboardPath(user, "/dashboard/wallets");
  const { items, summary, isLoading, error } = useAdminWalletTransactions({
    page: 1,
    pageSize: 5,
    sortBy: "transactionDate",
    sortOrder: "desc",
  }, { enabled: canViewWallets });

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      const result = await listNovels(
        { page: 1, pageSize: 1, scope: "all", sort: "newest" },
        undefined,
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setNovelError(result.error.message);
        return;
      }

      setNovelTotal(result.data.total);
      setNovelError(null);
    }

    void run();

    return () => controller.abort();
  }, []);

  const maxRevenue = useMemo(
    () => Math.max(...monthlyRevenue.map((item) => item.value)),
    [],
  );
  const totalTransactions = summary.totalTransactions || items.length;
  const activeUsers = summary.totalUsersWithBalance;

  return (
    <div className="admin-dashboard space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Tổng quan vận hành, doanh thu ví và hoạt động nội dung.
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Dashboard views">
        <button type="button" className="admin-tabs__trigger admin-tabs__trigger--active">
          Overview
        </button>
        <button type="button" className="admin-tabs__trigger">Analytics</button>
        <button type="button" className="admin-tabs__trigger" disabled>
          Reports
        </button>
        <button type="button" className="admin-tabs__trigger" disabled>
          Notifications
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {canViewWallets ? formatCurrency(summary.totalRevenue) : "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              {canViewWallets
                ? "Tổng kim tệ nạp vào hệ thống"
                : "Cần module Wallets để xem số liệu này"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Active Wallets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {canViewWallets ? `+${formatNumber(activeUsers)}` : "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              {canViewWallets
                ? "Tài khoản có số dư ví"
                : "Module Wallets đang bị tắt cho tài khoản này"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {canViewWallets ? `+${formatNumber(totalTransactions)}` : "--"}
            </div>
            <p className="text-xs text-muted-foreground">
              {canViewWallets
                ? "Giao dịch ví đã ghi nhận"
                : "Bật module Wallets để xem lịch sử giao dịch"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Novels</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{formatNumber(novelTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {novelError ? "Không tải được tổng truyện" : "Tổng truyện trong catalog"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-overview-chart" aria-label="Monthly revenue overview">
              <div className="admin-overview-chart__axis">
                <span>{formatCurrency(6000)}</span>
                <span>{formatCurrency(4500)}</span>
                <span>{formatCurrency(3000)}</span>
                <span>{formatCurrency(1500)}</span>
                <span>{formatCurrency(0)}</span>
              </div>
              <div className="admin-overview-chart__plot">
                {monthlyRevenue.map((item) => (
                  <div className="admin-overview-chart__bar-wrap" key={item.month}>
                    <span
                      className="admin-overview-chart__bar"
                      style={{ height: `${Math.max(12, (item.value / maxRevenue) * 100)}%` }}
                    />
                    <small>{item.month}</small>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Recent Sales</CardTitle>
            <p className="text-sm text-muted-foreground">
              {!canViewWallets
                ? "Tài khoản này không được cấp quyền xem giao dịch ví."
                : error
                ? error
                  : isLoading
                    ? "Đang tải giao dịch mới nhất..."
                  : `Bạn có ${formatNumber(items.length)} giao dịch mới nhất.`}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {canViewWallets && items.length > 0 ? (
                items.map((item) => <RecentTransaction key={item.transactionId} item={item} />)
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                  {canViewWallets
                    ? "Chưa có giao dịch ví gần đây."
                    : "Hãy cấp module Wallets nếu cần xem doanh thu và giao dịch."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base text-foreground">Quick Operations</CardTitle>
            <p className="text-sm text-muted-foreground">Các khu vực quản trị chính trong hệ thống.</p>
          </div>
          <Badge variant="secondary">Admin</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/dashboard/users", label: "Users", icon: Users },
            { href: "/dashboard/author", label: "Author Studio", icon: Activity },
            { href: "/dashboard/novels", label: "Novels", icon: BookOpen },
            { href: "/dashboard/terms", label: "Terms", icon: Activity },
            { href: "/dashboard/wallets", label: "Wallets", icon: Wallet },
            { href: "/dashboard/settings", label: "Settings", icon: Settings },
          ]
            .filter((item) => canAccessDashboardPath(user, item.href))
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link className="admin-quick-link" href={item.href} key={item.href}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
