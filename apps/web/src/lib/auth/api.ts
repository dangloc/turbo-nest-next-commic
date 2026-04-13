import { env } from "../env";
import { apiRequest } from "../api/http";
import type { ApiResult, SessionPayload } from "../api/types";

export function getGoogleLoginUrl() {
  return `${env.apiBaseUrl}/auth/google`;
}

export async function fetchSession(
  token?: string,
): Promise<ApiResult<SessionPayload | { user: null }>> {
  const headers = token
    ? {
        authorization: `Bearer ${token}`,
      }
    : undefined;

  return apiRequest<SessionPayload | { user: null }>("/auth/me", {
    method: "GET",
    headers,
    includeCredentials: true,
  });
}

export async function logoutSession() {
  return apiRequest<{ success: boolean }>("/auth/logout", {
    method: "POST",
    includeCredentials: true,
  });
}
