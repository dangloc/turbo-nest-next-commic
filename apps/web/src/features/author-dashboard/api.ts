import { apiRequest } from "../../lib/api/http";
import type { SessionUser } from "../../lib/api/types";
import { fetchSession } from "../../lib/auth/api";
import {
  canAccessDashboardPath,
  getDashboardLandingHref,
  hasAnyDashboardAccess,
} from "../../lib/dashboard-access";
import { env } from "../../lib/env";
import {
  getSessionToken,
  loadSessionFromStorage,
  persistSessionToStorage,
} from "../../lib/auth/session-store";
import { compressImageForUpload } from "../../lib/image-compression";
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
  TermSubmissionRecord,
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
  return Boolean(
    canAccessDashboardPath(user, "/dashboard/author") ||
    canAccessDashboardPath(user, "/dashboard/novels"),
  );
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
      to: hasAnyDashboardAccess(currentUser)
        ? (getDashboardLandingHref(currentUser) ?? "/profile")
        : "/profile",
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
      to: hasAnyDashboardAccess(stored.user)
        ? (getDashboardLandingHref(stored.user) ?? "/profile")
        : "/profile",
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
      to: hasAnyDashboardAccess(session.data.user)
        ? (getDashboardLandingHref(session.data.user) ?? "/profile")
        : "/profile",
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

export async function createNovel(
  input: NovelFormInput,
  token?: string,
): Promise<AuthorApiResult<NovelRecord>> {
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

export async function getNovel(
  novelId: number,
  token?: string,
): Promise<AuthorApiResult<NovelRecord>> {
  return apiRequest<NovelRecord>(`/novels/${novelId}`, {
    method: "GET",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function deleteNovel(
  novelId: number,
  token?: string,
): Promise<AuthorApiResult<NovelRecord>> {
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

export async function deleteChapter(
  chapterId: number,
  token?: string,
): Promise<AuthorApiResult<ChapterRecord>> {
  return apiRequest<ChapterRecord>(`/chapters/${chapterId}`, {
    method: "DELETE",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function deleteAllChapters(
  novelId: number,
  token?: string,
): Promise<AuthorApiResult<{ deleted: number }>> {
  return apiRequest<{ deleted: number }>(`/novels/${novelId}/chapters`, {
    method: "DELETE",
    headers: authHeaders(token),
    includeCredentials: true,
  });
}

export async function importChapters(
  novelId: number,
  file: File,
  token?: string,
): Promise<AuthorApiResult<{ chaptersCreated: number; warnings: string[] }>> {
  const form = new FormData();
  form.append("file", file);
  const tok = token ?? getSessionToken() ?? undefined;
  const headers = tok
    ? ({ authorization: `Bearer ${tok}` } satisfies Record<string, string>)
    : undefined;
  const endpoints = [
    `${env.apiBaseUrl}/admin/novels/${novelId}/import-chapters`,
    `${env.apiBaseUrl}/novels/${novelId}/chapters/import`,
  ] as const;
  try {
    for (const [index, endpoint] of endpoints.entries()) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        credentials: "include",
        body: form,
      });
      const payload = res.headers
        .get("content-type")
        ?.includes("application/json")
        ? await res.json()
        : null;

      if (res.ok) {
        return {
          ok: true,
          data: payload as { chaptersCreated: number; warnings: string[] },
        };
      }

      if (res.status === 404 && index < endpoints.length - 1) {
        continue;
      }

      return {
        ok: false,
        error: {
          message: payload?.message ?? `Import failed (${res.status})`,
          status: res.status,
        },
      };
    }

    return {
      ok: false,
      error: {
        message: "Import route was not found.",
        status: 404,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: {
        message: e instanceof Error ? e.message : "Network error",
        status: 0,
      },
    };
  }
}

export async function listTerms(
  taxonomy?: string,
  token?: string,
): Promise<AuthorApiResult<TermRecord[]>> {
  const path = taxonomy
    ? `/terms?taxonomy=${encodeURIComponent(taxonomy)}`
    : "/terms";
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

export async function submitTerm(
  input: { name: string; slug: string; taxonomy: string },
  token?: string,
): Promise<AuthorApiResult<TermSubmissionRecord>> {
  return apiRequest<TermSubmissionRecord>("/terms/submissions", {
    method: "POST",
    headers: authHeaders(token),
    body: input,
    includeCredentials: true,
  });
}

export async function listTermSubmissions(
  query: { taxonomy?: string; status?: string } = {},
  token?: string,
  signal?: AbortSignal,
): Promise<AuthorApiResult<TermSubmissionRecord[]>> {
  const params = new URLSearchParams();
  if (query.taxonomy?.trim()) {
    params.set("taxonomy", query.taxonomy.trim());
  }
  if (query.status?.trim()) {
    params.set("status", query.status.trim());
  }

  const serialized = params.toString();
  return apiRequest<TermSubmissionRecord[]>(
    serialized ? `/terms/submissions?${serialized}` : "/terms/submissions",
    {
      method: "GET",
      headers: authHeaders(token),
      includeCredentials: true,
      signal,
    },
  );
}

export async function approveTermSubmission(
  id: number,
  note?: string,
  token?: string,
): Promise<
  AuthorApiResult<{ submission: TermSubmissionRecord; term: TermRecord }>
> {
  return apiRequest<{ submission: TermSubmissionRecord; term: TermRecord }>(
    `/terms/submissions/${id}/approve`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: note?.trim() ? { note: note.trim() } : {},
      includeCredentials: true,
    },
  );
}

export async function rejectTermSubmission(
  id: number,
  note?: string,
  token?: string,
): Promise<AuthorApiResult<TermSubmissionRecord>> {
  return apiRequest<TermSubmissionRecord>(`/terms/submissions/${id}/reject`, {
    method: "POST",
    headers: authHeaders(token),
    body: note?.trim() ? { note: note.trim() } : {},
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

export async function deleteTerm(
  id: number,
  token?: string,
): Promise<AuthorApiResult<TermRecord>> {
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
  const uploadFile = await compressImageForUpload(file, type);
  const form = new FormData();
  form.append("file", uploadFile);
  const tok = token ?? getSessionToken() ?? undefined;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: tok ? { authorization: `Bearer ${tok}` } : {},
      credentials: "include",
      body: form,
    });
    const payload = res.headers
      .get("content-type")
      ?.includes("application/json")
      ? await res.json()
      : null;
    if (!res.ok) {
      return {
        ok: false,
        error: {
          message: payload?.message ?? `Upload failed (${res.status})`,
          status: res.status,
        },
      };
    }
    return { ok: true, data: payload as { url: string } };
  } catch (e) {
    return {
      ok: false,
      error: {
        message: e instanceof Error ? e.message : "Network error",
        status: 0,
      },
    };
  }
}
