import { apiRequest } from "../../lib/api/http";
import type { ApiResult } from "../../lib/api/types";
import {
  buildDiscoveryQueryParams,
  normalizeDiscoveryQuery,
  type DiscoveryQuery,
  type DiscoveryResponse,
  type DiscoveryQueryInit,
} from "./types";

export type { DiscoveryQuery, DiscoveryResponse } from "./types";
export { buildDiscoveryQueryParams, normalizeDiscoveryQuery, parseDiscoverySearchParams } from "./types";

export async function fetchDiscoveryNovels(
  init: DiscoveryQueryInit,
  signal?: AbortSignal,
): Promise<ApiResult<DiscoveryResponse>> {
  const query = normalizeDiscoveryQuery(init);
  const params = buildDiscoveryQueryParams(query);
  const path = params.toString() ? "/reader/novels?" + params.toString() : "/reader/novels";

  return apiRequest<DiscoveryResponse>(path, {
    method: "GET",
    signal,
  });
}

export function getDiscoveryHref(query: DiscoveryQuery, pathname = "/") {
  const params = buildDiscoveryQueryParams(query);
  const queryString = params.toString();

  return queryString ? pathname + "?" + queryString : pathname;
}
