import { env } from "./env";

export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = env.assetBaseUrl;
  const joined = `${base}/${path.replace(/^\/+/, "")}`;
  // Collapse any remaining consecutive slashes that are NOT part of the protocol "://"
  return joined.replace(/([^:])\/\/+/g, "$1/");
}
