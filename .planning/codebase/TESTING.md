# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- Jest 30 in `apps/api/package.json`
- `ts-jest` transform configured in API package manifest

**Assertion Library:**
- Jest built-in `expect`
- Supertest assertions for HTTP responses

**Run Commands:**
```bash
npm run test --workspace=api           # API unit tests
npm run test:e2e --workspace=api       # API e2e tests
npm run test:cov --workspace=api       # Coverage
npm run test:watch --workspace=api     # Watch mode
```

## Test File Organization

**Location:**
- API unit tests co-located in `apps/api/src/*.spec.ts`
- API e2e tests in dedicated `apps/api/test/` folder
- No tests currently visible in `apps/web` or `packages/ui`

**Naming:**
- Unit: `*.spec.ts`
- E2E: `*.e2e-spec.ts`

**Structure:**
- `apps/api/src/app.controller.spec.ts`
- `apps/api/test/app.e2e-spec.ts`

## Test Structure

**Suite Organization:**
- Nested `describe` blocks for module/route grouping
- `beforeEach` for per-test module/app setup
- `afterEach` used in e2e to close Nest app instance

**Patterns:**
- Arrange via Nest `Test.createTestingModule`
- Act through controller method calls or Supertest requests
- Assert expected response values/status codes

## Mocking

**Framework:**
- Nest TestingModule dependency injection for controlled test assembly
- No heavy explicit jest.mock usage in current starter tests

**Patterns:**
- Unit test composes controller + real service provider
- E2E test initializes full app module and exercises HTTP interface

**What to Mock:**
- For future features: external APIs, databases, and side-effect services

**What NOT to Mock:**
- Keep simple internal business logic unmocked in unit tests where practical

## Fixtures and Factories

**Test Data:**
- Current tests use inline expected values (no shared fixtures yet)

**Location:**
- No dedicated fixtures/factories directory currently present

## Coverage

**Requirements:**
- No explicit global threshold configured in visible config
- Coverage output configured to `apps/api/coverage`

**Configuration:**
- `collectCoverageFrom` and `coverageDirectory` defined in API package Jest config

**View Coverage:**
```bash
npm run test:cov --workspace=api
```

## Test Types

**Unit Tests:**
- API controller unit behavior (`apps/api/src/app.controller.spec.ts`)

**Integration Tests:**
- E2E path in API test folder effectively provides integration coverage

**E2E Tests:**
- Supertest against Nest HTTP server lifecycle

## Common Patterns

**Async Testing:**
- Async setup and teardown around Nest app creation (`beforeEach`/`afterEach`)

**Error Testing:**
- Not demonstrated yet in starter tests; should be added with feature growth

**Snapshot Testing:**
- Not used in current codebase

---

*Testing analysis: 2026-04-05*
*Update when test patterns change*
