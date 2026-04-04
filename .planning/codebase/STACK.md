# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript - All application and shared package source in `apps/` and `packages/`

**Secondary:**
- JavaScript (ESM/CommonJS) - Tooling/config files such as `apps/web/next.config.js`, `packages/eslint-config/*.js`
- CSS - Styling in `apps/web/app/globals.css` and `apps/web/app/page.module.css`

## Runtime

**Environment:**
- Node.js >=18 (from root `package.json` engines)
- Browser runtime for Next.js App Router pages in `apps/web/app/*`

**Package Manager:**
- npm 11.x (`packageManager: npm@11.11.0` in root `package.json`)
- Lockfile: expected npm lockfile at repo root

## Frameworks

**Core:**
- Next.js 16.2.0 (`apps/web/package.json`) - Web frontend and App Router
- React 19.2.0 (`apps/web/package.json`, `packages/ui/package.json`) - UI layer
- NestJS 11 (`apps/api/package.json`) - Backend HTTP API
- Turborepo 2.9 (`turbo.json`) - Monorepo task orchestration

**Testing:**
- Jest 30 + ts-jest (`apps/api/package.json`) - API unit/e2e tests
- Supertest 7 (`apps/api/package.json`) - API endpoint assertions

**Build/Dev:**
- TypeScript 5.9.2 at root + app-local TS versions
- ESLint 9 flat-config style in all workspaces
- Prettier 3 for formatting

## Key Dependencies

**Critical:**
- `next` - app rendering/build/runtime for `apps/web`
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` - backend app bootstrapping
- `react`, `react-dom` - shared UI runtime
- `@repo/ui` - internal UI library consumed by web app
- `zod` - installed at root, available for schema validation adoption

**Infrastructure:**
- `turbo` - task graph and orchestration
- `rxjs` and `reflect-metadata` - NestJS runtime dependencies

## Configuration

**Environment:**
- Turborepo task inputs include `.env*` in `turbo.json`
- API port via `process.env.PORT` fallback to 8000 in `apps/api/src/main.ts`
- No committed `.env` contract file found in visible workspace

**Build:**
- Root orchestration: `turbo.json`
- Next app config: `apps/web/next.config.js`
- Nest config: `apps/api/nest-cli.json`, `apps/api/tsconfig*.json`
- Shared TypeScript presets: `packages/typescript-config/*.json`

## Platform Requirements

**Development:**
- Cross-platform Node/npm environment
- No mandatory Docker or local service requirement currently visible

**Production:**
- Web: Next.js Node deployment target (platform not yet specified)
- API: NestJS Node process (`node dist/main` script)
- Monorepo can build and run components independently

---

*Stack analysis: 2026-04-05*
*Update after major dependency changes*
