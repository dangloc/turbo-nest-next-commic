import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
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
vi.mock("../../finance/api", async () => {
  const actual = await vi.importActual("../../finance/api");
  return {
    ...actual,
    fetchWalletSummary: (...args) => fetchWalletSummaryMock(...args),
    fetchNovelPricing: (...args) => fetchNovelPricingMock(...args),
    purchaseNovelCombo: (...args) => purchaseNovelComboMock(...args),
    fetchPurchaseHistory: (...args) => fetchPurchaseHistoryMock(...args),
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
            email: "reader@example.com",
            nickname: "Reader",
            role: "USER",
          },
          setUser: vi.fn(),
        },
      },
      React.createElement(DashboardView),
    ),
  );
}

describe("Dashboard wallet purchase history DOM", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    resolveDashboardSectionMock.mockReturnValue("purchases");
    bootstrapDashboardSessionMock.mockResolvedValue({
      kind: "ready",
      snapshot: {
        user: {
          id: 1,
          email: "reader@example.com",
          nickname: "Reader",
          role: "USER",
        },
        sections: [
          {
            id: "purchases",
            title: "Purchases",
            description: "Track purchases",
            href: "/dashboard?section=purchases",
            phaseLabel: "Phase 37",
          },
        ],
        cards: [],
      },
    });

    fetchWalletSummaryMock.mockResolvedValue({
      ok: true,
      data: {
        balances: {
          depositedBalance: 150000,
          earnedBalance: 10000,
          totalDeposited: 220000,
        },
        purchaseSummary: {
          recentActions: 5,
          recentSpent: 89000,
        },
        vipTier: {
          id: 2,
          name: "Silver",
          vndValue: 120000,
          colorCode: "#cccccc",
          iconUrl: null,
        },
        transactions: [],
      },
    });

    fetchPurchaseHistoryMock.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            purchasedChapterId: 1001,
            chapterId: 99,
            chapterTitle: "Episode 99",
            novelId: 50,
            novelTitle: "Legacy Saga",
            authorId: 7,
            authorDisplayName: "Author Seven",
            purchasedAt: "2026-04-12T10:00:00.000Z",
            pricePaid: 15000,
            unlockStatus: "UNLOCKED",
          },
        ],
        page: 1,
        pageSize: 20,
        total: 101,
        totalPages: 6,
      },
    });

    fetchNovelPricingMock.mockResolvedValue({
      ok: true,
      data: {
        novelId: 50,
        uploaderId: 7,
        settings: {
          defaultChapterPrice: 15000,
          freeChapterCount: 2,
          comboDiscountPct: 10,
        },
        combo: {
          lockedChapterCount: 10,
          originalTotalPrice: 150000,
          discountedTotalPrice: 135000,
        },
        chapters: [],
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders purchase-history metadata rows and reader links", async () => {
    const view = renderDashboard();
    const ui = within(view.container);

    await ui.findByText("Purchased chapter history");
    await ui.findByText("Episode 99");
    expect(ui.getByText("Legacy Saga")).toBeTruthy();
    expect(ui.getByText("Author Seven")).toBeTruthy();
    expect(ui.getByText("UNLOCKED")).toBeTruthy();
    expect(ui.getByRole("link", { name: "Open chapter" }).getAttribute("href")).toContain(
      "/reader/chapters/99?novelId=50",
    );
  });

  it("supports pagination controls for large history", async () => {
    fetchPurchaseHistoryMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            {
              purchasedChapterId: 1001,
              chapterId: 99,
              chapterTitle: "Episode 99",
              novelId: 50,
              novelTitle: "Legacy Saga",
              authorId: 7,
              authorDisplayName: "Author Seven",
              purchasedAt: "2026-04-12T10:00:00.000Z",
              pricePaid: 15000,
              unlockStatus: "UNLOCKED",
            },
          ],
          page: 1,
          pageSize: 20,
          total: 101,
          totalPages: 6,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            {
              purchasedChapterId: 1002,
              chapterId: 100,
              chapterTitle: "Episode 100",
              novelId: 50,
              novelTitle: "Legacy Saga",
              authorId: 7,
              authorDisplayName: "Author Seven",
              purchasedAt: "2026-04-12T11:00:00.000Z",
              pricePaid: 12000,
              unlockStatus: "UNLOCKED",
            },
          ],
          page: 2,
          pageSize: 20,
          total: 101,
          totalPages: 6,
        },
      });

    const view = renderDashboard();
    const ui = within(view.container);

    await ui.findByText("Page 1 / 6");
    fireEvent.click(ui.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(fetchPurchaseHistoryMock.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(fetchPurchaseHistoryMock.mock.calls.some((call) => call[0] === 2)).toBe(true);
    });

  });

  it("shows vip tier threshold in wallet section", async () => {
    resolveDashboardSectionMock.mockReturnValue("wallet");

    const view = renderDashboard();
    const ui = within(view.container);

    await ui.findByText("Current VIP tier");
    expect(ui.getByText("Silver")).toBeTruthy();
    expect(ui.getByText(/Unlock threshold/)).toBeTruthy();
  });
});
