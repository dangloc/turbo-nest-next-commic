import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import {
  buildAuthorProfileQueryParams,
  normalizeAuthorProfileQuery,
  type AuthorProfileQuery,
  type AuthorProfileQueryInit,
  type AuthorProfileResponse,
} from "./types";

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
): Promise<ApiResult<AuthorProfileResponse>> {
  const query = normalizeAuthorProfileQuery(init);
  const params = buildAuthorProfileQueryParams(query);
  const queryString = params.toString();
  const path = queryString
    ? "/reader/authors/" + authorId + "?" + queryString
    : "/reader/authors/" + authorId;

  return apiRequest<AuthorProfileResponse>(path, {
    method: "GET",
    signal,
  });
}

export function getAuthorProfileHref(authorId: number, query: AuthorProfileQuery, pathname = "/author") {
  const params = buildAuthorProfileQueryParams(query);
  const queryString = params.toString();
  const base = pathname + "/" + authorId;

  return queryString ? base + "?" + queryString : base;
}
