"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminWalletTransactions } from "./api";
import type {
  AdminWalletTransactionRow,
  AdminWalletTransactionsQuery,
  AdminWalletTransactionsSummary,
} from "./types";

const EMPTY_SUMMARY: AdminWalletTransactionsSummary = {
  totalRevenue: 0,
  totalUsersWithBalance: 0,
  totalTransactions: 0,
};

export function useAdminWalletTransactions(
  initialQuery?: AdminWalletTransactionsQuery,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [page, setPage] = useState(initialQuery?.page && initialQuery.page > 0 ? initialQuery.page : 1);
  const [pageSize, setPageSize] = useState(
    initialQuery?.pageSize && initialQuery.pageSize > 0 ? initialQuery.pageSize : 20,
  );
  const [search, setSearch] = useState(initialQuery?.search ?? "");
  const [sortBy] = useState(initialQuery?.sortBy ?? "transactionDate");
  const [sortOrder] = useState(initialQuery?.sortOrder ?? "desc");
  const [items, setItems] = useState<AdminWalletTransactionRow[]>([]);
  const [summary, setSummary] = useState<AdminWalletTransactionsSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setSummary(EMPTY_SUMMARY);
      setTotal(0);
      setTotalPages(1);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function run() {
      setIsLoading(true);
      setError(null);

      const result = await fetchAdminWalletTransactions(
        { page, pageSize, search, sortBy, sortOrder },
        undefined,
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setItems([]);
        setSummary(EMPTY_SUMMARY);
        setTotal(0);
        setTotalPages(1);
        setError(result.error.message || "Failed to load wallet transactions");
        setIsLoading(false);
        return;
      }

      setItems(result.data.items);
      setSummary(result.data.summary);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
      setPage(result.data.page);
      setPageSize(result.data.pageSize);
      setIsLoading(false);
    }

    run();

    return () => {
      controller.abort();
    };
  }, [enabled, page, pageSize, refreshTick, search, sortBy, sortOrder]);

  const refresh = useCallback(() => {
    setRefreshTick((value) => value + 1);
  }, []);

  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;

  const previousPage = useCallback(() => {
    setPage((value) => Math.max(1, value - 1));
  }, []);

  const nextPage = useCallback(() => {
    setPage((value) => value + 1);
  }, []);

  const model = useMemo(
    () => ({
      items,
      summary,
      total,
      totalPages,
      page,
      pageSize,
      search,
      isLoading,
      error,
      canPreviousPage,
      canNextPage,
      setSearch,
      setPage,
      setPageSize,
      previousPage,
      nextPage,
      refresh,
    }),
    [
      canNextPage,
      canPreviousPage,
      error,
      isLoading,
      items,
      nextPage,
      page,
      pageSize,
      previousPage,
      refresh,
      search,
      summary,
      total,
      totalPages,
    ],
  );

  return model;
}
