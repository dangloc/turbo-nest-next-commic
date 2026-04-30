"use client";

import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WalletsTable } from "@/features/admin-wallets/wallets-table";
import { useAdminWalletTransactions } from "@/features/admin-wallets/use-admin-wallet-transactions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

export default function WalletsPage() {
  const {
    items,
    summary,
    page,
    pageSize,
    total,
    search,
    isLoading,
    error,
    canPreviousPage,
    canNextPage,
    setSearch,
    previousPage,
    nextPage,
    refresh,
  } = useAdminWalletTransactions({
    page: 1,
    pageSize: 20,
    sortBy: "transactionDate",
    sortOrder: "desc",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quản lý ví</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi số dư ví user và lịch sử nạp tiền đã migrate hoặc phát sinh từ SePay.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={refresh}>
          <RefreshCcw className="h-4 w-4" />
          Làm mới
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tổng tiền nạp</p>
          <p className="text-2xl font-semibold" data-testid="wallet-total-revenue">
            {formatCurrency(summary.totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">User có số dư</p>
          <p className="text-2xl font-semibold" data-testid="wallet-total-users-with-balance">
            {summary.totalUsersWithBalance.toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      <WalletsTable
        items={items}
        search={search}
        isLoading={isLoading}
        error={error}
        page={page}
        pageSize={pageSize}
        total={total}
        canPreviousPage={canPreviousPage}
        canNextPage={canNextPage}
        onSearchChange={setSearch}
        onPreviousPage={previousPage}
        onNextPage={nextPage}
      />
    </div>
  );
}
