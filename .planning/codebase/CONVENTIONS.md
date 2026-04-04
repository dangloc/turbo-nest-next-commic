# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- Nest app files use descriptive suffixes: `*.module.ts`, `*.controller.ts`, `*.service.ts`
- Tests use spec naming: `*.spec.ts`, `*.e2e-spec.ts`
- UI package files are concise lower-case names (`button.tsx`, `card.tsx`)

**Functions:**
- `camelCase` function and method names (`getHello`, `bootstrap`)
- React components use `PascalCase` (`ThemeImage`, `RootLayout`, `Button`)

**Variables:**
- `camelCase` for variables/props
- `UPPER_SNAKE_CASE` not prominently used yet in starter code

**Types:**
- Type aliases/interfaces use `PascalCase` (`Props`, `ButtonProps`)
- Prefer `type` imports where useful in Next app (`type Metadata`, `type ImageProps`)

## Code Style

**Formatting:**
- Prettier 3 in root and API scripts
- API code style currently favors single quotes and semicolons
- Web/package UI starter code uses double quotes with semicolons
- Existing repo currently has mixed quote style across workspaces

**Linting:**
- ESLint flat config across repo
- Shared configs in `packages/eslint-config/`
- API adds TypeScript type-aware linting with `projectService: true`
- Turbo warns on undeclared env vars via shared rule

## Import Organization

**Order (observed):**
1. External framework imports
2. Internal package imports (e.g., `@repo/ui/button`)
3. Relative imports

**Grouping:**
- Small files generally avoid large grouped sections
- Type imports are often inline or prefixed with `type`

**Path Aliases:**
- Internal workspace package imports via package name (`@repo/ui/*`)
- No custom alias like `@/` observed in app source files provided

## Error Handling

**Patterns:**
- Framework defaults dominate current starter code
- No custom error types in API or web yet
- Minimal explicit `try/catch` in current files

**Error Types:**
- API route returns static string, so domain errors not yet modeled
- Future features should define a consistent service/controller error boundary

## Logging

**Framework:**
- No dedicated logging library detected
- Current behavior relies on runtime/framework defaults

**Patterns:**
- No structured logging convention implemented yet

## Comments

**When to Comment:**
- Current source uses very few comments
- Config files include concise explanatory comments where helpful

**JSDoc/TSDoc:**
- Not currently used in starter runtime source

**TODO Comments:**
- No TODO tagging pattern observed in visible files

## Function Design

**Size:**
- Functions are intentionally small in starter template

**Parameters:**
- Props objects for React components
- Constructor injection for Nest controller dependencies

**Return Values:**
- Explicit return values in service/controller methods

## Module Design

**Exports:**
- Named exports in shared UI package
- Default exports used for Next page/layout modules

**Barrel Files:**
- `packages/ui` uses package export map instead of `index.ts` barrels
- Direct source-file subpath imports are expected (`@repo/ui/button`)

---

*Convention analysis: 2026-04-05*
*Update when patterns change*
