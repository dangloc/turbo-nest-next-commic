const DEFAULT_API_BASE_URL = "http://localhost:8000";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

function getOptionalPublicUrl(configured?: string) {
  if (!configured) {
    return null;
  }

  try {
    return new URL(configured).toString();
  } catch {
    return null;
  }
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

export function getAssetBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (!configured) {
    return getApiBaseUrl();
  }

  try {
    const parsed = new URL(configured);
    return normalizeBaseUrl(parsed.toString());
  } catch {
    throw new Error("NEXT_PUBLIC_ASSET_BASE_URL must be a valid URL");
  }
}

export const env = {
  apiBaseUrl: getApiBaseUrl(),
  assetBaseUrl: getAssetBaseUrl(),
  adsterraSmartlinkUrl: getOptionalPublicUrl(
    process.env.NEXT_PUBLIC_ADSTERRA_SMARTLINK_URL,
  ),
  adsterraNativeBannerUrl: getOptionalPublicUrl(
    process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL,
  ),
};
