import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", { href, ...props }, children),
}));

const mocks = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  fetchUserWalletTransactions: vi.fn(),
}));

vi.mock("../../../lib/auth/session-store", () => ({
  getSessionToken: mocks.getSessionToken,
}));

vi.mock("../../finance/api", () => ({
  fetchUserWalletTransactions: mocks.fetchUserWalletTransactions,
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
      type: "TOP_UP",
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
      type: "CHAPTER_PURCHASE",
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

function cloneResponse(overrides: Partial<UserWalletTransactionsResponse> = {}) {
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

    await screen.findByText("150.000 Kim Tệ");
    expect(screen.getByText("Gold")).toBeTruthy();
    expect(screen.getByText("VIP #2")).toBeTruthy();
    expect(screen.getByText("250.000")).toBeTruthy();
  });

  it("renders transaction date, signed amount, type, status, description, and SePay text", async () => {
    render(React.createElement(WalletHistoryPage));

    await screen.findByText("+50.000 Kim Tệ");
    expect(screen.getByText("-10.000 Kim Tệ")).toBeTruthy();
    expect(screen.getByText("TOP_UP")).toBeTruthy();
    expect(screen.getAllByText("COMPLETED").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("SP-001")).toBeTruthy();
    expect(screen.getByText("SP-001 / REF-001")).toBeTruthy();
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

    expect(screen.getByText("Đang tải lịch sử ví...")).toBeTruthy();
    await screen.findByText("Bạn chưa có giao dịch ví.");
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
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
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

    await screen.findByText("Page 1 / 2");
    const footer = screen.getByText("Page 1 / 2").closest("footer");
    fireEvent.click(within(footer as HTMLElement).getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(mocks.fetchUserWalletTransactions.mock.calls.some((call) => call[0] === 2)).toBe(true);
    });
  });
});
