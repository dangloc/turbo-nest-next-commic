"use client";

import { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSessionToken } from "@/lib/auth/session-store";
import { formatAppCurrency, formatAppDateTime, formatAppNumber } from "@/lib/i18n";
import { AppContext } from "@/providers/app-provider";
import type {
  UserWalletHistorySummary,
  UserWalletTransactionRow,
} from "../finance/types";
import {
  fetchPointTransactions,
  type PointTransactionsResponse,
} from "../profile-layout/api";
import { ProfilePanel, ProfileShell } from "../profile-layout/profile-shell";
import { useWalletTransactions } from "./use-wallet-transactions";

type TransactionTab = "kimte" | "points";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatKimTe(value: number): string {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value)} Kim Tệ`;
}

export function formatSignedCurrency(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const prefix = normalized >= 0 ? "+" : "-";
  return `${prefix}${formatKimTe(Math.abs(normalized))}`;
}

export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("vi-VN", { hour12: false });
}

function transactionLabel(row: UserWalletTransactionRow): string {
  if (row.type === "DEPOSIT") return "Nạp Kim Tệ";
  if (row.type === "COMBO_PURCHASE") return "Mua combo";
  if (row.type === "PURCHASE_VIP") return "Mua VIP";
  if (row.type === "PURCHASE_CHAPTER") return "Mua chương";
  return row.type.replaceAll("_", " ");
}

function transactionDetail(row: UserWalletTransactionRow): string {
  return row.description ?? row.sepayCode ?? row.referenceCode ?? row.gateway ?? "-";
}

function SummaryCards({ summary }: { summary: UserWalletHistorySummary }) {
  return (
    <section className="profile-wallet-summary">
      <article>
        <span>Số dư ví</span>
        <strong>{formatCurrency(summary.balance)}</strong>
        <small>Kim Tệ khả dụng để mua chương/combo</small>
      </article>
      <article>
        <span>Kim Tệ</span>
        <strong>{formatKimTe(summary.kimTe)}</strong>
        <small>Tổng Kim Tệ theo tài khoản</small>
      </article>
      <article>
        <span>VIP</span>
        <strong>{summary.vipLevelName ?? "Chưa có VIP"}</strong>
        <small>{summary.vipLevelId ? `VIP #${summary.vipLevelId}` : "Chưa kích hoạt"}</small>
      </article>
    </section>
  );
}

