import { apiRequest } from "@/lib/api/http";
import type { ApiResult } from "@/lib/api/types";
import { fetchDiscoveryNovels } from "../discovery/api";
import type { DiscoveryQueryInit, DiscoveryResponse } from "../discovery/types";

export interface PublicTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export async function fetchNovelCatalog(
  query: DiscoveryQueryInit,
  signal?: AbortSignal,
): Promise<ApiResult<DiscoveryResponse>> {
  return fetchDiscoveryNovels(query, signal);
}

export async function fetchPublicTerms(
  taxonomy: string,
  signal?: AbortSignal,
): Promise<ApiResult<PublicTerm[]>> {
  const params = new URLSearchParams({ taxonomy });

  return apiRequest<PublicTerm[]>(`/terms?${params.toString()}`, {
    method: "GET",
    signal,
  });
}
