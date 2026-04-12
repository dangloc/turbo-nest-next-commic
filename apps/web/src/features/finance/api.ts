import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import { getSessionToken } from "../../lib/auth/session-store";
import type {
  ComboPurchaseResult,
  InitiateTopUpInput,
  InitiateTopUpResponse,
  NovelPricingResponse,
  PaymentProvider,
  PurchaseChapterInput,
  PurchaseChapterResponse,
  PurchaseChapterResult,
  PurchaseHistoryResponse,
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

export async function fetchPurchaseHistory(
  page: number,
  pageSize: number,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<PurchaseHistoryResponse>> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;

  const params = new URLSearchParams({
    page: String(safePage),
    pageSize: String(safePageSize),
  });

  return apiRequest<PurchaseHistoryResponse>(`/finance/purchases/history?${params.toString()}`, {
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

export async function fetchNovelPricing(
  novelId: number,
  token?: string,
): Promise<ApiResult<NovelPricingResponse>> {
  if (!Number.isInteger(novelId) || novelId <= 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "novelId must be a positive integer.",
      },
    };
  }

  return apiRequest<NovelPricingResponse>(`/finance/purchases/novels/${novelId}/pricing`, {
    method: "GET",
    headers: authHeaders(token),
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

  const result = await apiRequest<PurchaseChapterResponse>(
    `/finance/purchases/chapters/${input.chapterId}`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: {
        novelId: input.novelId,
      },
      includeCredentials: true,
    },
  );

  if (!result.ok) {
    if (
      result.error.status === 400 &&
      /insufficient deposited balance/i.test(result.error.message)
    ) {
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
      effectivePrice: result.data.effectivePrice,
    },
  };
}

export async function purchaseNovelCombo(
  novelId: number,
  token?: string,
): Promise<ApiResult<ComboPurchaseResult>> {
  if (!Number.isInteger(novelId) || novelId <= 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "novelId must be a positive integer.",
      },
    };
  }

  const result = await apiRequest<ComboPurchaseResult>(
    `/finance/purchases/novels/${novelId}/combo`,
    {
      method: "POST",
      headers: authHeaders(token),
      includeCredentials: true,
    },
  );

  if (!result.ok) {
    if (
      result.error.status === 400 &&
      /insufficient deposited balance/i.test(result.error.message)
    ) {
      return {
        ok: true,
        data: {
          status: "insufficient_balance",
          novelId,
          purchasedChapterCount: 0,
          chargedAmount: 0,
        },
      };
    }

    return result;
  }

  return result;
}

export type {
  ComboPurchaseResult,
  InitiateTopUpInput,
  InitiateTopUpResponse,
  NovelPricingResponse,
  PaymentProvider,
  PurchaseChapterInput,
  PurchaseChapterResult,
  PurchaseHistoryResponse,
  VerifyTopUpInput,
  VerifyTopUpResponse,
  WalletSummaryResponse,
};
