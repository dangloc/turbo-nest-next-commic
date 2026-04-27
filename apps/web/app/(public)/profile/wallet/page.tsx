"use client";

import { Suspense } from "react";
import { WalletHistoryPage } from "../../../../src/features/wallet-history/wallet-history-page";

export default function ProfileWalletPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-10">Đang tải...</div>}>
      <WalletHistoryPage />
    </Suspense>
  );
}
