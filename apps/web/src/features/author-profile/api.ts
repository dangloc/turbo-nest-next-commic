import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import { getSessionToken } from "../../lib/auth/session-store";
import {
  buildAuthorProfileQueryParams,
  normalizeAuthorProfileQuery,
  type AuthorFollowResult,
  type AuthorProfileQuery,
  type AuthorProfileQueryInit,
  type AuthorProfileResponse,
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

export type { AuthorProfileQuery, AuthorProfileResponse } from "./types";
export {
  AUTHOR_PROFILE_DEFAULTS,
  buildAuthorProfileQueryParams,
  normalizeAuthorProfileQuery,
  parseAuthorProfileSearchParams,
} from "./types";

export async function fetchAuthorProfile(
  authorId: number,
  init: AuthorProfileQueryInit,
  signal?: AbortSignal,
  token?: string,
): Promise<ApiResult<AuthorProfileResponse>> {
  const query = normalizeAuthorProfileQuery(init);
  const params = buildAuthorProfileQueryParams(query);
  const queryString = params.toString();
  const path = queryString
    ? "/reader/authors/" + authorId + "?" + queryString
    : "/reader/authors/" + authorId;

  return apiRequest<AuthorProfileResponse>(path, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function followAuthor(authorId: number, token?: string): Promise<ApiResult<AuthorFollowResult>> {
  return apiRequest<AuthorFollowResult>(`/reader/me/follows/authors/${authorId}`, {
    method: "POST",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function unfollowAuthor(authorId: number, token?: string): Promise<ApiResult<AuthorFollowResult>> {
  return apiRequest<AuthorFollowResult>(`/reader/me/follows/authors/${authorId}`, {
    method: "DELETE",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export function getAuthorProfileHref(authorId: number, query: AuthorProfileQuery, pathname = "/author") {
  const params = buildAuthorProfileQueryParams(query);
  const queryString = params.toString();
  const base = pathname + "/" + authorId;

  return queryString ? base + "?" + queryString : base;
}
