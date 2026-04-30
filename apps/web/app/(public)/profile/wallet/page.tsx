"use client";

import { Suspense } from "react";
import { WalletHistoryPage } from "../../../../src/features/wallet-history/wallet-history-page";

function WalletPageFallback() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <div className="dashboard-heading-row">
          <div>
            <span className="home-kicker">Reader Dashboard</span>
            <h1>Loading wallet...</h1>
            <p>Preparing your balance and transaction timeline.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ProfileWalletPage() {
  return (
    <Suspense fallback={<WalletPageFallback />}>
      <WalletHistoryPage />
    </Suspense>
  );
}
