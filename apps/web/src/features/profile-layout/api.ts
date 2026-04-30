import { apiRequest } from "@/lib/api/http";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session-store";

function authHeaders(token?: string) {
  const value = token ?? getSessionToken() ?? undefined;
  if (!value) {
    return undefined;
  }

  return {
    authorization: `Bearer ${value}`,
  };
}

export interface MissionBoardItem {
  id: number;
  title: string;
  description: string | null;
  points: number;
  type: string;
  startsAt: string | null;
  endsAt: string | null;
  status: "PENDING" | "COMPLETED" | "CLAIMED" | "FAILED";
  progress: number;
  targetProgress?: number;
  action?: "REWARD_AD";
  completedAt: string | null;
  claimedAt: string | null;
}

export interface MissionBoardResponse {
  pointBalance: number;
  todayEarned: number;
  dailyLimit: number;
  rewardPointExpiresAfterMonths?: number;
  items: MissionBoardItem[];
}

export interface PointTransactionRow {
  id: number;
  amount: number;
  balanceAfter: number | null;
  type: "EARN" | "SPEND" | "ADJUSTMENT" | "EXPIRE" | "BONUS";
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
  expiresAt?: string | null;
  isExpired?: boolean;
}

export interface PointTransactionsResponse {
  balance: number;
  items: PointTransactionRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RewardAdSessionResponse {
  sessionId: string;
  smartlinkUrl: string;
  startedAt: string;
  claimableAt: string;
  viewSeconds: number;
  points: number;
  dailyLimit: number;
  claimedToday: number;
  remainingClaims: number;
}

export interface RewardAdClaimResponse {
  sessionId: string;
  pointsAwarded: number;
  pointBalance: number;
  claimedToday: number;
  remainingClaims: number;
  claimedAt: string;
}

export async function fetchMissionBoard(
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<MissionBoardResponse>> {
  return apiRequest<MissionBoardResponse>("/reader/me/missions", {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function fetchPointTransactions(
  page: number,
  pageSize: number,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<PointTransactionsResponse>> {
  const params = new URLSearchParams({
    page: String(Number.isInteger(page) && page > 0 ? page : 1),
    pageSize: String(Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20),
  });

  return apiRequest<PointTransactionsResponse>(
    `/reader/me/points/transactions?${params.toString()}`,
    {
      method: "GET",
      headers: authHeaders(token),
      includeCredentials: true,
      signal,
    },
  );
}

export async function createRewardAdSession(
  token?: string,
): Promise<ApiResult<RewardAdSessionResponse>> {
  return apiRequest<RewardAdSessionResponse>("/reward-ads/sessions", {
    method: "POST",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function claimRewardAdSession(
  sessionId: string,
  token?: string,
): Promise<ApiResult<RewardAdClaimResponse>> {
  return apiRequest<RewardAdClaimResponse>("/reward-ads/claim", {
    method: "POST",
    headers: authHeaders(token),
    body: { sessionId },
    includeCredentials: true,
  });
}
