"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { type SessionUser } from "../../lib/api/types";
import {
  getSessionToken,
  persistSessionToStorage,
} from "../../lib/auth/session-store";
import { AppContext } from "../../providers/app-provider";
import {
  fetchNovelPricing,
  fetchPurchaseHistory,
  fetchWalletSummary,
  initiateTopUp,
  purchaseNovelCombo,
  verifyTopUp,
  type NovelPricingResponse,
  type PaymentProvider,
  type PurchaseHistoryResponse,
  type WalletSummaryResponse,
} from "../finance/api";
import {
  changePassword,
  fetchProfile,
  updateProfile,
  type ProfileResponse,
} from "../profile/api";
import NotificationsSection from "../notifications/notifications";
import { bootstrapDashboardSession, resolveDashboardSection } from "./api";
import { buildComboPurchaseOutcome, buildPurchasePricingModel } from "./purchase-ui";
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

interface ProfileFormState {
  displayName: string;
  email: string;
  avatar: string;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PurchasePricingFormState {
  novelId: string;
}

interface PurchaseHistoryPaginationState {
  page: number;
  pageSize: number;
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

function toSessionUser(profilePayload: ProfileResponse): SessionUser {
  return {
    id: profilePayload.profile.id,
    email: profilePayload.profile.email,
    nickname: profilePayload.profile.nickname,
    role: profilePayload.profile.role,
  };
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

  const [purchasePricingForm, setPurchasePricingForm] =
    useState<PurchasePricingFormState>({ novelId: "" });
  const [pricingState, setPricingState] = useState<
    | { status: "idle" | "loading" }
    | { status: "ready"; data: NovelPricingResponse }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [comboBusy, setComboBusy] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [purchaseHistoryState, setPurchaseHistoryState] = useState<
    | { status: "idle" | "loading" }
    | { status: "ready"; data: PurchaseHistoryResponse }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [purchaseHistoryPagination, setPurchaseHistoryPagination] =
    useState<PurchaseHistoryPaginationState>({ page: 1, pageSize: 20 });

  const [profileState, setProfileState] = useState<
    | { status: "idle" | "loading" }
    | { status: "ready"; data: ProfileResponse }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    displayName: "",
    email: "",
    avatar: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

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

  const loadNovelPricing = useMemo(
    () => async (novelId: number) => {
      const token = getSessionToken() ?? undefined;
      setPricingState((previous) =>
        previous.status === "ready"
          ? { status: "ready", data: previous.data }
          : { status: "loading" },
      );

      const result = await fetchNovelPricing(novelId, token);
      if (!result.ok) {
        setPricingState({
          status: "error",
          message: result.error.message,
        });
        return false;
      }

      setPricingState({ status: "ready", data: result.data });
      return true;
    },
    [],
  );

  const loadPurchaseHistory = useMemo(
    () => async (
      page = purchaseHistoryPagination.page,
      pageSize = purchaseHistoryPagination.pageSize,
      signal?: AbortSignal,
    ) => {
      const token = getSessionToken() ?? undefined;
      setPurchaseHistoryState((previous) =>
        previous.status === "ready"
          ? { status: "ready", data: previous.data }
          : { status: "loading" },
      );

      const result = await fetchPurchaseHistory(page, pageSize, token, signal);
      if (!result.ok) {
        setPurchaseHistoryState({
          status: "error",
          message: result.error.message,
        });
        return false;
      }

      setPurchaseHistoryPagination({ page: result.data.page, pageSize: result.data.pageSize });
      setPurchaseHistoryState({ status: "ready", data: result.data });
      return true;
    },
    [purchaseHistoryPagination.page, purchaseHistoryPagination.pageSize],
  );

  const loadProfile = useMemo(
    () => async (signal?: AbortSignal) => {
      const token = getSessionToken() ?? undefined;
      setProfileState((previous) =>
        previous.status === "ready"
          ? {
              status: "ready",
              data: previous.data,
            }
          : { status: "loading" },
      );

      const result = await fetchProfile(token, signal);
      if (!result.ok) {
        setProfileState({
          status: "error",
          message: result.error.message,
        });
        return false;
      }

      setProfileState({ status: "ready", data: result.data });
      setProfileForm({
        displayName: result.data.profile.nickname ?? "",
        email: result.data.profile.email,
        avatar: result.data.profile.avatar ?? "",
      });
      return true;
    },
    [],
  );

  useEffect(() => {
    if (viewState.status !== "ready") {
      return;
    }

    if (activeSection === "wallet") {
      const abortController = new AbortController();
      void loadWalletSummary(abortController.signal);
      return () => {
        abortController.abort();
      };
    }

    if (activeSection === "purchases") {
      const abortController = new AbortController();
      void loadWalletSummary(abortController.signal);
      void loadPurchaseHistory(
        purchaseHistoryPagination.page,
        purchaseHistoryPagination.pageSize,
        abortController.signal,
      );
      return () => {
        abortController.abort();
      };
    }

    if (activeSection === "profile") {
      const abortController = new AbortController();
      void loadProfile(abortController.signal);
      return () => {
        abortController.abort();
      };
    }
  }, [
    activeSection,
    loadProfile,
    loadPurchaseHistory,
    loadWalletSummary,
    purchaseHistoryPagination.page,
    purchaseHistoryPagination.pageSize,
    viewState.status,
  ]);

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
    const loadedWallet = await loadWalletSummary();
    if (loadedWallet && result.data.status !== "failed") {
      setPendingTopUp(null);
      setTopUpForm({ ...DEFAULT_TOP_UP_FORM, reference: "" });
      setVerifyForm(DEFAULT_VERIFY_FORM);
    }
  }

