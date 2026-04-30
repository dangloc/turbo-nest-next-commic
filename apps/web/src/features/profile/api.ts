import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import { getSessionToken } from "../../lib/auth/session-store";
import { env } from "../../lib/env";
import { compressImageForUpload } from "../../lib/image-compression";
import type {
  ChangePasswordInput,
  ProfileData,
  ProfileResponse,
  UpdateProfileInput,
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

function normalizeUpdateInput(input: UpdateProfileInput) {
  const normalized: UpdateProfileInput = {};

  if (input.displayName !== undefined) {
    const displayName = input.displayName?.trim() ?? "";
    if (displayName.length === 0) {
      normalized.displayName = null;
    } else {
      if (displayName.length < 2 || displayName.length > 40) {
        return {
          ok: false as const,
          message: "Display name must be between 2 and 40 characters.",
        };
      }

      normalized.displayName = displayName;
    }
  }

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      return {
        ok: false as const,
        message: "Email is required.",
      };
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return {
        ok: false as const,
        message: "Email format is invalid.",
      };
    }

    normalized.email = email;
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

function normalizePasswordInput(input: ChangePasswordInput) {
  if (!input.currentPassword) {
    return {
      ok: false as const,
      message: "Current password is required.",
    };
  }

  if (input.newPassword.length < 8 || input.newPassword.length > 128) {
    return {
      ok: false as const,
      message: "New password must be between 8 and 128 characters.",
    };
  }

  if (!/[A-Za-z]/.test(input.newPassword) || !/\d/.test(input.newPassword)) {
    return {
      ok: false as const,
      message: "New password must include at least one letter and one number.",
    };
  }

  return {
    ok: true as const,
    data: input,
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

export async function changePassword(
  input: ChangePasswordInput,
  token?: string,
): Promise<ApiResult<{ success: true }>> {
  const normalized = normalizePasswordInput(input);
  if (!normalized.ok) {
    return {
      ok: false,
      error: {
        status: 400,
        message: normalized.message,
      },
    };
  }

  return apiRequest<{ success: true }>("/auth/password", {
    method: "POST",
    headers: authHeaders(token),
    body: normalized.data,
    includeCredentials: true,
  });
}

export async function uploadAvatarImage(
  file: File,
  token?: string,
): Promise<ApiResult<{ url: string }>> {
  const uploadFile = await compressImageForUpload(file, "avatar");
  const form = new FormData();
  form.append("file", uploadFile);

  try {
    const response = await fetch(`${env.apiBaseUrl}/upload/avatar`, {
      method: "POST",
      headers: authHeaders(token),
      credentials: "include",
      body: form,
    });
    const payload = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      return {
        ok: false,
        error: {
          status: response.status,
          message: payload?.message ?? `Upload failed (${response.status})`,
        },
      };
    }

    return {
      ok: true,
      data: payload as { url: string },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        status: 0,
        message: error instanceof Error ? error.message : "Network error",
      },
    };
  }
}

export type {
  ChangePasswordInput,
  ProfileData,
  ProfileResponse,
  UpdateProfileInput,
};
