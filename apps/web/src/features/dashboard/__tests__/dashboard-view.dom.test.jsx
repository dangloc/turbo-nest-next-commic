import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) =>
    React.createElement("a", { href, ...props }, children),
}));

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ toString: () => "section=purchases" }),
}));

const bootstrapDashboardSessionMock = vi.fn();
const resolveDashboardSectionMock = vi.fn();
vi.mock("../api", () => ({
  bootstrapDashboardSession: (...args) => bootstrapDashboardSessionMock(...args),
  resolveDashboardSection: (...args) => resolveDashboardSectionMock(...args),
}));

const fetchWalletSummaryMock = vi.fn();
const fetchNovelPricingMock = vi.fn();
const purchaseNovelComboMock = vi.fn();
const fetchPurchaseHistoryMock = vi.fn();
const fetchComboPurchaseHistoryMock = vi.fn();
vi.mock("../../finance/api", async () => {
  const actual = await vi.importActual("../../finance/api");
  return {
    ...actual,
    fetchWalletSummary: (...args) => fetchWalletSummaryMock(...args),
    fetchNovelPricing: (...args) => fetchNovelPricingMock(...args),
    purchaseNovelCombo: (...args) => purchaseNovelComboMock(...args),
    fetchPurchaseHistory: (...args) => fetchPurchaseHistoryMock(...args),
    fetchComboPurchaseHistory: (...args) => fetchComboPurchaseHistoryMock(...args),
    initiateTopUp: vi.fn(),
    verifyTopUp: vi.fn(),
  };
});