  async function onLoadPricingSummary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const novelId = Number(purchasePricingForm.novelId);
    if (!Number.isInteger(novelId) || novelId <= 0) {
      setPurchaseMessage("Enter a valid novel ID.");
      return;
    }

    setPurchaseMessage(null);
    await loadNovelPricing(novelId);
  }

  async function onPurchaseHistoryPageChange(nextPage: number) {
    if (nextPage <= 0) {
      return;
    }

    const totalPages =
      purchaseHistoryState.status === "ready" ? purchaseHistoryState.data.totalPages : 1;

    if (nextPage > totalPages) {
      return;
    }

    setPurchaseHistoryPagination((current) => ({ ...current, page: nextPage }));
    await loadPurchaseHistory(nextPage, purchaseHistoryPagination.pageSize);
  }

  async function onExecuteComboPurchase() {
    if (pricingState.status !== "ready") {
      setPurchaseMessage("Load pricing summary before purchasing combo.");
      return;
    }

    setComboBusy(true);
    setPurchaseMessage(null);

    const token = getSessionToken() ?? undefined;
    const result = await purchaseNovelCombo(pricingState.data.novelId, token);

    setComboBusy(false);

    if (!result.ok) {
      setPurchaseMessage(result.error.message);
      return;
    }

    const outcome = buildComboPurchaseOutcome(result.data, formatCurrency);
    setPurchaseMessage(outcome.message);

    if (outcome.refreshWallet) {
      void loadWalletSummary();
    }

    if (outcome.refreshPricing) {
      void loadNovelPricing(pricingState.data.novelId);
    }
  }
  async function onSubmitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage(null);

    const token = getSessionToken() ?? undefined;
    const result = await updateProfile(
      {
        displayName: profileForm.displayName,
        email: profileForm.email,
        avatar: profileForm.avatar,
      },
      token,
    );

    setProfileBusy(false);
    if (!result.ok) {
      setProfileMessage(result.error.message);
      return;
    }

    setProfileState({ status: "ready", data: result.data });
    setProfileForm({
      displayName: result.data.profile.nickname ?? "",
      email: result.data.profile.email,
      avatar: result.data.profile.avatar ?? "",
    });

