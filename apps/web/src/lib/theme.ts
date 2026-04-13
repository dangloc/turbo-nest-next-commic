/**
 * Theme management utilities for dark/light mode
 * Implements system preference detection, persistence, and document updates
 */

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'commic-theme';

/**
 * Detect the user's preferred theme from system settings
 */
export function detectSystemTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  
  const isDarkPreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDarkPreferred ? 'dark' : 'light';
}

/**
 * Load theme from persistent storage (localStorage)
 */
export function loadThemeFromStorage(): AppTheme | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored as AppTheme;
    }
  } catch (e) {
    // localStorage access may fail in some contexts
  }
  
  return null;
}

/**
 * Save theme to persistent storage
 */
export function saveThemeToStorage(theme: AppTheme): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    // localStorage access may fail in some contexts
  }
}

/**
 * Apply theme to document by setting/removing dark class on html element
 */
export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  
  const htmlElement = document.documentElement;
  
  if (theme === 'dark') {
    htmlElement.classList.add('dark');
  } else {
    htmlElement.classList.remove('dark');
  }
}

/**
 * Get the initial theme: from storage, then system preference
 */
export function getInitialTheme(): AppTheme {
  const stored = loadThemeFromStorage();
  if (stored) return stored;
  
  return detectSystemTheme();
}
