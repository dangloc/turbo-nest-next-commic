# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**Payment Processing:**
- None detected in committed source or manifests

**Email/SMS:**
- None detected

**External APIs:**
- None detected in current app code (`apps/api/src/*`, `apps/web/app/*`)
- Current API endpoint is local-only hello response in `apps/api/src/app.controller.ts`

## Data Storage

**Databases:**
- No database dependency or ORM configuration detected
- No `prisma/`, migration folders, or DB client packages found in visible manifests

**File Storage:**
- No external object storage integration detected

**Caching:**
- No Redis/memcached integration detected

## Authentication & Identity

**Auth Provider:**
- None detected
- API currently exposes anonymous GET route only

**OAuth Integrations:**
- None detected

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Datadog/New Relic deps)

**Analytics:**
- None detected

**Logs:**
- Default runtime logs only (Nest/Node stdout)
- No structured logging framework configured

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in repository files provided
- Web app is deployable as standard Next.js app
- API app is deployable as standard Node NestJS process

**CI Pipeline:**
- No visible CI workflow files in provided workspace tree
- Quality gates are script-driven via npm/turbo (`lint`, `check-types`, tests)

## Environment Configuration

**Development:**
- `.env*` patterns are considered by Turborepo task hashing in `turbo.json`
- API supports `PORT` env variable in `apps/api/src/main.ts`

**Staging:**
- No explicit staging configuration found

**Production:**
- No explicit secret manager integration found
- Environment variable contract is currently implicit in code

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

---

*Integration audit: 2026-04-05*
*Update when adding/removing external services*
