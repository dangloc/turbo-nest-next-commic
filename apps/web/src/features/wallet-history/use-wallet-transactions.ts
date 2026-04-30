"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSessionToken } from "../../lib/auth/session-store";
import { fetchUserWalletTransactions } from "../finance/api";
import type {
  UserWalletHistorySummary,
  UserWalletTransactionRow,
} from "../finance/types";

type WalletTransactionsStatus = "unauthenticated" | "loading" | "ready" | "error";

const EMPTY_SUMMARY: UserWalletHistorySummary = {
  balance: 0,
  kimTe: 0,
  vipLevelId: null,
  vipLevelName: null,
};

export function useWalletTransactions(initialPage = 1, initialPageSize = 20) {
  const [page, setPage] = useState(Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1);
  const [pageSize, setPageSize] = useState(
    Number.isInteger(initialPageSize) && initialPageSize > 0 ? initialPageSize : 20,
  );
  const [summary, setSummary] = useState<UserWalletHistorySummary>(EMPTY_SUMMARY);
  const [items, setItems] = useState<UserWalletTransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<WalletTransactionsStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const token = getSessionToken();

    if (!token) {
      setStatus("unauthenticated");
      setError(null);
      setSummary(EMPTY_SUMMARY);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }

    const sessionToken = token;
    const controller = new AbortController();

    async function run() {
      setStatus((current) => (current === "ready" ? current : "loading"));
      setError(null);

      const result = await fetchUserWalletTransactions(page, pageSize, sessionToken, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setStatus("error");
        setError(result.error.message || "Không thể tải lịch sử ví.");
        return;
      }

      setSummary(result.data.summary);
      setItems(result.data.items);
      setPage(result.data.page);
      setPageSize(result.data.pageSize);
      setTotal(result.data.total);
      setTotalPages(Math.max(1, result.data.totalPages));
      setStatus("ready");
    }

    run();

    return () => {
      controller.abort();
    };
  }, [page, pageSize, refreshTick]);

  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;

  const previousPage = useCallback(() => {
    setPage((value) => Math.max(1, value - 1));
  }, []);

  const nextPage = useCallback(() => {
    setPage((value) => value + 1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((value) => value + 1);
  }, []);

  return useMemo(
    () => ({
      status,
      summary,
      items,
      page,
      pageSize,
      total,
      totalPages,
      canPreviousPage,
      canNextPage,
      previousPage,
      nextPage,
      refresh,
      error,
    }),
    [
      canNextPage,
      canPreviousPage,
      error,
      items,
      nextPage,
      page,
      pageSize,
      previousPage,
      refresh,
      status,
      summary,
      total,
      totalPages,
    ],
  );
}
