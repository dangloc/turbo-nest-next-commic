# ✨ Language Selector & Dark Mode - Quick Reference

## What Was Added

### 🌐 Language Selector
- **Location:** Top-right header dropdown
- **Options:** Vietnamese (Tiếng Việt) / English
- **Behavior:** Instantly changes locale across entire app
- **Persistence:** Uses existing locale context (no storage yet)

### 🌙 Dark Mode Toggle
- **Location:** Next to language selector
- **Icon:** Sun ☀️ (light mode) / Moon 🌙 (dark mode)
- **Behavior:** Toggles dark theme on whole app
- **Persistence:** ✅ Saved to localStorage via `commic-theme` key
- **System Detect:** ✅ Auto-detects system dark mode preference on first visit

## Component Architecture

```
app/layout.tsx (Root)
  ├─ AppProvider (with theme state)
  │  ├─ Header component
  │  │  ├─ Select (language dropdown)
  │  │  └─ Button (dark mode toggle)
  │  └─ Page content (all child pages)
  └─ globals.css (dark mode variables)
```

## CSS Variable System

**Light Mode (default):**
- Background: `#f4f1ea` (warm beige)
- Text: `#1f1c1a` (dark brown)
- Accent: `#b85c2f` (warm orange)

**Dark Mode (html.dark):**
- Background: `#0f0f0f` (pure black)
- Text: `#f5f5f5` (light gray)
- Accent: `#d97706` (bright orange)

All components use `var(--accent, fallback)` for automatic dark mode support.

## Usage in Components

### Accessing Theme/Locale in Components

```typescript
import { useContext } from "react";
import { AppContext } from "../providers/app-provider";

export function MyComponent() {
  const { theme, locale, setTheme, setLocale } = useContext(AppContext);
  
  // Use theme: "light" or "dark"
  // Use locale: "vi" or "en"
  
  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      Toggle Theme
    </button>
  );
}
```

### Building Bilingual UI

```typescript
const copy = locale === "vi" 
  ? { label: "Chế độ tối" }
  : { label: "Dark mode" };

return <span>{copy.label}</span>;
```

## Browser Support

| Feature | Support |
|---------|---------|
| System theme detection | ✅ All modern browsers |
| localStorage persistence | ✅ All modern browsers |
| CSS custom properties | ✅ IE 11+ (fallbacks used) |
| SVG icons | ✅ All modern browsers |

## Next Steps

### To Use Dark Mode in New Components

1. Import `useContext` and `AppContext`
2. Extract `{ theme }` from context
3. Apply styles conditionally or use CSS variables

Example:
```typescript
const { theme } = useContext(AppContext);
const boxColor = theme === "dark" ? "#1a1a1a" : "#fffaf2";
```

### To Add More Languages

1. Update `AppLocale` type in `apps/web/src/lib/i18n.ts`
2. Add language option to Select in `Header`
3. Update bilingual copy objects in components

### To Add More Themes

1. Add new CSS variables to `globals.css` (e.g., `html.sepia { ... }`)
2. Update `AppTheme` type
3. Add theme option to Button or create theme selector menu

## File Reference

| File | Purpose |
|------|---------|
| `apps/web/src/lib/theme.ts` | Theme detection & persistence |
| `apps/web/src/components/header.tsx` | Language + theme controls |
| `apps/web/src/providers/app-provider.tsx` | Context with theme state |
| `packages/ui/src/button.tsx` | Button component (variants) |
| `packages/ui/src/select.tsx` | Select/dropdown component |
| `apps/web/app/globals.css` | Dark mode CSS variables |

## Troubleshooting

### Theme not persisting?
- Check browser localStorage is enabled
- Verify `saveThemeToStorage()` is called in AppProvider

### Language not changing?
- Verify component uses `useContext(AppContext)`
- Check bilingual copy objects are defined
- Ensure locale is set in context value

### CSS variables not updating?
- Verify `applyThemeToDocument()` adds/removes "dark" class
- Check globals.css has `html.dark { ... }` selectors
- Clear browser cache

## TypeScript Types

```typescript
type AppTheme = 'light' | 'dark';
type AppLocale = 'vi' | 'en';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  style?: CSSProperties;
  className?: string;
  ["aria-label"]?: string;
}

interface ButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick?: () => void;
  // ... other props
}
```

## Status

✅ **Implemented:** Theme toggle, language selector, persistence, system detection
✅ **Tested:** TypeScript compilation (zero errors)
✅ **Integrated:** Header on all pages via layout
✅ **Ready:** Deploy and test in browser

---
Last updated: 2026-04-13 | Session: Localization Phase 3
