import { apiRequest } from "../../lib/api/http";
import type { SessionUser } from "../../lib/api/types";
import { fetchSession } from "../../lib/auth/api";
import { env } from "../../lib/env";
import {
  getSessionToken,
  loadSessionFromStorage,
  persistSessionToStorage,
} from "../../lib/auth/session-store";
import type {
  AuthorApiResult,
  AuthorDashboardBootstrapResult,
  ChapterFormInput,
  ChapterRecord,
  NovelFormInput,
  NovelListPage,
  NovelListQuery,
  NovelRecord,
  TermRecord,
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

function buildNovelListPath(query: NovelListQuery) {
  const params = new URLSearchParams();

  if (query.q?.trim()) {
    params.set("q", query.q.trim());
  }

  if (query.scope) {
    params.set("scope", query.scope);
  }

  if (query.sort) {
    params.set("sort", query.sort);
  }

  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }

  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }

  const serialized = params.toString();
  return serialized ? `/novels?${serialized}` : "/novels";
}

export function canAccessAuthorDashboard(user: SessionUser | null): boolean {
  return user?.role === "AUTHOR" || user?.role === "ADMIN";
}

export async function bootstrapAuthorDashboardSession(
  currentUser: SessionUser | null,
): Promise<AuthorDashboardBootstrapResult> {
  if (currentUser && canAccessAuthorDashboard(currentUser)) {
    return { kind: "ready", user: currentUser };
  }

  if (currentUser && !canAccessAuthorDashboard(currentUser)) {
    return {
      kind: "redirect",
      to: "/dashboard",
      reason: "forbidden_role",
    };
  }

  const stored = loadSessionFromStorage();
  if (stored.user && canAccessAuthorDashboard(stored.user)) {
    return { kind: "ready", user: stored.user };
  }

  if (stored.user && !canAccessAuthorDashboard(stored.user)) {
    return {
      kind: "redirect",
      to: "/dashboard",
      reason: "forbidden_role",
    };
  }

  const token = stored.token ?? getSessionToken();
  if (!token) {
    return {
      kind: "redirect",
      to: "/auth/login",
      reason: "missing_token",
    };
  }

  const session = await fetchSession(token);
  if (!session.ok || !session.data.user) {
    return {
      kind: "redirect",
      to: "/auth/login",
      reason: "invalid_session",
    };
  }

  persistSessionToStorage(session.data.user);
  if (!canAccessAuthorDashboard(session.data.user)) {
    return {
      kind: "redirect",
      to: "/dashboard",
      reason: "forbidden_role",
    };
  }

  return {
    kind: "ready",
    user: session.data.user,
  };
}

export async function listNovels(
  query: NovelListQuery = {},
  token?: string,
  signal?: AbortSignal,
): Promise<AuthorApiResult<NovelListPage>> {
  return apiRequest<NovelListPage>(buildNovelListPath(query), {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function createNovel(input: NovelFormInput, token?: string): Promise<AuthorApiResult<NovelRecord>> {
  return apiRequest<NovelRecord>("/novels", {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function updateNovel(
  novelId: number,
  input: NovelFormInput,
  token?: string,
): Promise<AuthorApiResult<NovelRecord>> {
  return apiRequest<NovelRecord>(`/novels/${novelId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function deleteNovel(novelId: number, token?: string): Promise<AuthorApiResult<NovelRecord>> {
  return apiRequest<NovelRecord>(`/novels/${novelId}`, {
    method: "DELETE",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function listChaptersByNovel(
  novelId: number,
  token?: string,
  signal?: AbortSignal,
): Promise<AuthorApiResult<ChapterRecord[]>> {
  return apiRequest<ChapterRecord[]>(`/novels/${novelId}/chapters`, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
    signal,
  });
}

export async function createChapter(
  novelId: number,
  input: ChapterFormInput,
  token?: string,
): Promise<AuthorApiResult<ChapterRecord>> {
  return apiRequest<ChapterRecord>(`/novels/${novelId}/chapters`, {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function updateChapter(
  chapterId: number,
  input: ChapterFormInput,
  token?: string,
): Promise<AuthorApiResult<ChapterRecord>> {
  return apiRequest<ChapterRecord>(`/chapters/${chapterId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function deleteChapter(chapterId: number, token?: string): Promise<AuthorApiResult<ChapterRecord>> {
  return apiRequest<ChapterRecord>(`/chapters/${chapterId}`, {
    method: "DELETE",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function listTerms(taxonomy?: string, token?: string): Promise<AuthorApiResult<TermRecord[]>> {
  const path = taxonomy ? `/terms?taxonomy=${encodeURIComponent(taxonomy)}` : "/terms";
  return apiRequest<TermRecord[]>(path, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function createTerm(
  input: { name: string; slug: string; taxonomy: string },
  token?: string,
): Promise<AuthorApiResult<TermRecord>> {
  return apiRequest<TermRecord>("/terms", {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function updateTerm(
  id: number,
  input: { name: string; slug: string },
  token?: string,
): Promise<AuthorApiResult<TermRecord>> {
  return apiRequest<TermRecord>(`/terms/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function deleteTerm(id: number, token?: string): Promise<AuthorApiResult<TermRecord>> {
  return apiRequest<TermRecord>(`/terms/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function uploadNovelImage(
  file: File,
  type: "featured" | "banner",
  token?: string,
): Promise<AuthorApiResult<{ url: string }>> {
  const endpoint = type === "banner" ? "novel-banner" : "novel-featured";
  const url = `${env.apiBaseUrl}/upload/${endpoint}`;
  const form = new FormData();
  form.append("file", file);
  const tok = token ?? getSessionToken() ?? undefined;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: tok ? { authorization: `Bearer ${tok}` } : {},
      credentials: "include",
      body: form,
    });
    const payload = res.headers.get("content-type")?.includes("application/json")
      ? await res.json()
      : null;
    if (!res.ok) {
      return { ok: false, error: { message: payload?.message ?? `Upload failed (${res.status})`, status: res.status } };
    }
    return { ok: true, data: payload as { url: string } };
  } catch (e) {
    return { ok: false, error: { message: e instanceof Error ? e.message : "Network error", status: 0 } };
  }
}