vi.mock("../../profile/api", () => ({
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock("../../lib/auth/session-store", () => ({
  getSessionToken: () => "token-1",
  persistSessionToStorage: vi.fn(),
}));

vi.mock("../notifications/notifications", () => ({
  default: () => React.createElement("div", null, "Notifications"),
}));

import { DashboardView } from "../dashboard";
import { AppContext } from "../../../providers/app-provider";

function renderDashboard() {
  return render(
    React.createElement(
      AppContext.Provider,
      {
        value: {
          loaded: true,
          user: {
            id: 1,
            email: "u@example.com",
            nickname: "Reader",
            role: "USER",
          },
          setUser: vi.fn(),
          setToken: vi.fn(),
          setLoaded: vi.fn(),
        },
      },
      React.createElement(DashboardView),
    ),
  );
}

function pricingFixture() {
  return {
    novelId: 77,
    uploaderId: 88,
    settings: {
      defaultChapterPrice: 15000,
      freeChapterCount: 2,
      comboDiscountPct: 25,
    },
    combo: {
      lockedChapterCount: 2,
      originalTotalPrice: 35000,
      discountedTotalPrice: 26250,
    },
    chapters: [
      {
        id: 1,
        title: "Ch 1",
        chapterNumber: 1,
        isLocked: false,
        effectivePrice: 0,
        priceSource: "novel_default",
      },
      {
        id: 3,
        title: "Ch 3",
        chapterNumber: 3,
        isLocked: true,
        effectivePrice: 25000,
        priceSource: "chapter_override",
      },
    ],
  };
}

describe("DashboardView purchases DOM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveDashboardSectionMock.mockReturnValue("purchases");
    bootstrapDashboardSessionMock.mockResolvedValue({
      kind: "ready",
      snapshot: {
        user: {
          id: 1,
          email: "u@example.com",
          nickname: "Reader",
          role: "USER",
        },
        sections: [
          {
            id: "purchases",
            title: "Purchases",
            description: "Track purchases",
            href: "/dashboard?section=purchases",
            phaseLabel: "Phase 25",
          },
        ],
        cards: [],
      },
    });

    fetchWalletSummaryMock.mockResolvedValue({
      ok: true,
      data: {
        balances: {
          depositedBalance: 120000,
          earnedBalance: 0,
          totalDeposited: 120000,
        },
        transactions: [],
      },
    });

    fetchPurchaseHistoryMock.mockResolvedValue({
      ok: true,
      data: {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1,
      },
    });

    fetchComboPurchaseHistoryMock.mockResolvedValue({
      ok: true,
      data: {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders pricing summary and combo UI from loaded pricing state", async () => {
    fetchNovelPricingMock.mockResolvedValue({ ok: true, data: pricingFixture() });

    const view = renderDashboard();
    const ui = within(view.container);

    const novelInput = await ui.findByPlaceholderText("Enter novel id");
    fireEvent.change(novelInput, { target: { value: "77" } });
    fireEvent.click(ui.getByRole("button", { name: "Load pricing" }));

    await ui.findByText("Default chapter price");
    expect(ui.getByText("2 free chapters")).toBeTruthy();
    expect(ui.getByText("25%")).toBeTruthy();
    expect(ui.getByText("Per-chapter override")).toBeTruthy();
    expect(ui.getByRole("button", { name: "Purchase combo unlock" })).toBeTruthy();
  });

  it("clicking combo purchase triggers API call and refresh transitions", async () => {
    fetchNovelPricingMock.mockResolvedValue({ ok: true, data: pricingFixture() });
    purchaseNovelComboMock.mockResolvedValue({
      ok: true,
      data: {
        status: "purchased",
        novelId: 77,
        purchasedChapterCount: 2,
        chargedAmount: 26250,
      },
    });

    const view = renderDashboard();
    const ui = within(view.container);

    const novelInput = await ui.findByPlaceholderText("Enter novel id");
    fireEvent.change(novelInput, { target: { value: "77" } });
    fireEvent.click(ui.getByRole("button", { name: "Load pricing" }));
    await ui.findByRole("button", { name: "Purchase combo unlock" });

    const walletCallsBefore = fetchWalletSummaryMock.mock.calls.length;
    const pricingCallsBefore = fetchNovelPricingMock.mock.calls.length;

    fireEvent.click(ui.getByRole("button", { name: "Purchase combo unlock" }));

    await waitFor(() => {
      expect(purchaseNovelComboMock).toHaveBeenCalled();
      expect(purchaseNovelComboMock.mock.calls.at(-1)?.[0]).toBe(77);
    });

    await waitFor(() => {
      expect(fetchWalletSummaryMock.mock.calls.length).toBeGreaterThan(walletCallsBefore);
      expect(fetchNovelPricingMock.mock.calls.length).toBeGreaterThan(pricingCallsBefore);
    });

    const successMessage = view.container.querySelector(".dashboard-wallet-message");
    expect(successMessage?.textContent || "").toContain("Combo purchase successful");
    expect(successMessage?.textContent || "").toContain("unlocked 2 chapter(s).");
  });

  it("shows insufficient balance feedback without triggering refresh", async () => {
    fetchNovelPricingMock.mockResolvedValue({ ok: true, data: pricingFixture() });
    purchaseNovelComboMock.mockResolvedValue({
      ok: true,
      data: {
        status: "insufficient_balance",
        novelId: 77,
        purchasedChapterCount: 0,
        chargedAmount: 0,
      },
    });

    const view = renderDashboard();
    const ui = within(view.container);

    const novelInput = await ui.findByPlaceholderText("Enter novel id");
    fireEvent.change(novelInput, { target: { value: "77" } });
    fireEvent.click(ui.getByRole("button", { name: "Load pricing" }));
    await ui.findByRole("button", { name: "Purchase combo unlock" });

    const walletCallsBefore = fetchWalletSummaryMock.mock.calls.length;
    const pricingCallsBefore = fetchNovelPricingMock.mock.calls.length;

    fireEvent.click(ui.getByRole("button", { name: "Purchase combo unlock" }));

    await ui.findByText(
      "Insufficient deposited balance for this combo total. Top up wallet and try again.",
    );

    expect(fetchWalletSummaryMock.mock.calls.length).toBe(walletCallsBefore);
    expect(fetchNovelPricingMock.mock.calls.length).toBe(pricingCallsBefore);
  });
});
