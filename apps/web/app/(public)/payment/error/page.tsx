"use client";

import { Suspense } from "react";
import { PaymentResultPage } from "../../../../src/features/payment/payment-result-page";

function PaymentResultFallback() {
  return <main className="min-h-[calc(100vh-72px)] bg-[#101011]" />;
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={<PaymentResultFallback />}>
      <PaymentResultPage status="error" />
    </Suspense>
  );
}
