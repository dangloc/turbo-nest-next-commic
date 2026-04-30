import { apiRequest } from "@/lib/api/http";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session-store";
import type { AuthorEarningsResponse } from "./types";

function authHeaders(token?: string) {
  const value = token ?? getSessionToken() ?? undefined;
  if (!value) {
    return undefined;
  }

  return {
    authorization: `Bearer ${value}`,
  };
}

export async function fetchAuthorEarnings(
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<AuthorEarningsResponse>> {
  return apiRequest<AuthorEarningsResponse>("/finance/author/earnings", {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function createAuthorWithdrawalRequest(
  input: { amount: number; note?: string },
  token?: string,
): Promise<
  ApiResult<{
    id: number;
    status: string;
    amount: number;
    earnedBalance: number;
  }>
> {
  return apiRequest<{
    id: number;
    status: string;
    amount: number;
    earnedBalance: number;
  }>("/finance/withdrawals/requests", {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}
