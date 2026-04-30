"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Home, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const PAYMENT_RETURN_STORAGE_KEY = "pending-sepay-topup";

type PaymentStatus = "success" | "cancel" | "error";

interface PendingPayment {
  amount?: number;
  invoice?: string;
}

interface PaymentResultPageProps {
  status: PaymentStatus;
}

const statusCopy: Record<
  PaymentStatus,
  {
    title: string;
    subtitle: string;
    icon: typeof Check;
    iconWrap: string;
    iconBg: string;
    primaryHref: string;
    primaryLabel: string;
  }
> = {
  success: {
    title: "Thanh toán thành công",
    subtitle: "Số dư sẽ được cập nhật sau khi webhook thanh toán được xử lý.",
    icon: Check,
    iconWrap: "bg-emerald-500/15",
    iconBg: "bg-emerald-500",
    primaryHref: "/profile/wallet",
    primaryLabel: "Xem ví của tôi",
  },
  cancel: {
    title: "Thanh toán đã hủy",
    subtitle:
      "Giao dịch chưa được ghi nhận. Bạn có thể quay lại chọn gói khác.",
    icon: X,
    iconWrap: "bg-amber-500/15",
    iconBg: "bg-amber-500",
    primaryHref: "/profile/donate",
    primaryLabel: "Nạp lại",
  },
  error: {
    title: "Thanh toán thất bại",
    subtitle:
      "Giao dịch chưa hoàn tất. Vui lòng thử lại hoặc chọn phương thức khác.",
    icon: TriangleAlert,
    iconWrap: "bg-red-500/15",
    iconBg: "bg-red-500",
    primaryHref: "/profile/donate",
    primaryLabel: "Thử lại",
  },
};

function parseAmount(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatVnd(amount?: number) {
  if (!amount) {
    return "Đang xác nhận";
  }

  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function readStoredPendingPayment(): PendingPayment {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(PAYMENT_RETURN_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as PendingPayment;
    return {
      amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
      invoice: typeof parsed.invoice === "string" ? parsed.invoice : undefined,
    };
  } catch {
    window.localStorage.removeItem(PAYMENT_RETURN_STORAGE_KEY);
    return {};
  }
}

export function PaymentResultPage({ status }: PaymentResultPageProps) {
  const searchParams = useSearchParams();
  const [stored, setStored] = useState<PendingPayment>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStored(readStoredPendingPayment());
  }, []);

  useEffect(() => {
    if (status === "success" && typeof window !== "undefined") {
      window.localStorage.removeItem(PAYMENT_RETURN_STORAGE_KEY);
    }
  }, [status]);

  const amount = useMemo(
    () =>
      parseAmount(
        searchParams.get("amount") ??
          searchParams.get("order_amount") ??
          searchParams.get("transaction_amount"),
      ) ?? stored.amount,
    [searchParams, stored.amount],
  );

  const invoice =
    searchParams.get("invoice") ??
    searchParams.get("order_invoice_number") ??
    searchParams.get("orderId") ??
    searchParams.get("order_id") ??
    stored.invoice ??
    "Đang xác nhận";

  const copy = statusCopy[status];
  const Icon = copy.icon;

  async function copyInvoice() {
    if (!invoice || invoice === "Đang xác nhận") {
      return;
    }

    try {
      await navigator.clipboard.writeText(invoice);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#101011] px-4 py-10 text-white">
      <section className="mx-auto max-w-[576px] overflow-hidden rounded-2xl border border-white/10 bg-[#171718] shadow-2xl shadow-black/30">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500" />
        <div className="px-8 py-10 sm:px-12">
          <div className="flex flex-col items-center text-center">
            <div className={`rounded-full p-2 ${copy.iconWrap}`}>
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full ${copy.iconBg}`}
              >
                <Icon className="h-10 w-10 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-normal">
              {copy.title}
            </h1>
            <p className="mt-4 text-4xl font-extrabold tracking-normal text-white">
              {formatVnd(amount)}
            </p>

            <button
              type="button"
              onClick={copyInvoice}
              className="mt-4 inline-flex max-w-full items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              aria-label="Sao chép mã đơn hàng"
            >
              <span className="text-white/70">Mã đơn hàng:</span>
              <span className="truncate font-mono">{invoice}</span>
              <Copy className="h-4 w-4 text-white/60" aria-hidden="true" />
            </button>
            {copied ? (
              <span className="mt-2 text-xs text-emerald-300">Đã sao chép</span>
            ) : null}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#151516] p-4">
              <span className="text-sm text-white/60">Số tiền</span>
              <strong className="mt-2 block text-xl font-bold">
                {formatVnd(amount)}
              </strong>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#151516] p-4">
              <span className="text-sm text-white/60">Mã đơn hàng</span>
              <strong className="mt-2 block break-all font-mono text-base">
                {invoice}
              </strong>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-white/55">
            {copy.subtitle}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/profile/donate"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Quay về nạp tiền
            </Link>
            <Link
              href={copy.primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              {copy.primaryLabel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
