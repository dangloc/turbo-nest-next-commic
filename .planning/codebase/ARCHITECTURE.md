# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Monorepo with separated frontend, backend, and shared UI package

**Key Characteristics:**
- Workspace-driven build/test/lint orchestration via Turborepo
- Next.js App Router frontend in `apps/web`
- NestJS backend module/controller/service pattern in `apps/api`
- Shared presentational components in `packages/ui`

## Layers

**Frontend Layer (`apps/web`):**
- Purpose: Render UI and serve user-facing pages
- Contains: App Router layout/page components, CSS modules, static assets
- Depends on: `@repo/ui`, Next.js runtime, React
- Used by: Browser clients

**Backend Layer (`apps/api`):**
- Purpose: Expose HTTP endpoints and business logic services
- Contains: Nest module, controller, service, bootstrap entrypoint
- Depends on: NestJS framework packages
- Used by: API consumers (frontend or external clients)

**Shared Package Layer (`packages/ui`, config packages):**
- Purpose: Reuse UI building blocks and centralize lint/ts config presets
- Contains: React UI components and reusable ESLint/TS presets
- Depends on: React + repo-internal config packages
- Used by: `apps/web` and other future apps

## Data Flow

**HTTP Request Flow (API):**
1. Process starts from `apps/api/src/main.ts`
2. `NestFactory.create(AppModule)` initializes module graph
3. Request hits route handler in `apps/api/src/app.controller.ts`
4. Controller delegates to provider in `apps/api/src/app.service.ts`
5. Response is returned as plain string (`Hello World!`)

**Page Render Flow (Web):**
1. Request enters Next App Router through `apps/web/app/layout.tsx`
2. Route component `apps/web/app/page.tsx` renders
3. Shared components imported from `@repo/ui/*` are composed in page
4. Browser receives generated HTML/CSS/JS bundle

**State Management:**
- Minimal state in current starter code
- No shared persistent data layer between web and api yet

## Key Abstractions

**NestJS Module/Controller/Service:**
- Purpose: Separate routing from business logic
- Examples: `AppModule`, `AppController`, `AppService`
- Pattern: Dependency-injected provider architecture

**Shared UI Components:**
- Purpose: Cross-app reusable UI primitives
- Examples: `packages/ui/src/button.tsx`, `packages/ui/src/card.tsx`
- Pattern: Named exports with lightweight props interfaces

## Entry Points

**Web Entry:**
- Location: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- Triggers: HTTP request to Next.js web server
- Responsibilities: Compose page shell and route content

**API Entry:**
- Location: `apps/api/src/main.ts`
- Triggers: Node process start via Nest CLI scripts
- Responsibilities: Create application and listen on configured port

## Error Handling

**Strategy:**
- Framework default handling is currently used

**Patterns:**
- No explicit exception filters/interceptors/guards in API yet
- No custom error boundaries or logging wrappers in web app yet

## Cross-Cutting Concerns

**Logging:**
- Default framework/runtime output only

**Validation:**
- No request DTO validation pipeline configured yet

**Authentication:**
- Not implemented in current codebase

---

*Architecture analysis: 2026-04-05*
*Update when major patterns change*
