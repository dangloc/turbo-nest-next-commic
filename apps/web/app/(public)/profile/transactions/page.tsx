"use client";

import { Suspense } from "react";
import { WalletHistoryPage } from "../../../../src/features/wallet-history/wallet-history-page";

export default function ProfileTransactionsPage() {
  return (
    <Suspense fallback={<div className="profile-portal">Đang tải...</div>}>
      <WalletHistoryPage />
    </Suspense>
  );
}
