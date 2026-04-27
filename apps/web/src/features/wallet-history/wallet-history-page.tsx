"use client";

import Link from "next/link";
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
import type {
  UserWalletHistorySummary,
  UserWalletTransactionRow,
} from "../finance/types";
import { useWalletTransactions } from "./use-wallet-transactions";

export function formatKimTe(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} Kim Tệ`;
}

export function formatSignedKimTe(value: number): string {
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

function formatWalletBalance(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function transactionDetail(row: UserWalletTransactionRow): string {
  return row.description ?? row.sepayCode ?? row.referenceCode ?? row.gateway ?? "-";
}

function transactionReference(row: UserWalletTransactionRow): string | null {
  if (row.sepayCode) {
    return row.referenceCode ? `${row.sepayCode} / ${row.referenceCode}` : row.sepayCode;
  }

  return row.referenceCode;
}

function statusVariant(status: UserWalletTransactionRow["status"]) {
  return status === "COMPLETED" ? "secondary" : "outline";
}

function SummaryCards({ summary }: { summary: UserWalletHistorySummary }) {
  return (
    <section className="wallet-history-summary" aria-label="Tổng quan ví">
      <div className="wallet-history-card">
        <span>Số dư Kim Tệ</span>
        <strong>{formatKimTe(summary.kimTe)}</strong>
      </div>
      <div className="wallet-history-card">
        <span>Cấp VIP</span>
        <strong>{summary.vipLevelName ?? "Chưa có VIP"}</strong>
        {summary.vipLevelId ? <small>VIP #{summary.vipLevelId}</small> : null}
      </div>
      <div className="wallet-history-card">
        <span>Số dư ví</span>
        <strong>{formatWalletBalance(summary.balance)}</strong>
      </div>
    </section>
  );
}

function TransactionTable({ items }: { items: UserWalletTransactionRow[] }) {
  return (
    <div className="wallet-history-table-wrap">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ngày</TableHead>
            <TableHead>Số Kim Tệ</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Mô tả</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.transactionId}>
              <TableCell>{formatDate(row.transactionDate)}</TableCell>
              <TableCell>
                <span
                  className={
                    row.amount >= 0
                      ? "wallet-history-amount wallet-history-amount--credit"
                      : "wallet-history-amount wallet-history-amount--debit"
                  }
                >
                  {formatSignedKimTe(row.amount)}
                </span>
              </TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
              </TableCell>
              <TableCell>
                <span>{transactionDetail(row)}</span>
                {transactionReference(row) ? (
                  <small className="wallet-history-reference">{transactionReference(row)}</small>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function WalletHistoryPage() {
  const wallet = useWalletTransactions();

  if (wallet.status === "unauthenticated") {
    return (
      <main className="wallet-history-shell mx-auto max-w-5xl px-4 py-10">
        <section className="wallet-history-panel wallet-history-panel--center">
          <p className="wallet-history-kicker">Tài khoản</p>
          <h1>Lịch sử ví</h1>
          <p>Vui lòng đăng nhập để xem số dư Kim Tệ, cấp VIP và các giao dịch ví của bạn.</p>
          <Link className="action-primary" href="/auth/login">
            Đăng nhập
          </Link>
        </section>
      </main>
    );
  }

  const isInitialLoading = wallet.status === "loading" && wallet.items.length === 0;
  const pageTotal = Math.max(1, wallet.totalPages);

  return (
    <main className="wallet-history-shell mx-auto max-w-5xl px-4 py-10">
      <header className="wallet-history-header">
        <div>
          <p className="wallet-history-kicker">Kim Tệ</p>
          <h1>Lịch sử ví</h1>
          <p>Theo dõi số dư, cấp VIP và mọi giao dịch nạp hoặc chi tiêu gần đây.</p>
        </div>
        <Button variant="outline" onClick={wallet.refresh} disabled={wallet.status === "loading"}>
          Làm mới
        </Button>
      </header>

      <SummaryCards summary={wallet.summary} />

      <section className="wallet-history-panel">
        <div className="wallet-history-section-header">
          <div>
            <h2>Giao dịch ví</h2>
            <p>
              Trang {wallet.page} / {pageTotal}
            </p>
          </div>
          <span>{wallet.total} giao dịch</span>
        </div>

        {isInitialLoading ? (
          <p className="wallet-history-state">Đang tải lịch sử ví...</p>
        ) : wallet.status === "error" ? (
          <div className="wallet-history-state wallet-history-state--error">
            <p className="text-destructive">{wallet.error ?? "Không thể tải lịch sử ví."}</p>
            <Button variant="outline" onClick={wallet.refresh}>
              Thử lại
            </Button>
          </div>
        ) : wallet.items.length === 0 ? (
          <p className="wallet-history-state">Bạn chưa có giao dịch ví.</p>
        ) : (
          <TransactionTable items={wallet.items} />
        )}

        <footer className="wallet-history-pagination">
          <span>
            Page {wallet.page} / {pageTotal}
          </span>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={wallet.previousPage}
              disabled={!wallet.canPreviousPage || wallet.status === "loading"}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={wallet.nextPage}
              disabled={!wallet.canNextPage || wallet.status === "loading"}
            >
              Next
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={wallet.refresh}
              disabled={wallet.status === "loading"}
            >
              Refresh
            </Button>
          </div>
        </footer>
      </section>
    </main>
  );
}
