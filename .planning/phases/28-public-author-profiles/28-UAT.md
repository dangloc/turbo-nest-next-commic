---
status: testing
phase: 28-public-author-profiles
source:
  - .planning/phases/28-public-author-profiles/28-01-SUMMARY.md
  - .planning/phases/28-public-author-profiles/28-02-SUMMARY.md
started: 2026-04-09T14:01:37+07:00
updated: 2026-04-09T14:01:37+07:00
---

## Current Test

number: 1
name: Public author route loads without authentication
expected: |
  Open /author/{existing_author_id} in a signed-out browser session. The page loads successfully (no auth redirect, no unauthorized error), and displays author header content.
awaiting: user response

## Tests

### 1. Public author route loads without authentication
expected: Open /author/{existing_author_id} signed out; page loads without redirect/auth error and shows author header.
result: pending

### 2. Author identity rendering uses fallback rules
expected: Author name renders as penName when available, otherwise nickname fallback. Avatar/bio area renders with graceful fallback copy when missing.
result: pending

### 3. Author catalog renders with discovery-consistent cards
expected: Authored novels show as discovery-style cards with title, views, updated date, and category/tag chips. Cards link to novel pages.
result: pending

### 4. Aggregate stats are visible and coherent
expected: Stats section shows total published novels, total views, and latest update date from backend payload for the author.
result: pending

### 5. Empty-state behavior for authors with no novels
expected: For an existing author that has zero novels, page stays valid and shows friendly message: This author hasn't published any novels yet.
result: pending

### 6. Not-found behavior for unknown author id
expected: Visiting /author/{non_existing_id} shows not-found error state (or equivalent not-found UX), not a blank/crash state.
result: pending

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

None yet.
