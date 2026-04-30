import { apiRequest } from "@/lib/api/http";
import { getSessionToken } from "@/lib/auth/session-store";
import type {
  AdminAuthorApplicationsQuery,
  AuthorApplicationsApiResult,
  AuthorApplicationsListResponse,
  MyAuthorApplicationResponse,
  UpsertAuthorApplicationInput,
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

export async function fetchMyAuthorApplication(
  token?: string,
  signal?: AbortSignal,
): Promise<AuthorApplicationsApiResult<MyAuthorApplicationResponse>> {
  return apiRequest<MyAuthorApplicationResponse>("/author-applications/me", {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function submitMyAuthorApplication(
  input: UpsertAuthorApplicationInput,
  token?: string,
): Promise<AuthorApplicationsApiResult<MyAuthorApplicationResponse>> {
  return apiRequest<MyAuthorApplicationResponse>("/author-applications/me", {
    method: "PUT",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function fetchAdminAuthorApplications(
  query: AdminAuthorApplicationsQuery = {},
  token?: string,
  signal?: AbortSignal,
): Promise<AuthorApplicationsApiResult<AuthorApplicationsListResponse>> {
  const params = new URLSearchParams();
  const page =
    Number.isInteger(query.page) && (query.page as number) > 0 ? query.page : 1;
  const pageSize =
    Number.isInteger(query.pageSize) && (query.pageSize as number) > 0
      ? Math.min(query.pageSize as number, 50)
      : 20;

  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const status =
    query.status && query.status !== "ALL" ? query.status : undefined;
  if (status) {
    params.set("status", status);
  }

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  return apiRequest<AuthorApplicationsListResponse>(
    `/author-applications/admin?${params.toString()}`,
    {
      method: "GET",
      headers: authHeaders(token),
      includeCredentials: true,
      signal,
    },
  );
}

export async function approveAuthorApplication(
  userId: number,
  token?: string,
): Promise<AuthorApplicationsApiResult<MyAuthorApplicationResponse>> {
  return apiRequest<MyAuthorApplicationResponse>(
    `/author-applications/admin/${userId}/approve`,
    {
      method: "POST",
      headers: authHeaders(token),
      includeCredentials: true,
    },
  );
}

export async function rejectAuthorApplication(
  userId: number,
  reason?: string,
  token?: string,
): Promise<AuthorApplicationsApiResult<MyAuthorApplicationResponse>> {
  return apiRequest<MyAuthorApplicationResponse>(
    `/author-applications/admin/${userId}/reject`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: reason?.trim() ? { reason: reason.trim() } : {},
      includeCredentials: true,
    },
  );
}
