# Phase 14 Plan 01 Summary

## Objective
Implemented Google OAuth user verification and role-based access control (RBAC) foundations for the Nest API.

## Tasks Completed

1. Google OAuth strategy with legacy account linking
- Added `GoogleStrategy` using Passport Google OAuth (`google` provider).
- Linking flow implemented in order: `UserProvider(provider, providerId)` -> `User(email)` -> create new `User` + `UserProvider` + `Wallet`.
- New users are created with default role `USER` and initialized wallet balances.

2. Roles decorator and RolesGuard middleware
- Added `@Roles(...roles)` decorator and exported `ROLES_KEY` metadata key.
- Added `RolesGuard` with explicit `UnauthorizedException` (missing user) and `ForbiddenException` (role mismatch).
- Guard supports handler/class metadata lookup via `Reflector.getAllAndOverride`.

3. App wiring and route protection
- Registered `PassportModule` and `GoogleStrategy` in `AppModule`.
- Added `NovelsController` and `UsersController` endpoints with `@UseGuards(RolesGuard)` + `@Roles(...)` on protected routes.
- Added owner/admin rule for novel update path and admin-only user-role update endpoint.

## Verification

Automated checks run:
- `npm test --workspace=api -- --runInBand src/auth/__tests__/google.strategy.spec.ts` -> PASS (3 tests)
- `npm test --workspace=api -- --runInBand src/auth/__tests__/roles.guard.spec.ts` -> PASS (5 tests)
- `npm test --workspace=api -- --runInBand src/novels/__tests__/novels.controller.spec.ts` -> PASS (4 tests)
- `npm run check-types --workspace=api` -> PASS
- `npm test --workspace=api -- --runInBand` (regression sweep) -> PASS (20 suites, 91 tests)

## Commits (apps/api)

- Task 1: `3a174e6` - Google OAuth strategy + linking tests
- Task 2: `3fca687` - Roles decorator/guard + tests
- Task 3: `8778075` - App wiring + protected controllers + RBAC integration tests

## Deviations from Plan

1. [Rule 3 - Blocking] Missing application modules
- The phase plan referenced `novels.controller.ts` and `users.controller.ts`, but this repository only had base app + ETL files.
- Implemented minimal `NovelsController`, `UsersController`, and `PrismaService` to satisfy plan wiring and testability.

2. [Rule 3 - Blocking] Missing auth dependencies
- Added required packages for Passport integration:
  - `@nestjs/passport`
  - `passport`
  - `passport-google-oauth20`
  - `@types/passport-google-oauth20` (dev)

## Known Constraint

- Prisma `Role` enum currently includes `USER` and `ADMIN` only.
- Route guard accepts `'AUTHOR'` in metadata as requested by plan, but persisted user roles are constrained by the current schema.
- Full AUTHOR lifecycle requires a follow-up schema expansion if AUTHOR must be stored in DB role enum.

## Outcome

Phase 14 Plan 01 execution completed successfully with automated verification passing and no regressions detected.
