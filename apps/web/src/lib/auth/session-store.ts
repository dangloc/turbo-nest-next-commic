import type { SessionPayload } from "../api/types";

const SESSION_STORAGE_KEY = "reader-session";

interface SessionStorageRecord {
  user: SessionPayload["user"] | null;
  token: string | null;
}

export interface SessionState {
  user: SessionPayload["user"] | null;
  token: string | null;
  loaded: boolean;
}

function getEmptyState(loaded: boolean): SessionState {
  return { user: null, token: null, loaded };
}

export function loadSessionFromStorage(): SessionState {
  if (typeof window === "undefined") {
    return getEmptyState(false);
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return getEmptyState(true);
  }

  try {
    const parsed = JSON.parse(raw) as SessionStorageRecord;
    return {
      user: parsed.user ?? null,
      token: parsed.token ?? null,
      loaded: true,
    };
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return getEmptyState(true);
  }
}

function save(record: SessionStorageRecord) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));
}

export function persistSessionToStorage(user: SessionPayload["user"]) {
  const current = loadSessionFromStorage();
  save({
    user,
    token: current.token,
  });
}

export function persistSessionToken(token: string) {
  const current = loadSessionFromStorage();
  save({
    user: current.user,
    token,
  });
}

export function getSessionToken() {
  return loadSessionFromStorage().token;
}

export function clearSessionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
