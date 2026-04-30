import { apiRequest } from "@/lib/api/http";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session-store";
import type {
  AdminUserDetail,
  AdminUsersQuery,
  AdminUsersResponse,
  UpdateAdminUserInput,
  UpdateAdminUserDashboardAccessInput,
  UpdateAdminUserRoleInput,
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

export async function fetchAdminUsers(
  query: AdminUsersQuery,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminUsersResponse>> {
  const page = Number.isInteger(query.page) && (query.page as number) > 0 ? query.page : 1;
  const pageSize =
    Number.isInteger(query.pageSize) && (query.pageSize as number) > 0
      ? Math.min(query.pageSize as number, 100)
      : 20;

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const search = query.search?.trim();
  if (search) {
    params.set("search", search);
  }

  if (query.role && query.role !== "ALL") {
    params.set("role", query.role);
  }

  return apiRequest<AdminUsersResponse>(`/users?${params.toString()}`, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function fetchAdminUserDetail(
  userId: number,
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminUserDetail>> {
  return apiRequest<AdminUserDetail>(`/users/${userId}`, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function updateAdminUserRole(
  userId: number,
  input: UpdateAdminUserRoleInput,
  token?: string,
): Promise<ApiResult<AdminUserDetail>> {
  return apiRequest<AdminUserDetail>(`/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function updateAdminUser(
  userId: number,
  input: UpdateAdminUserInput,
  token?: string,
): Promise<ApiResult<AdminUserDetail>> {
  return apiRequest<AdminUserDetail>(`/users/${userId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function updateAdminUserDashboardAccess(
  userId: number,
  input: UpdateAdminUserDashboardAccessInput,
  token?: string,
): Promise<ApiResult<AdminUserDetail>> {
  return apiRequest<AdminUserDetail>(`/users/${userId}/dashboard-access`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}
