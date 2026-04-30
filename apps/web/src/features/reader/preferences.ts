import type {
  ReaderContentWidthOption,
  ReaderFontFamilyOption,
  ReaderFontSizeOption,
  ReaderLineHeightOption,
  ReaderThemeMode,
  ReaderTypographyPreferences,
} from "./types";

export const READER_TYPOGRAPHY_DEFAULTS: ReaderTypographyPreferences = {
  fontSize: "md",
  themeMode: "light",
  fontFamily: "serif",
  lineHeight: "comfortable",
  contentWidth: "standard",
};

const STORAGE_KEYS = {
  fontSize: "reader:font-size",
  themeMode: "reader:theme",
  fontFamily: "reader:font-family",
  lineHeight: "reader:line-height",
  contentWidth: "reader:content-width",
} as const;

function parseFontSize(raw: string | null): ReaderFontSizeOption | null {
  return raw === "sm" || raw === "md" || raw === "lg" ? raw : null;
}

function parseThemeMode(raw: string | null): ReaderThemeMode | null {
  return raw === "light" || raw === "dark" ? raw : null;
}

function parseFontFamily(raw: string | null): ReaderFontFamilyOption | null {
  return raw === "serif" || raw === "sans" || raw === "mono" ? raw : null;
}

function parseLineHeight(raw: string | null): ReaderLineHeightOption | null {
  return raw === "compact" || raw === "comfortable" || raw === "airy" ? raw : null;
}

function parseContentWidth(raw: string | null): ReaderContentWidthOption | null {
  return raw === "narrow" || raw === "standard" || raw === "wide" ? raw : null;
}

export function loadReaderTypographyPreferences(): ReaderTypographyPreferences {
  if (typeof window === "undefined") {
    return READER_TYPOGRAPHY_DEFAULTS;
  }

  const next: ReaderTypographyPreferences = { ...READER_TYPOGRAPHY_DEFAULTS };

  try {
    next.fontSize = parseFontSize(window.localStorage.getItem(STORAGE_KEYS.fontSize)) ?? READER_TYPOGRAPHY_DEFAULTS.fontSize;
    next.themeMode = parseThemeMode(window.localStorage.getItem(STORAGE_KEYS.themeMode)) ?? READER_TYPOGRAPHY_DEFAULTS.themeMode;
    next.fontFamily = parseFontFamily(window.localStorage.getItem(STORAGE_KEYS.fontFamily)) ?? READER_TYPOGRAPHY_DEFAULTS.fontFamily;
    next.lineHeight = parseLineHeight(window.localStorage.getItem(STORAGE_KEYS.lineHeight)) ?? READER_TYPOGRAPHY_DEFAULTS.lineHeight;
    next.contentWidth = parseContentWidth(window.localStorage.getItem(STORAGE_KEYS.contentWidth)) ?? READER_TYPOGRAPHY_DEFAULTS.contentWidth;
  } catch {
    return READER_TYPOGRAPHY_DEFAULTS;
  }

  return next;
}

export function saveReaderTypographyPreferences(preferences: ReaderTypographyPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.fontSize, preferences.fontSize);
  window.localStorage.setItem(STORAGE_KEYS.themeMode, preferences.themeMode);
  window.localStorage.setItem(STORAGE_KEYS.fontFamily, preferences.fontFamily);
  window.localStorage.setItem(STORAGE_KEYS.lineHeight, preferences.lineHeight);
  window.localStorage.setItem(STORAGE_KEYS.contentWidth, preferences.contentWidth);
}
