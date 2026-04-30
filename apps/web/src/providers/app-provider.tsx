"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { type AppLocale } from "../lib/i18n";
import {
  getInitialTheme,
  saveThemeToStorage,
  applyThemeToDocument,
  type AppTheme,
} from "../lib/theme";
import type { ReactNode } from "react";
import type { SessionUser } from "../lib/api/types";
import { loadSessionFromStorage } from "../lib/auth/session-store";

interface AppContextValue {
  user: SessionUser | null;
  loaded: boolean;
  locale: AppLocale;
  setUser: (user: SessionUser | null) => void;
  setLocale: (locale: AppLocale) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const AppContext = createContext<AppContextValue>({
  user: null,
  loaded: false,
  locale: "vi",
  setUser: () => undefined,
  setLocale: () => undefined,
  theme: "light",
  setTheme: () => undefined,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("vi");
  const [theme, setTheme] = useState<AppTheme>("light");

  // Initialize user and theme on mount. Locale defaults to Vietnamese.
  useEffect(() => {
    const initialSession = loadSessionFromStorage();
    setUser(initialSession.user);
    setLoaded(initialSession.loaded);
    setTheme(getInitialTheme());
  }, []);

  // Sync locale to document language
  useEffect(() => {
    document.documentElement.lang = locale === "vi" ? "vi" : "en";
  }, [locale]);

  // Sync theme to document and persist to storage
  useEffect(() => {
    applyThemeToDocument(theme);
    saveThemeToStorage(theme);
  }, [theme]);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      loaded,
      locale,
      setLocale,
      setUser,
      theme,
      setTheme,
    }),
    [loaded, locale, user, theme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
