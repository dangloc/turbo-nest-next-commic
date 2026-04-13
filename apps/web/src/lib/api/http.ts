import { env } from "../env";
import type { ApiError, ApiResult } from "./types";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  includeCredentials?: boolean;
}

function toApiError(status: number, payload: unknown): ApiError {
  if (payload && typeof payload === "object") {
    const objectPayload = payload as {
      message?: string | string[];
      error?: string;
      code?: string;
      details?: unknown;
    };

    const firstMessage = Array.isArray(objectPayload.message)
      ? objectPayload.message[0]
      : objectPayload.message;

    return {
      status,
      message: firstMessage ?? objectPayload.error ?? "Request failed",
      code: objectPayload.code,
      details: objectPayload.details,
    };
  }

  return {
    status,
    message: "Request failed",
  };
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const url = `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers);
  if (!headers.has("content-type") && options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: options.includeCredentials ? "include" : options.credentials,
      body:
        options.body === undefined
          ? undefined
          : headers.get("content-type")?.includes("application/json")
            ? JSON.stringify(options.body)
            : (options.body as BodyInit),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;

    if (!response.ok) {
      return {
        ok: false,
        error: toApiError(response.status, payload),
      };
    }

    return {
      ok: true,
      data: payload as T,
    };
  } catch {
    return {
      ok: false,
      error: {
        status: 0,
        message: "Network error",
      },
    };
  }
}
