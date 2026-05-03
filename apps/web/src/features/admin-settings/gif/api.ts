import { apiRequest } from "../../../lib/api/http";
import { getSessionToken } from "../../../lib/auth/session-store";
import type { ApiResult } from "../../../lib/api/types";
import type {
  CreateGifAssetInput,
  GifAsset,
  GifAssetListResponse,
} from "./types";

function authHeaders() {
  const token = getSessionToken();
  if (!token) return undefined;
  return { authorization: `Bearer ${token}` };
}

export async function fetchAdminGifs(params?: {
  keyword?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResult<GifAssetListResponse>> {
  const q = new URLSearchParams();
  if (params?.keyword) q.set("keyword", params.keyword);
  if (params?.category) q.set("category", params.category);
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));

  return apiRequest<GifAssetListResponse>("/admin/gifs?" + q.toString(), {
    method: "GET",
    headers: authHeaders(),
    includeCredentials: true,
  });
}

export async function createGifAsset(
  input: CreateGifAssetInput,
): Promise<ApiResult<GifAsset>> {
  return apiRequest<GifAsset>("/admin/gifs", {
    method: "POST",
    headers: authHeaders(),
    body: input,
    includeCredentials: true,
  });
}

export async function deleteGifAsset(
  id: number,
): Promise<ApiResult<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(`/admin/gifs/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    includeCredentials: true,
  });
}

export async function toggleGifAsset(id: number): Promise<ApiResult<GifAsset>> {
  return apiRequest<GifAsset>(`/admin/gifs/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(),
    includeCredentials: true,
  });
}

export async function fetchPublicGifs(params?: {
  keyword?: string;
  category?: string;
}): Promise<ApiResult<GifAsset[]>> {
  const q = new URLSearchParams();
  if (params?.keyword) q.set("keyword", params.keyword);
  if (params?.category) q.set("category", params.category);

  return apiRequest<GifAsset[]>("/gifs?" + q.toString(), { method: "GET" });
}
