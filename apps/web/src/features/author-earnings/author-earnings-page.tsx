"use client";

import { RefreshCcw, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAuthorWithdrawalRequest, fetchAuthorEarnings } from "./api";
import type { AuthorEarningsResponse } from "./types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("vi-VN");
}

function getWithdrawalTone(
  status: AuthorEarningsResponse["withdrawalRequests"][number]["status"],
) {
  switch (status) {
    case "APPROVED":
    case "PAID":
      return "secondary";
    case "REJECTED":
    case "CANCELED":
      return "destructive";
    default:
      return "outline";
  }
}

export function AuthorEarningsPage() {
  const [data, setData] = useState<AuthorEarningsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  async function load(signal?: AbortSignal) {
    setIsLoading(true);
    setError(null);

    const result = await fetchAuthorEarnings(undefined, signal);
    if (signal?.aborted) {
      return;
    }

    if (!result.ok) {
      setData(null);
      setError(result.error.message || "Không thể tải doanh thu tác giả.");
      setIsLoading(false);
      return;
    }

    setData(result.data);
    setIsLoading(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  async function handleCreateWithdrawal(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setFeedback(null);

    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback({
        tone: "error",
        text: "Số tiền rút phải lớn hơn 0.",
      });
      return;
    }

    setIsSubmittingWithdrawal(true);
    const result = await createAuthorWithdrawalRequest({
      amount,
      note: withdrawNote.trim() || undefined,
    });
    setIsSubmittingWithdrawal(false);

    if (!result.ok) {
      setFeedback({
        tone: "error",
        text: result.error.message || "Không thể tạo yêu cầu rút tiền.",
      });
      return;
    }

    setWithdrawAmount("");
    setWithdrawNote("");
    setFeedback({
      tone: "success",
      text: "Đã gửi yêu cầu rút tiền.",
    });
    await load();
  }

  const summaryCards = [
    {
      title: "Số dư có thể rút",
      value: formatCurrency(data?.summary.availableBalance ?? 0),
    },
    {
      title: "Đang chờ xử lý",
      value: formatCurrency(data?.summary.pendingWithdrawalAmount ?? 0),
    },
    {
      title: "Tổng doanh thu",
      value: formatCurrency(data?.summary.lifetimeRevenue ?? 0),
    },
    {
      title: "Tổng lượt bán",
      value: (data?.summary.totalSalesCount ?? 0).toLocaleString("vi-VN"),
    },
  ];
  const canRequestWithdrawal =
    data?.authorProfile?.approvalStatus === "APPROVED";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Doanh thu tác giả
          </h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi doanh thu từ chương lẻ, combo và các yêu cầu rút tiền của
            tài khoản tác giả.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => void load()}
        >
          <RefreshCcw className="h-4 w-4" />
          Làm mới
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {feedback ? (
        <Card>
          <CardContent
            className={
              feedback.tone === "success"
                ? "py-4 text-sm text-emerald-600"
                : "py-4 text-sm text-destructive"
            }
          >
            {feedback.text}
          </CardContent>
        </Card>
      ) : null}

      {data?.authorProfile ? (
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ tác giả</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Pen name
              </p>
              <p className="mt-2 text-sm font-medium">
                {data.authorProfile.penName ?? "Chưa đặt"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Approval
              </p>
              <p className="mt-2 text-sm font-medium">
                {data.authorProfile.approvalStatus}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Cơ cấu doanh thu
              </p>
              <p className="mt-2 text-sm font-medium">
                {data.summary.chapterSalesCount.toLocaleString("vi-VN")} chương
                lẻ, {data.summary.comboSalesCount.toLocaleString("vi-VN")} combo
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data?.authorProfile ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Gửi yêu cầu rút tiền</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleCreateWithdrawal}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">
                      Số tiền muốn rút
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={withdrawAmount}
                      disabled={!canRequestWithdrawal || isSubmittingWithdrawal}
                      onChange={(event) =>
                        setWithdrawAmount(event.target.value)
                      }
                      placeholder="Ví dụ: 500000"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium">
                      Số dư có thể rút
                    </span>
                    <Input
                      value={formatCurrency(data.summary.availableBalance)}
                      disabled
                    />
                  </label>
                </div>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Ghi chú</span>
                  <textarea
                    value={withdrawNote}
                    rows={4}
                    maxLength={500}
                    disabled={!canRequestWithdrawal || isSubmittingWithdrawal}
                    onChange={(event) => setWithdrawNote(event.target.value)}
                    placeholder="Thông tin bổ sung cho admin khi xử lý yêu cầu rút tiền."
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    disabled={!canRequestWithdrawal || isSubmittingWithdrawal}
                  >
                    {isSubmittingWithdrawal
                      ? "Đang gửi..."
                      : "Gửi yêu cầu rút tiền"}
                  </Button>
                  {!canRequestWithdrawal ? (
                    <span className="text-sm text-muted-foreground">
                      Hồ sơ tác giả phải ở trạng thái APPROVED mới được rút
                      tiền.
                    </span>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tài khoản nhận tiền</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Chủ tài khoản
                </div>
                <div className="mt-2 font-medium">
                  {data.authorProfile.bankAccountName ?? "-"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Số tài khoản
                </div>
                <div className="mt-2 font-medium">
                  {data.authorProfile.bankAccountNumber ?? "-"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Ngân hàng
                </div>
                <div className="mt-2 font-medium">
                  {data.authorProfile.bankName ?? "-"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.authorProfile.bankBranch ?? "Chưa có chi nhánh"}
                </div>
              </div>
              {data.authorProfile.rejectedReason ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive">
                  <div className="font-medium">Lưu ý từ admin</div>
                  <div className="mt-1 text-sm">
                    {data.authorProfile.rejectedReason}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!isLoading && !error && !data?.authorProfile ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Tài khoản này chưa có hồ sơ tác giả nên chưa có dữ liệu doanh thu.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Giao dịch doanh thu gần đây</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Tác phẩm</TableHead>
                <TableHead>Người mua</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Đang tải dữ liệu doanh thu...
                  </TableCell>
                </TableRow>
              ) : data && data.recentSales.length > 0 ? (
                data.recentSales.map((sale) => (
                  <TableRow key={sale.transactionId}>
                    <TableCell>
                      {formatDateTime(sale.transactionDate)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.type === "COMBO" ? "secondary" : "outline"
                        }
                      >
                        {sale.type === "COMBO" ? "Combo" : "Chương lẻ"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {sale.novelTitle ?? "Không rõ truyện"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sale.chapterTitle ?? "Không gắn chapter cụ thể"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{sale.buyerDisplayName ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatCurrency(sale.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Chưa có giao dịch doanh thu nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử rút tiền</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Đang tải lịch sử rút tiền...
                  </TableCell>
                </TableRow>
              ) : data && data.withdrawalRequests.length > 0 ? (
                data.withdrawalRequests.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>#{item.id}</TableCell>
                    <TableCell>{formatDateTime(item.requestedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={getWithdrawalTone(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.note ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Chưa có yêu cầu rút tiền nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
