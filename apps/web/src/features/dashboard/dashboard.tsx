"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { getSessionToken } from "../../lib/auth/session-store";
import { AppContext } from "../../providers/app-provider";
import {
  fetchWalletSummary,
  initiateTopUp,
  verifyTopUp,
  type PaymentProvider,
  type WalletSummaryResponse,
} from "../finance/api";
import { bootstrapDashboardSession, resolveDashboardSection } from "./api";
import type { DashboardSnapshot } from "./types";

type ViewState =
  | { status: "loading" }
  | { status: "ready"; snapshot: DashboardSnapshot }
  | { status: "error"; message: string };

interface TopUpFormState {
  amount: string;
  provider: PaymentProvider;
  reference: string;
}

interface VerifyFormState {
  providerTransactionId: string;
  success: boolean;
}

const DEFAULT_TOP_UP_FORM: TopUpFormState = {
  amount: "50000",
  provider: "VNPAY",
  reference: "",
};

const DEFAULT_VERIFY_FORM: VerifyFormState = {
  providerTransactionId: "",
  success: true,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }

  return parsed.toLocaleString("vi-VN", {
    hour12: false,
  });
}

function createReference() {
  return `topup-${Date.now()}`;
}

export function DashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loaded, setUser } = useContext(AppContext);
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });

  const [walletState, setWalletState] = useState<
    | { status: "idle" | "loading" }
    | { status: "ready"; data: WalletSummaryResponse }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [topUpForm, setTopUpForm] = useState<TopUpFormState>(DEFAULT_TOP_UP_FORM);
  const [verifyForm, setVerifyForm] = useState<VerifyFormState>(DEFAULT_VERIFY_FORM);
  const [pendingTopUp, setPendingTopUp] = useState<{
    provider: PaymentProvider;
    reference: string;
    amount: number;
    redirectUrl: string;
    expiresAt: string;
  } | null>(null);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    let canceled = false;

    void (async () => {
      const result = await bootstrapDashboardSession(user);
      if (canceled) {
        return;
      }

      if (result.kind === "redirect") {
        router.replace(result.to);
        return;
      }

      setUser(result.snapshot.user);
      setViewState({
        status: "ready",
        snapshot: result.snapshot,
      });
    })().catch(() => {
      if (!canceled) {
        setViewState({
          status: "error",
          message: "Unable to load dashboard session. Please try again.",
        });
      }
    });

    return () => {
      canceled = true;
    };
  }, [loaded, router, setUser, user]);

  const activeSection = useMemo(
    () => resolveDashboardSection(searchParams.toString()),
    [searchParams],
  );

  const loadWalletSummary = useMemo(
    () => async (signal?: AbortSignal) => {
      const token = getSessionToken() ?? undefined;
      setWalletState((previous) =>
        previous.status === "ready"
          ? {
              status: "ready",
              data: previous.data,
            }
          : { status: "loading" },
      );

      const result = await fetchWalletSummary(token, signal);
      if (!result.ok) {
        setWalletState({
          status: "error",
          message: result.error.message,
        });
        return false;
      }

      setWalletState({ status: "ready", data: result.data });
      return true;
    },
    [],
  );

  useEffect(() => {
    if (viewState.status !== "ready" || activeSection !== "wallet") {
      return;
    }

    const abortController = new AbortController();
    void loadWalletSummary(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [activeSection, loadWalletSummary, viewState.status]);

  if (viewState.status === "loading") {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Loading dashboard...</h1>
          <p>Checking your session and preparing account modules.</p>
        </section>
      </main>
    );
  }

  if (viewState.status === "error") {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Dashboard unavailable</h1>
          <p>{viewState.message}</p>
          <Link className="action-secondary" href="/auth/login">
            Return to sign in
          </Link>
        </section>
      </main>
    );
  }

  const { snapshot } = viewState;
  const highlighted = snapshot.sections.find((section) => section.id === activeSection);

  async function onInitiateTopUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(topUpForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setWalletMessage("Enter a valid top-up amount.");
      return;
    }

    const reference = topUpForm.reference.trim() || createReference();
    setWalletBusy(true);
    setWalletMessage(null);

    const token = getSessionToken() ?? undefined;
    const result = await initiateTopUp(
      {
        provider: topUpForm.provider,
        amount,
        reference,
        returnUrl: window.location.href,
      },
      token,
    );

    setWalletBusy(false);
    if (!result.ok) {
      setWalletMessage(result.error.message);
      return;
    }

    setPendingTopUp({
      provider: result.data.provider,
      reference: result.data.reference,
      amount: result.data.amount,
      redirectUrl: result.data.redirectUrl,
      expiresAt: result.data.expiresAt,
    });
    setVerifyForm(DEFAULT_VERIFY_FORM);
    setTopUpForm((current) => ({
      ...current,
      reference: result.data.reference,
    }));
    setWalletMessage("Top-up initiated. Confirm with provider transaction ID to settle it.");
  }

  async function onVerifyTopUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingTopUp) {
      setWalletMessage("Initiate a top-up before verifying.");
      return;
    }

    const transactionId = verifyForm.providerTransactionId.trim();
    if (!transactionId) {
      setWalletMessage("Provider transaction ID is required.");
      return;
    }

    setWalletBusy(true);
    setWalletMessage(null);

    const token = getSessionToken() ?? undefined;
    const result = await verifyTopUp(
      {
        provider: pendingTopUp.provider,
        reference: pendingTopUp.reference,
        providerTransactionId: transactionId,
        amount: pendingTopUp.amount,
        success: verifyForm.success,
      },
      token,
    );

    setWalletBusy(false);
    if (!result.ok) {
      setWalletMessage(result.error.message);
      return;
    }

    const statusLabel =
      result.data.status === "success"
        ? "Top-up settled successfully."
        : result.data.status === "already_processed"
          ? "Top-up was already processed."
          : "Top-up marked as failed by provider.";

    setWalletMessage(statusLabel);
    const loaded = await loadWalletSummary();
    if (loaded && result.data.status !== "failed") {
      setPendingTopUp(null);
      setTopUpForm({ ...DEFAULT_TOP_UP_FORM, reference: "" });
      setVerifyForm(DEFAULT_VERIFY_FORM);
    }
  }

  function renderWalletSection() {
    const balances =
      walletState.status === "ready"
        ? walletState.data.balances
        : {
            depositedBalance: 0,
            earnedBalance: 0,
            totalDeposited: 0,
          };

    const transactions = walletState.status === "ready" ? walletState.data.transactions : [];

    return (
      <section className="dashboard-wallet" aria-label="Wallet section">
        <div className="dashboard-wallet-grid">
          <article className="dashboard-wallet-card">
            <h3>Deposited balance</h3>
            <p>{formatCurrency(balances.depositedBalance)}</p>
          </article>
          <article className="dashboard-wallet-card">
            <h3>Earned balance</h3>
            <p>{formatCurrency(balances.earnedBalance)}</p>
          </article>
          <article className="dashboard-wallet-card">
            <h3>Total deposited</h3>
            <p>{formatCurrency(balances.totalDeposited)}</p>
          </article>
        </div>

        <div className="dashboard-wallet-actions">
          <article className="dashboard-wallet-form-card">
            <h3>Initiate top-up</h3>
            <p>Create a deterministic payment intent for VNPAY or MOMO.</p>
            <form onSubmit={onInitiateTopUp}>
              <label>
                Amount (VND)
                <input
                  min={1000}
                  name="amount"
                  onChange={(event) =>
                    setTopUpForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={topUpForm.amount}
                />
              </label>

              <label>
                Provider
                <select
                  name="provider"
                  onChange={(event) =>
                    setTopUpForm((current) => ({
                      ...current,
                      provider: event.target.value as PaymentProvider,
                    }))
                  }
                  value={topUpForm.provider}
                >
                  <option value="VNPAY">VNPAY</option>
                  <option value="MOMO">MOMO</option>
                </select>
              </label>

              <label>
                Reference (optional)
                <input
                  name="reference"
                  onChange={(event) =>
                    setTopUpForm((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="Auto-generated when empty"
                  value={topUpForm.reference}
                />
              </label>

              <button className="action-primary" disabled={walletBusy} type="submit">
                {walletBusy ? "Submitting..." : "Initiate top-up"}
              </button>
            </form>

            {pendingTopUp ? (
              <div className="dashboard-wallet-pending" role="status">
                <p>
                  Pending <strong>{pendingTopUp.provider}</strong> top-up for{" "}
                  <strong>{formatCurrency(pendingTopUp.amount)}</strong>.
                </p>
                <p>Reference: {pendingTopUp.reference}</p>
                <p>Expires: {formatDate(pendingTopUp.expiresAt)}</p>
                <a href={pendingTopUp.redirectUrl} rel="noreferrer" target="_blank">
                  Open provider checkout
                </a>
              </div>
            ) : null}
          </article>

          <article className="dashboard-wallet-form-card">
            <h3>Verify top-up</h3>
            <p>Confirm provider settlement and refresh balances immediately.</p>
            <form onSubmit={onVerifyTopUp}>
              <label>
                Provider transaction ID
                <input
                  name="providerTransactionId"
                  onChange={(event) =>
                    setVerifyForm((current) => ({
                      ...current,
                      providerTransactionId: event.target.value,
                    }))
                  }
                  placeholder="txn-12345"
                  required
                  value={verifyForm.providerTransactionId}
                />
              </label>

              <label className="dashboard-wallet-checkbox">
                <input
                  checked={verifyForm.success}
                  onChange={(event) =>
                    setVerifyForm((current) => ({
                      ...current,
                      success: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Provider marked payment as successful
              </label>

              <button className="action-primary" disabled={walletBusy} type="submit">
                {walletBusy ? "Verifying..." : "Verify top-up"}
              </button>
            </form>
          </article>
        </div>

        {walletMessage ? <p className="dashboard-wallet-message">{walletMessage}</p> : null}
        {walletState.status === "error" ? (
          <p className="dashboard-wallet-error">{walletState.message}</p>
        ) : null}

        <article className="dashboard-wallet-transactions">
          <header>
            <h3>Recent wallet transactions</h3>
            <button
              className="action-secondary"
              disabled={walletBusy || walletState.status === "loading"}
              onClick={() => {
                void loadWalletSummary();
              }}
              type="button"
            >
              Refresh
            </button>
          </header>

          {walletState.status === "loading" || walletState.status === "idle" ? (
            <p>Loading wallet transactions...</p>
          ) : transactions.length === 0 ? (
            <p>No wallet transactions yet.</p>
          ) : (
            <ul>
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <div>
                    <strong>{transaction.label}</strong>
                    <p>{formatDate(transaction.transactionDate)}</p>
                  </div>
                  <div className="dashboard-wallet-amount">
                    <span>{transaction.direction}</span>
                    <strong>{formatCurrency(transaction.amount)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    );
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <div className="dashboard-heading-row">
          <div>
            <span className="home-kicker">Reader Dashboard</span>
            <h1>Welcome, {snapshot.user.nickname || snapshot.user.email}</h1>
            <p>Your account hub centralizes wallet, purchases, profile, and notifications.</p>
          </div>
          <Link className="action-secondary" href="/">
            Back to storefront
          </Link>
        </div>

        <nav aria-label="Dashboard sections" className="dashboard-nav">
          {snapshot.sections.map((section) => (
            <Link
              className={
                section.id === activeSection
                  ? "dashboard-nav-link dashboard-nav-link--active"
                  : "dashboard-nav-link"
              }
              href={section.href}
              key={section.id}
            >
              <span>{section.title}</span>
              <small>{section.phaseLabel}</small>
            </Link>
          ))}
        </nav>

        <div className="dashboard-highlight" role="status">
          <strong>{highlighted?.title ?? "Wallet"} focus:</strong>{" "}
          {highlighted?.description ?? "Dashboard section summary"}
        </div>

        {activeSection === "wallet" ? (
          renderWalletSection()
        ) : (
          <div className="dashboard-grid">
            {snapshot.cards.map((card) => (
              <article className="dashboard-module-card" key={card.id}>
                <header>
                  <h2>{card.title}</h2>
                  <span>{card.phaseLabel}</span>
                </header>
                <p className="dashboard-module-value">{card.value}</p>
                <p>{card.subtitle}</p>
                <Link className="action-secondary" href={card.href}>
                  {card.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
