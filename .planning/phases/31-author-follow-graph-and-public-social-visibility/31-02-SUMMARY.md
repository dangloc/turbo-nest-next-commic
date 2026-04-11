# Phase 31 Plan 02 Summary: Frontend Author Follow Visibility and CTA

Status: Complete
Phase: 31-author-follow-graph-and-public-social-visibility
Plan: 02 of 02
Wave: 2 of 2
Requirements Addressed: CREATOR-01, CREATOR-02

## What Was Built

Integrated author follow/unfollow interaction and follower-state rendering into the public author profile page.

### Task 1: Author profile contracts and API wrappers

- Extended `apps/web/src/features/author-profile/types.ts`:
  - `AuthorStats` includes `followerCount` and `viewerFollowsAuthor`
  - added `AuthorFollowResult`
- Updated `apps/web/src/features/author-profile/api.ts`:
  - auth-aware `fetchAuthorProfile(...)` (credentials + bearer token when present)
  - `followAuthor(authorId)` wrapper for `POST /reader/me/follows/authors/:authorId`
  - `unfollowAuthor(authorId)` wrapper for `DELETE /reader/me/follows/authors/:authorId`

### Task 2: Author profile UI follow behavior

- Updated `apps/web/src/features/author-profile/author-profile.tsx`:
  - renders follower count chip in profile stats
  - renders follow/unfollow CTA for authenticated viewers
  - applies mutation results without full-page reload
  - displays sign-in prompt CTA for unauthenticated visitors
  - shows inline mutation error feedback
- Added styling in `apps/web/app/globals.css` for:
  - follow action button states
  - sign-in prompt button
  - inline follow error state

## Verification

Automated checks run:
- `npm run check-types` (apps/web) -> PASS
- `npm run lint -- --no-warn-ignored src/features/author-profile/types.ts src/features/author-profile/api.ts src/features/author-profile/author-profile.tsx app/author/[id]/page.tsx app/globals.css` -> PASS

## Outcome

Public author profiles now display social proof (followers) and provide stable follow/unfollow actions for authenticated readers while preserving a clear sign-in prompt for unauthenticated users.