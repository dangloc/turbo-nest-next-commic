"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  CircleSlash,
  Crown,
  Gem,
  Infinity,
  Loader2,
  Medal,
  Shield,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSessionToken } from "../../lib/auth/session-store";
import {
  fetchVipPackages,
  purchaseVipPackage,
  type VipPackageOption,
  type VipPackagesResponse,
  type VipPackageType,
} from "../finance/api";

const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

function formatKimTe(value: number) {
  return `${VND_FORMATTER.format(value)} Kim Tệ`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Vĩnh viễn";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("vi-VN");
}

function getPackageFeatures(packageType: VipPackageType) {
  if (packageType === "vip_permanent") {
    return [
      { icon: Medal, text: "Đứng đầu trong thế giới Tủ Sách Hiệp" },
      { icon: Infinity, text: "Đọc truyện không giới hạn mãi mãi" },
      { icon: Gem, text: "Danh hiệu VIP Siêu Cấp Vip Pro" },
      { icon: Shield, text: "Khung avatar thể hiện Đẳng Cấp Tu Tiên" },
    ];
  }

  if (packageType === "vip_3_months") {
    return [
      { icon: BookOpen, text: "Đọc truyện không giới hạn 60 ngày" },
      { icon: Crown, text: "Danh hiệu VIP Tạm thời" },
    ];
  }

  return [
    { icon: BookOpen, text: "Đọc truyện không giới hạn 30 ngày" },
    { icon: CircleSlash, text: "Không bao gồm danh hiệu VIP" },
  ];
}

function packageTone(packageType: VipPackageType) {
  if (packageType === "vip_permanent") {
    return {
      card: "border-orange-500 bg-[#1f1f1f] text-white shadow-2xl shadow-black/35",
      title: "text-amber-400",
      amount: "text-amber-400",
      icon: "text-amber-400",
      button:
        "border border-white/60 bg-transparent text-white hover:bg-white/10 disabled:text-white/60",
    };
  }

  if (packageType === "vip_3_months") {
    return {
      card: "border-amber-200 bg-[#1f1f1f] text-white shadow-xl shadow-amber-200/35",
      title: "text-violet-500",
      amount: "text-white",
      icon: "text-violet-500",
      button:
        "bg-gradient-to-r from-violet-500 to-purple-800 text-white hover:from-violet-400 hover:to-purple-700 disabled:opacity-70",
    };
  }

  return {
    card: "border-slate-200 bg-white text-slate-800 shadow-sm",
    title: "text-slate-800",
    amount: "text-slate-800",
    icon: "text-slate-500",
    button:
      "bg-slate-700 text-white hover:bg-slate-800 disabled:bg-slate-400",
  };
}

function packageSubtitle(pkg: VipPackageOption) {
  if (pkg.isPermanent) {
    return "/ Vĩnh Cửu";
  }

  return `/ ${pkg.displayDays ?? pkg.durationDays ?? 0} Ngày`;
}

function VipPackageCard({
  pkg,
  balance,
  isPermanentActive,
  isBusy,
  onPurchase,
}: {
  pkg: VipPackageOption;
  balance: number;
  isPermanentActive: boolean;
  isBusy: boolean;
  onPurchase: (packageType: VipPackageType) => void;
}) {
  const tone = packageTone(pkg.packageType);
  const features = getPackageFeatures(pkg.packageType);
  const isPopular = pkg.packageType === "vip_3_months";
  const canAfford = balance >= pkg.price;
  const disabled = isBusy || pkg.isActive || isPermanentActive || !canAfford;
  const buttonLabel = pkg.isActive
    ? "Đã kích hoạt"
    : isPermanentActive
      ? "Đã có VIP vĩnh viễn"
      : canAfford
        ? "Kích hoạt ngay"
        : "Không đủ Kim Tệ";

  return (
    <article
      className={cn(
        "vip-package-card relative flex min-h-[560px] flex-col rounded-[18px] border p-8",
        pkg.packageType === "vip_permanent" && "vip-permanent-card",
        tone.card,
      )}
    >
      {isPopular ? (
        <div className="vip-popular-badge absolute left-1/2 top-0 -translate-x-1/2 rounded-b-lg bg-violet-600 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/30">
          Phổ Biến
        </div>
      ) : null}

      {pkg.packageType === "vip_permanent" ? (
        <div className="absolute right-0 top-0 overflow-hidden rounded-tr-[17px]">
          <div className="origin-top-right rotate-45 translate-x-12 translate-y-4 bg-amber-500 px-10 py-2 text-sm font-bold text-neutral-900">
            Tối ưu nhất
          </div>
        </div>
      ) : null}

      <div className="pt-10 text-center">
        <p className={cn("text-sm font-bold uppercase tracking-[0.18em]", tone.title)}>
          {pkg.title}
        </p>
        <div className="mt-6 flex items-end justify-center gap-2">
          <span className={cn("text-5xl font-black tracking-normal", tone.amount)}>
            {VND_FORMATTER.format(pkg.price)}
          </span>
          <span className={cn("mb-2 text-xl", pkg.packageType === "vip_2_months" ? "text-slate-900" : "text-white")}>
            kim tệ
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{packageSubtitle(pkg)}</p>
      </div>

      <div className="mt-12 flex flex-1 flex-col gap-5">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.text}
              className={cn(
                "flex gap-4 border-b pb-4 text-sm font-medium leading-6",
                pkg.packageType === "vip_2_months"
                  ? "border-slate-200 text-slate-600"
                  : "border-white/10 text-white/85",
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone.icon)} aria-hidden="true" />
              <span>{feature.text}</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onPurchase(pkg.packageType)}
        className={cn(
          "mt-10 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black uppercase tracking-wide transition",
          tone.button,
        )}
      >
        {isBusy ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : pkg.isActive ? (
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        ) : null}
        {buttonLabel}
      </button>
    </article>
  );
}

