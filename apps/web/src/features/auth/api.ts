import type { ApiError, ApiResult } from "../../lib/api/types";
import { apiRequest } from "../../lib/api/http";
import type { LocalAuthSuccess, LocalLoginInput, LocalRegisterInput } from "./types";

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export function buildLoginPayload(input: LocalLoginInput) {
  return {
    username: normalizeIdentifier(input.username),
    password: input.password,
    rememberMe: input.rememberMe ?? false,
  };
}

export function buildRegisterPayload(input: LocalRegisterInput) {
  return {
    username: normalizeIdentifier(input.username),
    email: normalizeIdentifier(input.email),
    password: input.password,
  };
}

export async function loginLocal(input: LocalLoginInput): Promise<ApiResult<LocalAuthSuccess>> {
  return apiRequest<LocalAuthSuccess>("/auth/login", {
    method: "POST",
    includeCredentials: true,
    body: buildLoginPayload(input),
  });
}

export async function registerLocal(
  input: LocalRegisterInput,
): Promise<ApiResult<LocalAuthSuccess>> {
  return apiRequest<LocalAuthSuccess>("/auth/register", {
    method: "POST",
    includeCredentials: true,
    body: buildRegisterPayload(input),
  });
}

export function extractAuthErrorMessage(error: ApiError) {
  const source = error.message.toLowerCase();

  if (source.includes("username") && source.includes("already")) {
    return "This username is already in use.";
  }

  if (source.includes("email") && source.includes("already")) {
    return "This email is already in use.";
  }

  if (source.includes("invalid username or password")) {
    return "Username/email or password is incorrect.";
  }

  if (error.status === 0) {
    return "Network error. Please check your connection and try again.";
  }

  return error.message || "Authentication failed. Please try again.";
}
