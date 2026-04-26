"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { initSePayCheckout } from "../finance/api";
import { getSessionToken } from "../../lib/auth/session-store";
import { DEFAULT_PACKAGE_AMOUNT, TOPUP_PACKAGES, formatVnd } from "./packages";

export function TopUpPageContent() {
  const [selectedAmount, setSelectedAmount] = useState<number>(DEFAULT_PACKAGE_AMOUNT);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutFields, setCheckoutFields] = useState<Record<string, string | number> | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setIsLoggedIn(!!getSessionToken());
  }, []);

  // Auto-submit the hidden SePay form once both pieces of state are populated.
  useEffect(() => {
    if (checkoutUrl && checkoutFields && formRef.current) {
      formRef.current.submit();
    }
  }, [checkoutUrl, checkoutFields]);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await initSePayCheckout({
      orderInvoiceNumber: `TOPUP-${Date.now()}`,
      orderAmount: selectedAmount,
      orderDescription: `Nap tien ${selectedAmount}`,
      paymentMethod: "BANK_TRANSFER",
      currency: "VND",
      successUrl: `${window.location.origin}/payment/success`,
      errorUrl: `${window.location.origin}/payment/error`,
      cancelUrl: `${window.location.origin}/payment/cancel`,
    });

    if (!result.ok) {
      setError(result.error.message || "Không thể khởi tạo thanh toán SePay.");
      setSubmitting(false);
      return;
    }

    setCheckoutUrl(result.data.checkoutUrl);
    setCheckoutFields(result.data.checkoutFormFields);
    // Keep `submitting` true so the button stays disabled while the redirect happens.
  }

  if (!isLoggedIn) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Nạp tiền vào tài khoản</h1>
        <p className="text-muted-foreground mb-6">Bạn cần đăng nhập để nạp tiền.</p>
        <Link href="/auth/login" className="underline font-medium">Đăng nhập ngay</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Nạp tiền vào tài khoản</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chọn gói nạp phù hợp. Tỉ giá quy đổi: 1 VNĐ = 1 Kim Tệ.
        </p>
      </header>

      <div
        role="radiogroup"
        aria-label="Gói nạp"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {TOPUP_PACKAGES.map((amount) => {
          const isSelected = amount === selectedAmount;
          return (
            <button
              key={amount}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-selected={isSelected ? "true" : "false"}
              onClick={() => setSelectedAmount(amount)}
              className={
                "flex flex-col items-center justify-center rounded-lg border-2 p-4 text-center transition-colors " +
                (isSelected
                  ? "border-primary ring-2 ring-primary"
                  : "border-border hover:border-muted-foreground")
              }
            >
              <span className="text-lg font-bold">{formatVnd(amount)} VNĐ</span>
              <span className="mt-1 text-xs text-muted-foreground">
                {formatVnd(amount)} Kim Tệ
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <Button
          type="button"
          variant="default"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Đang xử lý...
            </>
          ) : (
            "Nạp tiền"
          )}
        </Button>
        {error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {checkoutUrl && checkoutFields ? (
        <form
          ref={formRef}
          action={checkoutUrl}
          method="POST"
          className="hidden"
          aria-hidden="true"
        >
          {Object.keys(checkoutFields).map((field) => (
            <input
              key={field}
              type="hidden"
              name={field}
              value={String(checkoutFields[field])}
            />
          ))}
        </form>
      ) : null}
    </main>
  );
}
