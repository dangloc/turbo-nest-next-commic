import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import { getSessionToken } from "../../lib/auth/session-store";
import type {
  InitiateTopUpInput,
  PaymentProvider,
  InitiateTopUpResponse,
  PurchaseChapterInput,
  PurchaseChapterResponse,
  PurchaseChapterResult,
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

export async function purchaseChapter(
  input: PurchaseChapterInput,
  token?: string,
): Promise<ApiResult<PurchaseChapterResult>> {
  if (!Number.isInteger(input.chapterId) || input.chapterId <= 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "chapterId must be a positive integer.",
      },
    };
  }

  if (!Number.isInteger(input.novelId) || input.novelId <= 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "novelId must be a positive integer.",
      },
    };
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "price must be a positive number.",
      },
    };
  }

  const result = await apiRequest<PurchaseChapterResponse>(
    `/finance/purchases/chapters/${input.chapterId}`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: {
        novelId: input.novelId,
        price: input.price,
      },
      includeCredentials: true,
    },
  );

  if (!result.ok) {
    if (result.error.status === 400 && /insufficient deposited balance/i.test(result.error.message)) {
      return {
        ok: true,
        data: {
          status: "insufficient_balance",
          chapterId: input.chapterId,
          novelId: input.novelId,
          purchasedChapterId: null,
        },
      };
    }

    return result;
  }

  return {
    ok: true,
    data: {
      status: result.data.status,
      chapterId: result.data.chapterId,
      novelId: result.data.novelId,
      purchasedChapterId: result.data.purchasedChapterId,
      transactionId: result.data.transactionId,
      depositedBalance: result.data.depositedBalance,
    },
  };
}

export type {
  InitiateTopUpInput,
  InitiateTopUpResponse,
  PaymentProvider,
  PurchaseChapterInput,
  PurchaseChapterResult,
  VerifyTopUpInput,
  VerifyTopUpResponse,
  WalletSummaryResponse,
};
