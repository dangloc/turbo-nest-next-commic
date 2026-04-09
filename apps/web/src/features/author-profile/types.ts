export type AuthorSortBy = "viewCount" | "updatedAt" | "createdAt";
export type AuthorSortDir = "asc" | "desc";

export interface AuthorTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface AuthorCatalogItem {
  id: number;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  terms: AuthorTerm[];
}

export interface AuthorStats {
  totalPublishedNovels: number;
  totalViews: number;
  latestUpdateAt: string | null;
}

export interface AuthorIdentity {
  id: number;
  displayName: string;
  nickname: string | null;
  penName: string | null;
  avatar: string | null;
  bio: string | null;
}

export interface AuthorProfileResponse {
  author: AuthorIdentity;
  stats: AuthorStats;
  catalog: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    items: AuthorCatalogItem[];
  };
}

export interface AuthorProfileQuery {
  page: number;
  limit: number;
  sortBy: AuthorSortBy;
  sortDir: AuthorSortDir;
}

export interface AuthorProfileQueryInit {
  page?: string | number | null;
  limit?: string | number | null;
  sortBy?: string | null;
  sortDir?: string | null;
}

export const AUTHOR_PROFILE_DEFAULTS: AuthorProfileQuery = {
  page: 1,
  limit: 12,
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

export function normalizeAuthorProfileQuery(init: AuthorProfileQueryInit = {}): AuthorProfileQuery {
  const page = normalizeNumber(init.page, AUTHOR_PROFILE_DEFAULTS.page);
  const limit = Math.min(50, normalizeNumber(init.limit, AUTHOR_PROFILE_DEFAULTS.limit));
  const sortBy =
    init.sortBy === "viewCount" || init.sortBy === "createdAt" || init.sortBy === "updatedAt"
      ? init.sortBy
      : AUTHOR_PROFILE_DEFAULTS.sortBy;
  const sortDir = init.sortDir === "asc" || init.sortDir === "desc" ? init.sortDir : AUTHOR_PROFILE_DEFAULTS.sortDir;

  return {
    page,
    limit,
    sortBy,
    sortDir,
  };
}

export function buildAuthorProfileQueryParams(query: AuthorProfileQuery) {
  const params = new URLSearchParams();

  if (query.page !== AUTHOR_PROFILE_DEFAULTS.page) {
    params.set("page", String(query.page));
  }

  if (query.limit !== AUTHOR_PROFILE_DEFAULTS.limit) {
    params.set("limit", String(query.limit));
  }

  if (query.sortBy !== AUTHOR_PROFILE_DEFAULTS.sortBy) {
    params.set("sortBy", query.sortBy);
  }

  if (query.sortDir !== AUTHOR_PROFILE_DEFAULTS.sortDir) {
    params.set("sortDir", query.sortDir);
  }

  return params;
}

export function parseAuthorProfileSearchParams(searchParams: { get(name: string): string | null }) {
  return normalizeAuthorProfileQuery({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    sortBy: searchParams.get("sortBy"),
    sortDir: searchParams.get("sortDir"),
  });
}
