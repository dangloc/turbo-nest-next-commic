import { apiRequest } from "@/lib/api/http";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session-store";
import type {
  AdminWalletTransactionsQuery,
  AdminWalletTransactionsResponse,
} from "./types";

function authHeaders(token?: string) {
  const value = token ?? getSessionToken() ?? undefined;
  if (!value) {
    return undefined;
  }

  return {
    authorization: `Bearer ${value}`,
  };
}

export async function fetchAdminWalletTransactions(
  query: AdminWalletTransactionsQuery,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminWalletTransactionsResponse>> {
  const page = Number.isInteger(query.page) && (query.page as number) > 0 ? (query.page as number) : 1;
  const pageSize =
    Number.isInteger(query.pageSize) &&
    (query.pageSize as number) > 0 &&
    (query.pageSize as number) <= 100
      ? (query.pageSize as number)
      : 20;

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (query.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortOrder) {
    params.set("sortOrder", query.sortOrder);
  }

  const search = query.search?.trim();
  if (search) {
    params.set("search", search);
  }

  return apiRequest<AdminWalletTransactionsResponse>(
    `/admin/wallets/transactions?${params.toString()}`,
    {
      method: "GET",
      headers: authHeaders(token),
      includeCredentials: true,
      signal,
    },
  );
}
