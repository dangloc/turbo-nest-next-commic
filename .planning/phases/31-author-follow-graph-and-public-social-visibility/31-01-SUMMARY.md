# Phase 31 Plan 01 Summary: Backend Author Follow Graph

Status: Complete
Phase: 31-author-follow-graph-and-public-social-visibility
Plan: 01 of 02
Wave: 1 of 2
Requirements Addressed: CREATOR-01, CREATOR-02

## What Was Built

Implemented backend follow-graph persistence and APIs for idempotent follow/unfollow behavior, plus public profile projection of follower state.

### Task 1: Follow graph schema and contracts

- Added `AuthorFollow` model in `apps/api/prisma/schema.prisma` with:
  - unique relation (`followerId`, `authorId`)
  - indexed follower/author lookups
  - cascade delete relations to `User`
- Added `User` relations:
  - `followingAuthors`
  - `authorFollowers`
- Extended reader contracts in `apps/api/src/reader/types.ts`:
  - `AuthorStats` now includes `followerCount` and `viewerFollowsAuthor`
  - added `AuthorFollowResult`

### Task 2: Service/controller behavior and tests

- Added service methods in `apps/api/src/reader/reader.service.ts`:
  - `followAuthor(userId, authorId)` (idempotent with P2002 guard)
  - `unfollowAuthor(userId, authorId)` (idempotent delete-many)
  - `getAuthorProfile(...)` now includes follower count and viewer follow state
- Added authenticated routes in `apps/api/src/reader/reader-personal.controller.ts`:
  - `POST /reader/me/follows/authors/:authorId`
  - `DELETE /reader/me/follows/authors/:authorId`
- Updated `apps/api/src/reader/reader-discovery.controller.ts` to pass optional viewer id into profile projection.
- Added follow-graph tests in `apps/api/src/reader/__tests__/reader-author-follow.spec.ts`.
- Updated profile tests in `apps/api/src/reader/__tests__/reader-author-profile.spec.ts`.

## Verification

Automated checks run:
- `npm run prisma:validate` -> PASS
- `npm run prisma:generate` -> PASS
- `npm run check-types` -> PASS
- `npm test -- --runInBand src/reader/__tests__/reader-author-follow.spec.ts src/reader/__tests__/reader-author-profile.spec.ts` -> PASS

## Outcome

Backend now supports idempotent reader follow/unfollow mutations and public author profile follower-state visibility required for frontend integration.