    const sessionUser = toSessionUser(result.data);
    persistSessionToStorage(sessionUser);
    setUser(sessionUser);
    setViewState((previous) =>
      previous.status === "ready"
        ? {
            status: "ready",
            snapshot: {
              ...previous.snapshot,
              user: sessionUser,
            },
          }
        : previous,
    );

    setProfileMessage("Profile saved successfully.");
  }


  async function onSubmitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordForm.currentPassword) {
      setPasswordMessage("Current password is required.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }

    setPasswordBusy(true);
    setPasswordMessage(null);

    const token = getSessionToken() ?? undefined;
    const result = await changePassword(
      {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
      token,
    );

    setPasswordBusy(false);
    if (!result.ok) {
      setPasswordMessage(result.error.message);
      return;
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordMessage("Password updated successfully.");
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
          <article className="dashboard-wallet-card dashboard-wallet-card--vip">
            <h3>Current VIP tier</h3>
            <p>
              {walletState.status === "ready" && walletState.data.vipTier
                ? walletState.data.vipTier.name
                : "No tier yet"}
            </p>
            <span>
              {walletState.status === "ready" && walletState.data.vipTier
                ? "Unlock threshold " + formatCurrency(walletState.data.vipTier.vndValue)
                : "Keep topping up to unlock tier benefits"}
            </span>
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

  function renderPurchasesSection() {
    const purchaseSummary =
      walletState.status === "ready" ? walletState.data.purchaseSummary : null;

    const recentPurchaseActions =
      purchaseSummary?.recentActions ??
      (purchaseHistoryState.status === "ready" ? purchaseHistoryState.data.total : 0);
    const totalSpent =
      purchaseSummary?.recentSpent ??
      (purchaseHistoryState.status === "ready"
        ? purchaseHistoryState.data.items.reduce((sum, item) => sum + item.pricePaid, 0)
        : 0);
    const pricing = pricingState.status === "ready" ? pricingState.data : null;
    const pricingDisplay = pricing ? buildPurchasePricingModel(pricing, formatCurrency) : null;
    const purchaseReady = purchaseHistoryState.status === "ready" ? purchaseHistoryState.data : null;
    const purchaseRows = purchaseReady?.items ?? [];

    return (
      <section className="dashboard-purchases" aria-label="Purchases section">
        <div className="dashboard-purchases-grid">
          <article className="dashboard-purchases-card">
            <h3>Recent purchase actions</h3>
            <p>{recentPurchaseActions}</p>
            <span>Includes imported chapter unlock history and recent wallet purchase ledger actions.</span>
          </article>
          <article className="dashboard-purchases-card">
            <h3>Total spent (recent)</h3>
            <p>{formatCurrency(totalSpent)}</p>
            <span>Calculated from latest purchase transactions and imported chapter history.</span>
          </article>
        </div>

        <article className="dashboard-purchases-pricing">
          <header>
            <h3>Novel pricing summary</h3>
            <p>
              Load pricing to inspect free chapter thresholds, chapter-level overrides,
              and combo discount before purchasing.
            </p>
          </header>

          <form className="dashboard-purchases-pricing-form" onSubmit={onLoadPricingSummary}>
            <label>
              Novel ID
              <input
                type="number"
                min={1}
                value={purchasePricingForm.novelId}
                onChange={(event) => setPurchasePricingForm({ novelId: event.target.value })}
                placeholder="Enter novel id"
                required
              />
            </label>
            <button className="action-primary" type="submit" disabled={pricingState.status === "loading"}>
              {pricingState.status === "loading" ? "Loading..." : "Load pricing"}
            </button>
          </form>

          {pricingState.status === "error" ? (
            <p className="dashboard-wallet-error">{pricingState.message}</p>
          ) : null}

          {pricingDisplay ? (
            <div className="dashboard-pricing-summary">
              <div className="dashboard-pricing-metrics">
                <article>
                  <h4>Default chapter price</h4>
                  <p>{pricingDisplay.defaultChapterPriceLabel}</p>
                </article>
                <article>
                  <h4>Free chapters</h4>
                  <p>{pricingDisplay.freeChapterCountLabel}</p>
                </article>
                <article>
                  <h4>Combo discount</h4>
                  <p>{pricingDisplay.comboDiscountLabel}</p>
                </article>
                <article>
                  <h4>Combo payable</h4>
                  <p>{pricingDisplay.discountedTotalLabel}</p>
                </article>
              </div>

              <p className="dashboard-pricing-note">
                Locked chapters: {pricingDisplay.lockedChapterCount}. Original total {" "}
                {pricingDisplay.originalTotalLabel}.
                {pricingDisplay.hasZeroPayable ? " Zero payable amount detected." : ""}
              </p>

              <div className="dashboard-purchases-actions">
                <button className="action-primary" type="button" disabled={comboBusy} onClick={onExecuteComboPurchase}>
                  {comboBusy ? "Processing combo..." : "Purchase combo unlock"}
                </button>
                <Link className="action-secondary" href="/dashboard?section=wallet">
                  Top up wallet
                </Link>
              </div>
            </div>
          ) : (
            <p className="dashboard-pricing-note">No pricing loaded yet.</p>
          )}

          {purchaseMessage ? <p className="dashboard-wallet-message">{purchaseMessage}</p> : null}
        </article>

        <article className="dashboard-purchases-list">
          <header>
            <h3>Purchased chapter history</h3>
            <button
              className="action-secondary"
              type="button"
              onClick={() => {
                void loadPurchaseHistory(
                  purchaseHistoryPagination.page,
                  purchaseHistoryPagination.pageSize,
                );
              }}
              disabled={purchaseHistoryState.status === "loading"}
            >
              Refresh
            </button>
          </header>

          {purchaseHistoryState.status === "loading" || purchaseHistoryState.status === "idle" ? (
            <p>Loading purchase history...</p>
          ) : purchaseHistoryState.status === "error" ? (
            <p className="dashboard-wallet-error">{purchaseHistoryState.message}</p>
          ) : purchaseRows.length === 0 ? (
            <p>No purchased chapters yet. Unlock chapters in reader and check back here.</p>
          ) : (
            <>
              <div className="dashboard-purchase-history-table-wrap">
                <table className="dashboard-purchase-history-table">
                  <thead>
                    <tr>
                      <th>Chapter</th>
                      <th>Novel</th>
                      <th>Author</th>
                      <th>Purchased at</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Reader</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRows.map((item) => (
                      <tr key={item.purchasedChapterId}>
                        <td>{item.chapterTitle}</td>
                        <td>{item.novelTitle}</td>
                        <td>{item.authorDisplayName}</td>
                        <td>{formatDate(item.purchasedAt)}</td>
                        <td>{formatCurrency(item.pricePaid)}</td>
                        <td>
                          <span
                            className={
                              item.unlockStatus === "UNLOCKED"
                                ? "dashboard-history-status dashboard-history-status--ok"
                                : "dashboard-history-status dashboard-history-status--warn"
                            }
                          >
                            {item.unlockStatus}
                          </span>
                        </td>
                        <td>
                          {item.unlockStatus === "UNLOCKED" ? (
                            <Link
                              className="action-secondary"
                              href={"/reader/chapters/" + item.chapterId + "?novelId=" + item.novelId}
                            >
                              Open chapter
                            </Link>
                          ) : (
                            <span>Unavailable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="dashboard-history-pagination">
                <button
                  className="action-secondary"
                  disabled={purchaseHistoryPagination.page <= 1}
                  onClick={() => {
                    void onPurchaseHistoryPageChange(purchaseHistoryPagination.page - 1);
                  }}
                  type="button"
                >
                  Previous
                </button>
                <p>
                  Page {purchaseHistoryPagination.page} / {purchaseReady?.totalPages ?? 1}
                </p>
                <button
                  className="action-secondary"
                  disabled={
                    purchaseHistoryPagination.page >= (purchaseReady?.totalPages ?? 1)
                  }
                  onClick={() => {
                    void onPurchaseHistoryPageChange(purchaseHistoryPagination.page + 1);
                  }}
                  type="button"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </article>
      </section>
    );
  }
  function renderProfileSection() {
    const profileReady = profileState.status === "ready" ? profileState.data : null;

    return (
      <section className="dashboard-profile" aria-label="Profile section">
        <div className="dashboard-profile-grid">
          <article className="dashboard-profile-card">
            <h3>Profile settings</h3>
            <p>Update display name and account email used across dashboard and reader flows.</p>
            <form onSubmit={onSubmitProfile}>
              <label>
                Display name
                <input
                  maxLength={40}
                  minLength={2}
                  name="displayName"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="Enter display name"
                  value={profileForm.displayName}
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="reader@example.com"
                  type="email"
                  value={profileForm.email}
                />
              </label>

              <label>
                Avatar metadata
                <input
                  maxLength={255}
                  name="avatar"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      avatar: event.target.value,
                    }))
                  }
                  placeholder="https://... or external avatar id"
                  value={profileForm.avatar}
                />
              </label>

              <button className="action-primary" disabled={profileBusy} type="submit">
                {profileBusy ? "Saving..." : "Save profile"}
              </button>
            </form>

            {profileMessage ? <p className="dashboard-profile-message">{profileMessage}</p> : null}
            {profileState.status === "error" ? (
              <p className="dashboard-profile-error">{profileState.message}</p>
            ) : null}
          </article>

          <article className="dashboard-profile-card dashboard-profile-card--security">
            <h3>Password security</h3>
            <p>Change password securely using your current password and a strong replacement.</p>
            <form onSubmit={onSubmitPassword}>
              <label>
                Current password
                <input
                  autoComplete="current-password"
                  name="currentPassword"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  placeholder="Current password"
                  type="password"
                  value={passwordForm.currentPassword}
                />
              </label>

              <label>
                New password
                <input
                  autoComplete="new-password"
                  name="newPassword"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder="New password"
                  type="password"
                  value={passwordForm.newPassword}
                />
              </label>

              <label>
                Confirm new password
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Confirm new password"
                  type="password"
                  value={passwordForm.confirmPassword}
                />
              </label>

              <button className="action-primary" disabled={passwordBusy} type="submit">
                {passwordBusy ? "Updating..." : "Change password"}
              </button>
            </form>
            {passwordMessage ? <p className="dashboard-profile-message">{passwordMessage}</p> : null}
          </article>

          <article className="dashboard-profile-card dashboard-profile-card--details">
            <h3>Identity and session details</h3>
            {profileState.status === "loading" || profileState.status === "idle" ? (
              <p>Loading profile details...</p>
            ) : profileState.status === "error" ? (
              <p>Unable to load profile details.</p>
            ) : (
              <dl className="dashboard-profile-details">
                <div>
                  <dt>User ID</dt>
                  <dd>{profileReady?.profile.id}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{profileReady?.profile.email}</dd>
                </div>
                <div>
                  <dt>Display name</dt>
                  <dd>{profileReady?.profile.nickname || "(not set)"}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{profileReady?.profile.role}</dd>
                </div>
                <div>
                  <dt>Token source</dt>
                  <dd>{profileReady?.session.tokenSource}</dd>
                </div>
                <div>
                  <dt>Last profile update</dt>
                  <dd>{profileReady ? formatDate(profileReady.profile.updatedAt) : "Unknown"}</dd>
                </div>
              </dl>
            )}

            <button
              className="action-secondary"
              disabled={profileBusy || profileState.status === "loading"}
              onClick={() => {
                void loadProfile();
              }}
              type="button"
            >
              Refresh profile
            </button>
          </article>
        </div>
      </section>
    );
  }

  function renderNotificationsSection() {
    return (
      <section className="dashboard-notifications" aria-label="Notifications section">
        <NotificationsSection />
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
        ) : activeSection === "purchases" ? (
          renderPurchasesSection()
        ) : activeSection === "profile" ? (
          renderProfileSection()
        ) : activeSection === "notifications" ? (
          renderNotificationsSection()
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
