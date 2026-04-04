<!-- GSD:project-start source:PROJECT.md -->
## Project

**WordPress to NestJS Migration**

This project rebuilds a legacy novel-reading / webcomic platform from WordPress onto a NestJS backend with PostgreSQL and Prisma. The immediate focus is a safe one-time migration that preserves user financial balances, social login links, password hashes, VIP status, and purchased chapters without data loss.

**Core Value:** Preserve every financially or identity-sensitive record during the migration, with a repeatable ETL process and verifiable totals.

### Constraints

- **Data Integrity**: Preserve financial balances, Google social IDs, and purchased chapter history exactly — these are the highest-risk records.
- **Compatibility**: Retain WordPress phpass password hashes — users must still be able to authenticate after migration.
- **Scale**: Purchased chapters may contain millions of rows — migration must use chunked batch writes instead of per-row inserts.
- **Source/Target**: Read from MySQL and write to PostgreSQL — the script must bridge two databases cleanly.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript - All application and shared package source in `apps/` and `packages/`
- JavaScript (ESM/CommonJS) - Tooling/config files such as `apps/web/next.config.js`, `packages/eslint-config/*.js`
- CSS - Styling in `apps/web/app/globals.css` and `apps/web/app/page.module.css`
## Runtime
- Node.js >=18 (from root `package.json` engines)
- Browser runtime for Next.js App Router pages in `apps/web/app/*`
- npm 11.x (`packageManager: npm@11.11.0` in root `package.json`)
- Lockfile: expected npm lockfile at repo root
## Frameworks
- Next.js 16.2.0 (`apps/web/package.json`) - Web frontend and App Router
- React 19.2.0 (`apps/web/package.json`, `packages/ui/package.json`) - UI layer
- NestJS 11 (`apps/api/package.json`) - Backend HTTP API
- Turborepo 2.9 (`turbo.json`) - Monorepo task orchestration
- Jest 30 + ts-jest (`apps/api/package.json`) - API unit/e2e tests
- Supertest 7 (`apps/api/package.json`) - API endpoint assertions
- TypeScript 5.9.2 at root + app-local TS versions
- ESLint 9 flat-config style in all workspaces
- Prettier 3 for formatting
## Key Dependencies
- `next` - app rendering/build/runtime for `apps/web`
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` - backend app bootstrapping
- `react`, `react-dom` - shared UI runtime
- `@repo/ui` - internal UI library consumed by web app
- `zod` - installed at root, available for schema validation adoption
- `turbo` - task graph and orchestration
- `rxjs` and `reflect-metadata` - NestJS runtime dependencies
## Configuration
- Turborepo task inputs include `.env*` in `turbo.json`
- API port via `process.env.PORT` fallback to 8000 in `apps/api/src/main.ts`
- No committed `.env` contract file found in visible workspace
- Root orchestration: `turbo.json`
- Next app config: `apps/web/next.config.js`
- Nest config: `apps/api/nest-cli.json`, `apps/api/tsconfig*.json`
- Shared TypeScript presets: `packages/typescript-config/*.json`
## Platform Requirements
- Cross-platform Node/npm environment
- No mandatory Docker or local service requirement currently visible
- Web: Next.js Node deployment target (platform not yet specified)
- API: NestJS Node process (`node dist/main` script)
- Monorepo can build and run components independently
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Nest app files use descriptive suffixes: `*.module.ts`, `*.controller.ts`, `*.service.ts`
- Tests use spec naming: `*.spec.ts`, `*.e2e-spec.ts`
- UI package files are concise lower-case names (`button.tsx`, `card.tsx`)
- `camelCase` function and method names (`getHello`, `bootstrap`)
- React components use `PascalCase` (`ThemeImage`, `RootLayout`, `Button`)
- `camelCase` for variables/props
- `UPPER_SNAKE_CASE` not prominently used yet in starter code
- Type aliases/interfaces use `PascalCase` (`Props`, `ButtonProps`)
- Prefer `type` imports where useful in Next app (`type Metadata`, `type ImageProps`)
## Code Style
- Prettier 3 in root and API scripts
- API code style currently favors single quotes and semicolons
- Web/package UI starter code uses double quotes with semicolons
- Existing repo currently has mixed quote style across workspaces
- ESLint flat config across repo
- Shared configs in `packages/eslint-config/`
- API adds TypeScript type-aware linting with `projectService: true`
- Turbo warns on undeclared env vars via shared rule
## Import Organization
- Small files generally avoid large grouped sections
- Type imports are often inline or prefixed with `type`
- Internal workspace package imports via package name (`@repo/ui/*`)
- No custom alias like `@/` observed in app source files provided
## Error Handling
- Framework defaults dominate current starter code
- No custom error types in API or web yet
- Minimal explicit `try/catch` in current files
- API route returns static string, so domain errors not yet modeled
- Future features should define a consistent service/controller error boundary
## Logging
- No dedicated logging library detected
- Current behavior relies on runtime/framework defaults
- No structured logging convention implemented yet
## Comments
- Current source uses very few comments
- Config files include concise explanatory comments where helpful
- Not currently used in starter runtime source
- No TODO tagging pattern observed in visible files
## Function Design
- Functions are intentionally small in starter template
- Props objects for React components
- Constructor injection for Nest controller dependencies
- Explicit return values in service/controller methods
## Module Design
- Named exports in shared UI package
- Default exports used for Next page/layout modules
- `packages/ui` uses package export map instead of `index.ts` barrels
- Direct source-file subpath imports are expected (`@repo/ui/button`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Workspace-driven build/test/lint orchestration via Turborepo
- Next.js App Router frontend in `apps/web`
- NestJS backend module/controller/service pattern in `apps/api`
- Shared presentational components in `packages/ui`
## Layers
- Purpose: Render UI and serve user-facing pages
- Contains: App Router layout/page components, CSS modules, static assets
- Depends on: `@repo/ui`, Next.js runtime, React
- Used by: Browser clients
- Purpose: Expose HTTP endpoints and business logic services
- Contains: Nest module, controller, service, bootstrap entrypoint
- Depends on: NestJS framework packages
- Used by: API consumers (frontend or external clients)
- Purpose: Reuse UI building blocks and centralize lint/ts config presets
- Contains: React UI components and reusable ESLint/TS presets
- Depends on: React + repo-internal config packages
- Used by: `apps/web` and other future apps
## Data Flow
- Minimal state in current starter code
- No shared persistent data layer between web and api yet
## Key Abstractions
- Purpose: Separate routing from business logic
- Examples: `AppModule`, `AppController`, `AppService`
- Pattern: Dependency-injected provider architecture
- Purpose: Cross-app reusable UI primitives
- Examples: `packages/ui/src/button.tsx`, `packages/ui/src/card.tsx`
- Pattern: Named exports with lightweight props interfaces
## Entry Points
- Location: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- Triggers: HTTP request to Next.js web server
- Responsibilities: Compose page shell and route content
- Location: `apps/api/src/main.ts`
- Triggers: Node process start via Nest CLI scripts
- Responsibilities: Create application and listen on configured port
## Error Handling
- Framework default handling is currently used
- No explicit exception filters/interceptors/guards in API yet
- No custom error boundaries or logging wrappers in web app yet
## Cross-Cutting Concerns
- Default framework/runtime output only
- No request DTO validation pipeline configured yet
- Not implemented in current codebase
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
