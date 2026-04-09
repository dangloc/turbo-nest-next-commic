import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import { getSessionToken } from "../../lib/auth/session-store";
import type { ProfileData, ProfileResponse, UpdateProfileInput } from "./types";

function authHeaders(token?: string) {
  const value = token ?? getSessionToken() ?? undefined;
  if (!value) {
    return undefined;
  }

  return {
    authorization: `Bearer ${value}`,
  };
}

function normalizeUpdateInput(input: UpdateProfileInput) {
  const normalized: UpdateProfileInput = {};

  if (input.nickname !== undefined) {
    const nickname = input.nickname?.trim() ?? "";
    if (nickname.length === 0) {
      normalized.nickname = null;
    } else {
      if (nickname.length < 2 || nickname.length > 40) {
        return {
          ok: false as const,
          message: "Nickname must be between 2 and 40 characters.",
        };
      }

      normalized.nickname = nickname;
    }
  }

  if (input.avatar !== undefined) {
    const avatar = input.avatar?.trim() ?? "";
    if (avatar.length === 0) {
      normalized.avatar = null;
    } else {
      if (avatar.length > 255) {
        return {
          ok: false as const,
          message: "Avatar metadata must be 255 characters or fewer.",
        };
      }

      normalized.avatar = avatar;
    }
  }

  if (Object.keys(normalized).length === 0) {
    return {
      ok: false as const,
      message: "Provide at least one profile field to update.",
    };
  }

  return {
    ok: true as const,
    data: normalized,
  };
}

export async function fetchProfile(
  token?: string,
  signal?: AbortSignal,
): Promise<ApiResult<ProfileResponse>> {
  return apiRequest<ProfileResponse>("/auth/profile", {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function updateProfile(
  input: UpdateProfileInput,
  token?: string,
): Promise<ApiResult<ProfileResponse>> {
  const normalized = normalizeUpdateInput(input);
  if (!normalized.ok) {
    return {
      ok: false,
      error: {
        status: 400,
        message: normalized.message,
      },
    };
  }

  return apiRequest<ProfileResponse>("/auth/profile", {
    method: "PATCH",
    headers: authHeaders(token),
    body: normalized.data,
    includeCredentials: true,
  });
}

export type { ProfileData, ProfileResponse, UpdateProfileInput };
