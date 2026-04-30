import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { WalletsTable } from "../wallets-table";

const refreshMock = vi.fn();

vi.mock("@/features/admin-wallets/use-admin-wallet-transactions", () => ({
  useAdminWalletTransactions: () => ({
    items: [
      {
        transactionId: 1,
        transactionDate: "2026-04-25T07:30:00.000Z",
        username: "alice",
        amountIn: 120000,
        type: "DEPOSIT",
        sepayCode: "sp-2026-01",
        referenceCode: "ref-01",
        gateway: "SePay",
        currentBalance: 250000,
        vipLevelName: "Gold",
      },
    ],
    summary: {
      totalRevenue: 500000,
      totalUsersWithBalance: 7,
      totalTransactions: 12,
    },
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
    search: "",
    isLoading: false,
    error: null,
    canPreviousPage: false,
    canNextPage: false,
    setSearch: vi.fn(),
    previousPage: vi.fn(),
    nextPage: vi.fn(),
    refresh: refreshMock,
  }),
}));

import WalletsPage from "../../../../app/(admin)/dashboard/wallets/page";

afterEach(() => {
  cleanup();
  refreshMock.mockClear();
});

describe("Admin wallets live table DOM", () => {
  it("renders required live columns and transaction row values", () => {
    render(
      <WalletsTable
        items={[
          {
            transactionId: 1,
            transactionDate: "2026-04-25T07:30:00.000Z",
            username: "alice",
            amountIn: 120000,
            type: "DEPOSIT",
            sepayCode: "sp-2026-01",
            referenceCode: "ref-01",
            gateway: "SePay",
            currentBalance: 250000,
            vipLevelName: "Gold",
          },
        ]}
        search=""
        isLoading={false}
        error={null}
        page={1}
        pageSize={20}
        total={1}
        canPreviousPage={false}
        canNextPage={false}
        onSearchChange={vi.fn()}
        onPreviousPage={vi.fn()}
        onNextPage={vi.fn()}
      />,
    );

    expect(screen.getByText("Thời gian")).toBeTruthy();
    expect(screen.getByText("User")).toBeTruthy();
    expect(screen.getByText("Số tiền nạp")).toBeTruthy();
    expect(screen.getByText("Mã SePay")).toBeTruthy();
    expect(screen.getByText("Số dư hiện tại")).toBeTruthy();
    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("sp-2026-01")).toBeTruthy();
  });

  it("renders live summary metrics on wallet page", () => {
    render(<WalletsPage />);

    expect(screen.getByTestId("wallet-total-revenue").textContent).toContain("500.000");
    expect(screen.getByTestId("wallet-total-users-with-balance").textContent).toBe("7");
  });

  it("refresh button triggers hook refresh without full page reload", () => {
    render(<WalletsPage />);

    fireEvent.click(screen.getByRole("button", { name: /^làm mới$/i }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
