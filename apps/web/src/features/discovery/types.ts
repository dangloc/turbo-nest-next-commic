export type DiscoverySortBy = "viewCount" | "updatedAt" | "createdAt";
export type DiscoverySortDir = "asc" | "desc";

export interface DiscoveryTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface DiscoveryNovel {
  id: number;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string | null;
  coverUrl?: string | null;
  terms: DiscoveryTerm[];
}

export interface DiscoveryResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: DiscoveryNovel[];
}

export interface DiscoveryQuery {
  page: number;
  limit: number;
  sortBy: DiscoverySortBy;
  sortDir: DiscoverySortDir;
  category?: string;
  tag?: string;
  status?: string;
}

export interface DiscoveryQueryInit {
  page?: string | number | null;
  limit?: string | number | null;
  sortBy?: string | null;
  sortDir?: string | null;
  category?: string | null;
  tag?: string | null;
  status?: string | null;
}

export const DISCOVERY_DEFAULTS: DiscoveryQuery = {
  page: 1,
  limit: 20,
  sortBy: "updatedAt",
  sortDir: "desc",
};

function normalizeNumber(value: string | number | null | undefined, fallback: number) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 1) {
    return fallback;
  }

  return Math.floor(normalized);
}

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeDiscoveryQuery(init: DiscoveryQueryInit = {}): DiscoveryQuery {
  const page = normalizeNumber(init.page, DISCOVERY_DEFAULTS.page);
  const limit = Math.min(50, normalizeNumber(init.limit, DISCOVERY_DEFAULTS.limit));
  const sortBy =
    init.sortBy === "viewCount" || init.sortBy === "createdAt" || init.sortBy === "updatedAt"
      ? init.sortBy
      : DISCOVERY_DEFAULTS.sortBy;
  const sortDir = init.sortDir === "asc" || init.sortDir === "desc" ? init.sortDir : DISCOVERY_DEFAULTS.sortDir;

  return {
    page,
    limit,
    sortBy,
    sortDir,
    category: normalizeText(init.category),
    tag: normalizeText(init.tag),
    status: normalizeText(init.status),
  };
}

export function buildDiscoveryQueryParams(query: DiscoveryQuery) {
  const params = new URLSearchParams();

  if (query.page !== DISCOVERY_DEFAULTS.page) {
    params.set("page", String(query.page));
  }

  if (query.limit !== DISCOVERY_DEFAULTS.limit) {
    params.set("limit", String(query.limit));
  }

  if (query.sortBy !== DISCOVERY_DEFAULTS.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortDir !== DISCOVERY_DEFAULTS.sortDir) {
    params.set("sortDir", query.sortDir);
  }

  if (query.category) {
    params.set("category", query.category);
  }

  if (query.tag) {
    params.set("tag", query.tag);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  return params;
}

export function parseDiscoverySearchParams(searchParams: { get(name: string): string | null }) {
  return normalizeDiscoveryQuery({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    sortBy: searchParams.get("sortBy"),
    sortDir: searchParams.get("sortDir"),
    category: searchParams.get("category"),
    tag: searchParams.get("tag"),
    status: searchParams.get("status"),
  });
}

export function mergeDiscoveryQuery(
  base: DiscoveryQuery,
  overrides: Partial<DiscoveryQuery>,
): DiscoveryQuery {
  return normalizeDiscoveryQuery({
    page: overrides.page ?? base.page,
    limit: overrides.limit ?? base.limit,
    sortBy: overrides.sortBy ?? base.sortBy,
    sortDir: overrides.sortDir ?? base.sortDir,
    category: overrides.category ?? base.category,
    tag: overrides.tag ?? base.tag,
    status: overrides.status ?? base.status,
  });
}
