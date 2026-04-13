const DEFAULT_API_BASE_URL = "http://localhost:8000";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configured) {
    return DEFAULT_API_BASE_URL;
  }

  try {
    const parsed = new URL(configured);
    return normalizeBaseUrl(parsed.toString());
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid URL");
  }
}

export const env = {
  apiBaseUrl: getApiBaseUrl(),
};