function WalletTransactionTable({ items }: { items: UserWalletTransactionRow[] }) {
  return (
    <Table className="profile-data-table">
      <TableHeader>
        <TableRow>
          <TableHead>Hành động</TableHead>
          <TableHead>Mô tả</TableHead>
          <TableHead>Điểm</TableHead>
          <TableHead>Số dư</TableHead>
          <TableHead>Ngày</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((row) => (
          <TableRow key={row.transactionId}>
            <TableCell>{transactionLabel(row)}</TableCell>
            <TableCell>{transactionDetail(row)}</TableCell>
            <TableCell
              className={
                row.amount >= 0
                  ? "font-semibold text-green-600"
                  : "font-semibold text-red-600"
              }
            >
              {formatSignedCurrency(row.amount)}
            </TableCell>
            <TableCell>{formatKimTe(row.balanceAfter)}</TableCell>
            <TableCell>{formatDate(row.transactionDate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PointTransactionPanel() {
  const { loaded, locale } = useContext(AppContext);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<
    | { status: "loading"; data?: PointTransactionsResponse }
    | { status: "ready"; data: PointTransactionsResponse }
    | { status: "error"; message: string; data?: PointTransactionsResponse }
  >({ status: "loading" });

  useEffect(() => {
    if (!loaded) return;

    const controller = new AbortController();
    setState((current) =>
      current.status === "ready"
        ? { status: "loading", data: current.data }
        : { status: "loading" },
    );

    void (async () => {
      const token = getSessionToken() ?? undefined;
      const result = await fetchPointTransactions(page, 20, token, controller.signal);
      if (controller.signal.aborted) return;

      if (!result.ok) {
        setState({
          status: "error",
          message: result.error.message || "Không thể tải lịch sử điểm.",
        });
        return;
      }

      setState({ status: "ready", data: result.data });
    })();

    return () => controller.abort();
  }, [loaded, page]);

  const data = "data" in state ? state.data : undefined;

  if (state.status === "loading" && !data) {
    return <p className="profile-empty-state">Đang tải lịch sử điểm...</p>;
  }

  if (state.status === "error" && !data) {
    return <p className="profile-error-state">{state.message}</p>;
  }

  if (!data || data.items.length === 0) {
    return <p className="profile-empty-state">Chưa có giao dịch điểm thưởng.</p>;
  }

  return (
    <>
      <div className="profile-point-balance">
        Số dư điểm thưởng còn hiệu lực:{" "}
        <strong>{formatAppNumber(data.balance, locale)}</strong>
      </div>
      <Table className="profile-data-table">
        <TableHeader>
          <TableRow>
            <TableHead>Hành động</TableHead>
            <TableHead>Điểm</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead>Số dư</TableHead>
            <TableHead>Ngày</TableHead>
            <TableHead>Hết hạn</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Badge variant="outline">{row.type}</Badge>
              </TableCell>
              <TableCell
                className={
                  row.amount >= 0
                    ? "font-semibold text-green-600"
                    : "font-semibold text-red-600"
                }
              >
                {row.amount >= 0 ? "+" : ""}
                {formatAppNumber(row.amount, locale)}
              </TableCell>
              <TableCell>{row.reason ?? row.referenceId ?? "-"}</TableCell>
              <TableCell>
                {row.balanceAfter === null
                  ? "-"
                  : formatAppNumber(row.balanceAfter, locale)}
              </TableCell>
              <TableCell>{formatAppDateTime(row.createdAt, locale)}</TableCell>
              <TableCell>
                {row.expiresAt
                  ? row.isExpired
                    ? "Đã hết hạn"
                    : formatAppDateTime(row.expiresAt, locale)
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="profile-pagination">
        <Button
          variant="outline"
          disabled={page <= 1 || state.status === "loading"}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Trước
        </Button>
        <span>
          Trang {data.page} / {data.totalPages}
        </span>
        <Button
          variant="outline"
          disabled={data.page >= data.totalPages || state.status === "loading"}
          onClick={() => setPage((current) => current + 1)}
        >
          Tiếp
        </Button>
      </div>
    </>
  );
}

export function WalletHistoryPage() {
  const wallet = useWalletTransactions();
  const [tab, setTab] = useState<TransactionTab>("kimte");

  const isInitialLoading =
    wallet.status === "loading" && wallet.items.length === 0;
  const pageTotal = Math.max(1, wallet.totalPages);

  return (
    <ProfileShell active="transactions">
      <ProfilePanel title="LỊCH SỬ GIAO DỊCH" icon="▦">
        <SummaryCards summary={wallet.summary} />

        <div className="profile-tabs">
          <button
            type="button"
            className={tab === "kimte" ? "is-active" : undefined}
            onClick={() => setTab("kimte")}
          >
            Kim Tệ
          </button>
          <button
            type="button"
            className={tab === "points" ? "is-active" : undefined}
            onClick={() => setTab("points")}
          >
            Điểm thưởng
          </button>
        </div>

        {tab === "kimte" ? (
          <div className="profile-tab-panel">
            {isInitialLoading ? (
              <p className="profile-empty-state">Đang tải lịch sử giao dịch...</p>
            ) : wallet.status === "error" ? (
              <p className="profile-error-state">
                {wallet.error ?? "Không thể tải lịch sử giao dịch."}
              </p>
            ) : wallet.items.length === 0 ? (
              <p className="profile-empty-state">Chưa có giao dịch Kim Tệ.</p>
            ) : (
              <>
                <WalletTransactionTable items={wallet.items} />
                <div className="profile-pagination">
                  <Button
                    disabled={!wallet.canPreviousPage || wallet.status === "loading"}
                    onClick={wallet.previousPage}
                    variant="outline"
                  >
                    Trước
                  </Button>
                  <span>
                    Trang {wallet.page} / {pageTotal}
                  </span>
                  <Button
                    disabled={!wallet.canNextPage || wallet.status === "loading"}
                    onClick={wallet.nextPage}
                    variant="outline"
                  >
                    Tiếp
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="profile-tab-panel">
            <PointTransactionPanel />
          </div>
        )}
      </ProfilePanel>
    </ProfileShell>
  );
}
