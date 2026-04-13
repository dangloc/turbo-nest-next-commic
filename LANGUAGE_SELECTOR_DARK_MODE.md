# Language Selector & Dark Mode Implementation Summary

## Overview
Added a **Header component** with a **language selector** (Vietnamese/English) and **dark mode toggle** (sun/moon icon) to the Commic web app. Both features use shadcn UI-inspired components with CSS variables for styling.

## Components Created

### 1. Theme Management (`apps/web/src/lib/theme.ts`)
Core utilities for dark mode:
- `detectSystemTheme()` — Detects system color scheme preference
- `loadThemeFromStorage()` — Retrieves persisted theme from localStorage
- `saveThemeToStorage()` — Saves theme preference
- `applyThemeToDocument()` — Adds/removes `dark` class on html element
- `getInitialTheme()` — Gets initial theme (stored or system preference)

**Type:** `AppTheme` = `'light' | 'dark'`

### 2. UI Components (in `packages/ui/src/`)

#### Button Component (`button.tsx`)
Enhanced with shadcn-like features:
- **Variants:** `default` (accent color), `ghost` (transparent), `outline` (bordered)
- **Sizes:** `default`, `sm`, `lg`, `icon`
- Uses CSS variables for theming (colors from `globals.css`)
- Hover effects with inline event handlers
- Accessibility: `aria-label`, `title` support

#### Select Component (`select.tsx`)
New dropdown component for language selection:
- Native HTML `<select>` element styled with CSS variables
- Supports options with label/value pairs
- Hover opacity transitions
- Accessibility: `aria-label` support
- Props: `value`, `onValueChange`, `options`, `style`, `aria-label`

### 3. Header Component (`apps/web/src/components/header.tsx`)
Sticky header with:
- **Language Selector:**
  - Dropdown with Vietnamese/English options
  - Calls `setLocale()` on change
  - Bilingual labels ("Ngôn ngữ" / "Language")
  
- **Dark Mode Toggle:**
  - Button with sun icon (light mode) / moon icon (dark mode)
  - Calls `setTheme()` on click
  - Bilingual aria-labels ("Chế độ tối" / "Dark mode")

- **Brand Area:** "Commic" logo text

### 4. Extended App Provider (`apps/web/src/providers/app-provider.tsx`)
Updated `AppContext` with theme state:
```typescript
interface AppContextValue {
  // Existing
  user: SessionUser | null;
  loaded: boolean;
  locale: AppLocale;
  setUser: (user: SessionUser | null) => void;
  setLocale: (locale: AppLocale) => void;
  
  // NEW
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}
```

**Initialization:**
- Detects browser theme on mount via `getInitialTheme()`
- Sets up effect to sync theme to document and localStorage
- Preserves theme preference across sessions

### 5. Root Layout (`apps/web/app/layout.tsx`)
- Includes `<Header />` component below `AppProvider`
- Sets body background color from CSS variables
- Maintains `suppressHydrationWarning` on `<html>` tag

### 6. Dark Mode Styles (`apps/web/app/globals.css`)
CSS variables for dark mode:

**Light mode (default):**
```css
--bg: #f4f1ea
--ink: #1f1c1a
--panel: #fffaf2
--line: #d7c9b2
--accent: #b85c2f
```

**Dark mode (html.dark selector):**
```css
--bg: #0f0f0f
--ink: #f5f5f5
--panel: #1a1a1a
--line: #333333
--accent: #d97706
--accent-soft: rgba(217, 119, 6, 0.12)
```

Background gradients and component styles include dark mode transitions.

## How It Works

### Theme Persistence
1. User toggles dark mode → `setTheme('dark')`
2. `useEffect` in AppProvider:
   - Calls `applyThemeToDocument('dark')` → adds `dark` class to `<html>`
   - Calls `saveThemeToStorage('dark')` → saves to localStorage
3. CSS automatically updates via CSS variable changes
4. On next visit: `loadThemeFromStorage()` retrieves saved preference

### Language Selection
1. User selects language in header dropdown → `setLocale('en')`
2. `useEffect` syncs `document.documentElement.lang = 'en'`
3. All components already use `useContext(AppContext)` to access `locale`
4. Bilingual copy objects render correct language

## Files Modified/Created

### New Files
- `apps/web/src/lib/theme.ts` — Theme utilities
- `apps/web/src/components/header.tsx` — Header with controls
- `packages/ui/src/select.tsx` — Select dropdown component

### Modified Files
- `apps/web/src/providers/app-provider.tsx` — Added theme state
- `packages/ui/src/button.tsx` — Enhanced with variants/sizes
- `apps/web/app/layout.tsx` — Added Header component
- `apps/web/app/globals.css` — Dark mode CSS variables

## Styling Approach

**Why CSS Variables Instead of Tailwind?**
- Tailwind CSS not installed in the project
- CSS variables already established in globals.css
- Provides flexibility for future theme customization
- Lighter bundle size (no additional dependencies)

**Component Styling:**
- Button: Uses inline styles with CSS variable values
- Select: Uses inline styles for consistent theming
- Header: Uses inline styles for positioning and colors
- All components respect dark mode via CSS variable overrides

## Type Safety

✅ **TypeScript:** All components fully typed
- `SelectProps` with optional `style` property
- `ButtonVariant` and `ButtonSize` unions
- `AppTheme` type = `'light' | 'dark'`
- `AppLocale` type = `'vi' | 'en'` (existing)

✅ **Compilation:** `npx tsc --noEmit` passes (exit code 0)

## Browser Support

- **System Preference Detection:** Uses `window.matchMedia('(prefers-color-scheme: dark)')`
- **LocalStorage Persistence:** Standard browser API
- **CSS Class Manipulation:** Widely supported (`document.documentElement.classList`)

## Future Enhancements

1. Add keyboard shortcuts for theme toggle
2. Add theme transition animations
3. Persist language preference (similar to theme)
4. Auto theme based on time of day
5. System theme sync (follow system changes)
6. More theme variations (sepia, high contrast)

## Testing

**Component Verification:**
- Header renders without errors
- Language selector changes locale context
- Dark mode toggle adds/removes `dark` class on html
- Theme persists via localStorage
- CSS variables update correctly

**Build Status:** ✓ `tsc --noEmit` passes (no type errors)

## Notes

- The dashboard component has a pre-existing issue with `useSearchParams()` needing Suspense boundary (Next.js 13+ requirement), unrelated to these changes
- Header is positioned sticky and always visible at top of page
- All bilingual strings follow existing i18n patterns (vi/en fallback)
- SVG icons (sun/moon) use `currentColor` style variable for dark mode compatibility
