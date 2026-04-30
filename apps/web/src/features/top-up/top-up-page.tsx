"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { initSePayCheckout } from "../finance/api";
import { getSessionToken } from "../../lib/auth/session-store";
import { DEFAULT_PACKAGE_AMOUNT, TOPUP_PACKAGES, formatVnd } from "./packages";
import { ProfilePanel, ProfileShell } from "../profile-layout/profile-shell";
import { PAYMENT_RETURN_STORAGE_KEY } from "../payment/payment-result-page";

export function TopUpPageContent() {
  const [selectedAmount, setSelectedAmount] = useState<number>(
    DEFAULT_PACKAGE_AMOUNT,
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutFields, setCheckoutFields] = useState<Record<
    string,
    string | number
  > | null>(null);
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

    const orderInvoiceNumber = `TOPUP-${Date.now()}`;
    const returnParams = new URLSearchParams({
      amount: String(selectedAmount),
      invoice: orderInvoiceNumber,
    });
    const successUrl = `${window.location.origin}/payment/success?${returnParams.toString()}`;
    const errorUrl = `${window.location.origin}/payment/error?${returnParams.toString()}`;
    const cancelUrl = `${window.location.origin}/payment/cancel?${returnParams.toString()}`;

    window.localStorage.setItem(
      PAYMENT_RETURN_STORAGE_KEY,
      JSON.stringify({
        amount: selectedAmount,
        invoice: orderInvoiceNumber,
      }),
    );

    const result = await initSePayCheckout({
      orderInvoiceNumber,
      orderAmount: selectedAmount,
      orderDescription: `Nap tien ${selectedAmount}`,
      paymentMethod: "BANK_TRANSFER",
      currency: "VND",
      successUrl,
      errorUrl,
      cancelUrl,
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
      <ProfileShell active="donate">
        <ProfilePanel title="QUẢN LÝ DONATE">
          <p className="profile-empty-state">Bạn cần đăng nhập để nạp tiền.</p>
          <Link href="/auth/login" className="profile-secondary-action">
            Đăng nhập ngay
          </Link>
        </ProfilePanel>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell active="donate">
      <ProfilePanel title="QUẢN LÝ DONATE">
        <p className="profile-panel-intro">
          Chọn gói nạp phù hợp. Tỉ giá quy đổi: 1 VNĐ = 1 Kim Tệ.
        </p>

        <div
          role="radiogroup"
          aria-label="Gói nạp"
          className="profile-topup-grid"
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
                  isSelected
                    ? "profile-topup-package is-selected"
                    : "profile-topup-package"
                }
              >
                <span className="text-lg font-bold">
                  {formatVnd(amount)} VNĐ
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {formatVnd(amount)} Kim Tệ
                </span>
              </button>
            );
          })}
        </div>

        <div className="profile-topup-submit">
          <Button
            type="button"
            variant="default"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
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
      </ProfilePanel>
    </ProfileShell>
  );
}
