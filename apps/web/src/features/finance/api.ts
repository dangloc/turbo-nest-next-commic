import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import { getSessionToken } from "../../lib/auth/session-store";
import type {
  InitiateTopUpInput,
  PaymentProvider,
  InitiateTopUpResponse,
  VerifyTopUpInput,
  VerifyTopUpResponse,
  WalletSummaryResponse,
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

export async function fetchWalletSummary(
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<WalletSummaryResponse>> {
  return apiRequest<WalletSummaryResponse>("/finance/wallet/summary", {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function initiateTopUp(
  input: InitiateTopUpInput,
  token?: string,
): Promise<ApiResult<InitiateTopUpResponse>> {
  return apiRequest<InitiateTopUpResponse>("/finance/payments/initiate", {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function verifyTopUp(
  input: VerifyTopUpInput,
  token?: string,
): Promise<ApiResult<VerifyTopUpResponse>> {
  return apiRequest<VerifyTopUpResponse>("/finance/payments/verify", {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export type {
  InitiateTopUpInput,
  InitiateTopUpResponse,
  PaymentProvider,
  VerifyTopUpInput,
  VerifyTopUpResponse,
  WalletSummaryResponse,
};
