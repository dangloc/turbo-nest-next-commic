import { apiRequest } from "@/lib/api/http";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session-store";
import type {
  AdminAdSettingsResponse,
  DashboardRoleSettingsResponse,
  UpdateAdminAdSettingsInput,
  UpdateDashboardRoleSettingsInput,
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

export async function fetchAdminAdSettings(
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminAdSettingsResponse>> {
  return apiRequest<AdminAdSettingsResponse>("/admin/ad-settings", {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function updateAdminAdSettings(
  input: UpdateAdminAdSettingsInput,
  token?: string,
): Promise<ApiResult<AdminAdSettingsResponse>> {
  return apiRequest<AdminAdSettingsResponse>("/admin/ad-settings", {
    method: "PATCH",
    headers: authHeaders(token),
    includeCredentials: true,
    body: input,
  });
}

export async function fetchDashboardRoleSettings(
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<DashboardRoleSettingsResponse>> {
  return apiRequest<DashboardRoleSettingsResponse>(
    "/admin/dashboard-role-settings",
    {
      method: "GET",
      headers: authHeaders(token),
      includeCredentials: true,
      signal,
    },
  );
}

export async function updateDashboardRoleSettings(
  input: UpdateDashboardRoleSettingsInput,
  token?: string,
): Promise<ApiResult<DashboardRoleSettingsResponse>> {
  return apiRequest<DashboardRoleSettingsResponse>(
    "/admin/dashboard-role-settings",
    {
      method: "PATCH",
      headers: authHeaders(token),
      includeCredentials: true,
      body: input,
    },
  );
}