export function VipPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: VipPackagesResponse }
    | { status: "error"; message: string }
    | { status: "unauthenticated" }
  >({ status: "loading" });
  const [busyPackage, setBusyPackage] = useState<VipPackageType | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sessionToken = getSessionToken();
    setToken(sessionToken);

    if (!sessionToken) {
      setState({ status: "unauthenticated" });
      return;
    }

    const authToken = sessionToken;
    const controller = new AbortController();

    async function load() {
      const result = await fetchVipPackages(authToken, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setState({
          status: "error",
          message: result.error.message || "Không thể tải gói VIP.",
        });
        return;
      }

      setState({ status: "ready", data: result.data });
    }

    void load();

    return () => controller.abort();
  }, []);

  const isPermanentActive = useMemo(
    () =>
      state.status === "ready" &&
      Boolean(state.data.subscription?.isActive && state.data.subscription.isPermanent),
    [state],
  );

  async function handlePurchase(packageType: VipPackageType) {
    if (!token || state.status !== "ready" || busyPackage) {
      return;
    }

    setBusyPackage(packageType);
    setMessage(null);

    const result = await purchaseVipPackage(packageType, token);
    if (!result.ok) {
      setMessage(result.error.message || "Không thể kích hoạt gói VIP.");
      setBusyPackage(null);
      return;
    }

    const refreshed = await fetchVipPackages(token);
    if (refreshed.ok) {
      setState({ status: "ready", data: refreshed.data });
    }

    setMessage(
      result.data.status === "already_active"
        ? "VIP vĩnh viễn đã được kích hoạt trên tài khoản này."
        : "Kích hoạt gói VIP thành công.",
    );
    setBusyPackage(null);
  }

  if (state.status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-white px-4 py-16 text-center">
        <h1 className="text-4xl font-black tracking-normal text-slate-900">
          Chọn Gói VIP
        </h1>
        <p className="mt-4 text-slate-500">Bạn cần đăng nhập để kích hoạt VIP.</p>
        <Link
          href="/auth/login"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-8 font-bold text-white"
        >
          Đăng nhập
        </Link>
      </main>
    );
  }

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" aria-hidden="true" />
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-white px-4 py-16 text-center">
        <h1 className="text-3xl font-black tracking-normal text-slate-900">
          Không thể tải gói VIP
        </h1>
        <p className="mt-4 text-slate-500">{state.message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Tu luyện không giới hạn
          </div>
          <h1 className="mt-4 text-5xl font-black tracking-normal text-white [text-shadow:0_0_18px_#f59e0b,0_2px_0_#f59e0b] sm:text-6xl">
            Chọn Gói VIP
          </h1>
          <p className="mt-5 text-lg font-bold text-slate-300">
            Số dư của đạo hữu:{" "}
            <span className="text-orange-500">{formatKimTe(state.data.balance)}</span>
          </p>
          {state.data.subscription?.isActive ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="secondary">
                Gói hiện tại: {state.data.subscription.packageType}
              </Badge>
              <Badge variant="outline">
                Hạn dùng: {formatDate(state.data.subscription.expiresAt)}
              </Badge>
            </div>
          ) : null}
        </header>

        {message ? (
          <p
            className={cn(
              "mx-auto mt-6 max-w-2xl rounded-lg px-4 py-3 text-center text-sm font-semibold",
              message.includes("thành công")
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700",
            )}
            role="status"
          >
            {message}
          </p>
        ) : null}

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {state.data.packages.map((pkg) => (
            <VipPackageCard
              key={pkg.packageType}
              pkg={pkg}
              balance={state.data.balance}
              isPermanentActive={isPermanentActive}
              isBusy={busyPackage === pkg.packageType}
              onPurchase={handlePurchase}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/top-up" className="text-sm font-bold text-orange-500 underline-offset-4 hover:underline">
            Nạp thêm Kim Tệ
          </Link>
        </div>
      </section>
    </main>
  );
}
