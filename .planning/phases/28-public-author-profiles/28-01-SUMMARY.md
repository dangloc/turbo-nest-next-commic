# Phase 28 Plan 01 Summary: Public Author Profile Backend Contract

Status: Complete
Requirements Addressed: AUTHOR-01, AUTHOR-03
Phase: 28-public-author-profiles
Plan: 01 of 02
Wave: 1 of 2

## What Was Built

Implemented a public author profile API contract in the reader module with identity fallback, live aggregate stats, and paginated author catalog payload.

### Task 1 (RED + contracts)

- Added author profile response/query contracts in `apps/api/src/reader/types.ts`.
- Added failing RED tests in `apps/api/src/reader/__tests__/reader-author-profile.spec.ts` for:
  - penName -> nickname display fallback
  - not-found behavior for missing author user
  - aggregate stats shape and values

### Task 2 (GREEN implementation)

- Added `GET /reader/authors/:id` in `apps/api/src/reader/reader-discovery.controller.ts`.
- Implemented `getAuthorProfile()` in `apps/api/src/reader/reader.service.ts` with:
  - public access (no auth guard)
  - `AuthorProfile` + `User` identity payload (displayName fallback)
  - aggregate stats computed live (`count`, `_sum(viewCount)`, latest update date)
  - paginated catalog sorted by query params (default latest updated first)
  - deterministic 404 for unknown author IDs
- Updated Prisma schema with optional `AuthorProfile.bio` in `apps/api/prisma/schema.prisma`.

## Verification

Automated checks run:
- `npm test -- --runInBand src/reader/__tests__/reader-author-profile.spec.ts` (RED checkpoint before implementation) -> FAIL as expected
- `npm run prisma:generate` -> PASS
- `npm test -- --runInBand src/reader/__tests__/reader-author-profile.spec.ts src/reader/__tests__/reader-discovery.spec.ts` -> PASS
- `npm run check-types` -> PASS

## Commits (apps/api)

- `291e6ec` test(28-01): add failing author profile contracts and specs
- `268d58c` feat(28-01): add public author profile endpoint and live stats

## Notes

- `AuthorProfile.bio` was introduced to satisfy the locked profile data contract requiring bio support.
- Catalog `viewCount` is normalized to `number` in API response for frontend contract compatibility.
