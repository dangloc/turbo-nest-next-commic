import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/transactions",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mocks = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  clearSessionStorage: vi.fn(),
  fetchUserWalletTransactions: vi.fn(),
  fetchProfile: vi.fn(),
  logoutSession: vi.fn(),
}));

vi.mock("../../../lib/auth/session-store", () => ({
  getSessionToken: mocks.getSessionToken,
  clearSessionStorage: mocks.clearSessionStorage,
}));

vi.mock("../../finance/api", () => ({
  fetchUserWalletTransactions: mocks.fetchUserWalletTransactions,
}));

vi.mock("../../profile/api", () => ({
  fetchProfile: mocks.fetchProfile,
}));

vi.mock("../../../lib/auth/api", () => ({
  logoutSession: mocks.logoutSession,
}));

import { WalletHistoryPage } from "../wallet-history-page";
import type { UserWalletTransactionsResponse } from "../../finance/types";

const readyResponse: UserWalletTransactionsResponse = {
  summary: {
    balance: 250000,
    kimTe: 150000,
    vipLevelId: 2,
    vipLevelName: "Gold",
  },
  items: [
    {
      transactionId: 1,
      transactionDate: new Date(2026, 3, 25, 7, 30, 0),
      amountIn: 50000,
      amountOut: 0,
      amount: 50000,
      direction: "CREDIT",
      type: "DEPOSIT",
      status: "COMPLETED",
      description: null,
      sepayCode: "SP-001",
      referenceCode: "REF-001",
      gateway: "SePay",
      balanceAfter: 200000,
    },
    {
      transactionId: 2,
      transactionDate: new Date(2026, 3, 26, 8, 0, 0),
      amountIn: 0,
      amountOut: 10000,
      amount: -10000,
      direction: "DEBIT",
      type: "PURCHASE_CHAPTER",
      status: "COMPLETED",
      description: "Chapter purchase",
      sepayCode: null,
      referenceCode: null,
      gateway: "Internal",
      balanceAfter: 190000,
    },
  ],
  page: 1,
  pageSize: 20,
  total: 40,
  totalPages: 2,
};

function cloneResponse(
  overrides: Partial<UserWalletTransactionsResponse> = {},
) {
  return {
    ...readyResponse,
    ...overrides,
    summary: {
      ...readyResponse.summary,
      ...overrides.summary,
    },
  };
}

describe("WalletHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionToken.mockReturnValue("token-1");
    mocks.fetchProfile.mockResolvedValue({
      ok: true,
      data: {
        profile: {
          id: 1,
          email: "reader@example.com",
          nickname: "Reader",
          avatar: null,
          role: "USER",
          updatedAt: "2026-04-28T00:00:00.000Z",
        },
        session: {
          tokenSource: "bearer",
        },
      },
    });
    mocks.fetchUserWalletTransactions.mockResolvedValue({
      ok: true,
      data: readyResponse,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders authenticated Kim Te summary and VIP label", async () => {
    render(React.createElement(WalletHistoryPage));

    await screen.findByText(/150.000/);
    expect(screen.getByText("Gold")).toBeTruthy();
    expect(screen.getByText("VIP #2")).toBeTruthy();
    expect(screen.getAllByText(/250.000/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders transaction date, signed amount, label, description, and SePay text", async () => {
    render(React.createElement(WalletHistoryPage));

    const creditAmount = await screen.findByText(/\+50.000/);
    const debitAmount = screen.getByText(/-10.000/);
    expect(creditAmount.className).toContain("text-green-600");
    expect(debitAmount.className).toContain("text-red-600");
    expect(screen.getByText("Nạp Kim Tệ")).toBeTruthy();
    expect(screen.getByText("Mua chương")).toBeTruthy();
    expect(screen.getByText("SP-001")).toBeTruthy();
    expect(screen.getByText("Chapter purchase")).toBeTruthy();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThanOrEqual(2);
  });

  it("shows loading and then empty response text", async () => {
    mocks.fetchUserWalletTransactions.mockResolvedValueOnce({
      ok: true,
      data: cloneResponse({
        items: [],
        total: 0,
        totalPages: 1,
      }),
    });

    render(React.createElement(WalletHistoryPage));

    expect(screen.getByText("Đang tải lịch sử giao dịch...")).toBeTruthy();
    await screen.findByText("Chưa có giao dịch Kim Tệ.");
  });

  it("shows API failure as an error state", async () => {
    mocks.fetchUserWalletTransactions.mockResolvedValueOnce({
      ok: false,
      error: {
        status: 500,
        message: "Backend unavailable",
      },
    });

    render(React.createElement(WalletHistoryPage));

    await screen.findByText("Backend unavailable");
  });

  it("shows login CTA when the token is missing", async () => {
    mocks.getSessionToken.mockReturnValue(null);

    render(React.createElement(WalletHistoryPage));

    const loginLink = await screen.findByRole("link", { name: "Đăng nhập" });
    expect(loginLink.getAttribute("href")).toBe("/auth/login");
    expect(mocks.fetchUserWalletTransactions).not.toHaveBeenCalled();
  });

  it("clicking Next calls the API for page 2", async () => {
    mocks.fetchUserWalletTransactions
      .mockResolvedValueOnce({
        ok: true,
        data: readyResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        data: cloneResponse({
          items: [],
          page: 2,
          total: 40,
          totalPages: 2,
        }),
      });

    render(React.createElement(WalletHistoryPage));

    const pageLabels = await screen.findAllByText("Trang 1 / 2");
    const pagination = pageLabels[0]?.closest(".profile-pagination");
    expect(pagination).toBeTruthy();
    fireEvent.click(
      within(pagination as HTMLElement).getByRole("button", { name: "Tiếp" }),
    );

    await waitFor(() => {
      expect(
        mocks.fetchUserWalletTransactions.mock.calls.some(
          (call) => call[0] === 2,
        ),
      ).toBe(true);
    });
  });
});
