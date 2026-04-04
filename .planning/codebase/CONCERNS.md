# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

**Mixed formatting conventions across workspaces:**
- Issue: API files predominantly use single quotes while web/ui starter files use double quotes
- Why: Different scaffolding defaults merged in one monorepo
- Impact: Inconsistent diffs and avoidable lint/format churn during cross-package edits
- Fix approach: Adopt one Prettier style contract and run repo-wide format pass

**Starter-level architecture with no domain boundaries yet:**
- Issue: API remains single controller/service and web remains boilerplate landing page
- Why: Early scaffold stage
- Impact: Feature growth without module boundaries can become hard to maintain
- Fix approach: Introduce feature modules/routes as soon as first real capability is added

## Known Bugs

**Malformed query string in shared card component link template:**
- Symptoms: generated href contains trailing quote inside query string
- Trigger: rendering `Card` from `packages/ui/src/card.tsx`
- Workaround: avoid this component until fixed
- Root cause: template string in href includes extra `"` character

**Potential stale starter docs mismatch:**
- Symptoms: root `README.md` references apps like `docs` that are not in current workspace tree
- Trigger: onboarding using README as source of truth
- Workaround: rely on actual folder structure under `apps/`
- Root cause: template README not updated after customization

## Security Considerations

**No authentication or authorization layer:**
- Risk: Any future non-public endpoint could be exposed if added without guard strategy
- Current mitigation: only a public hello endpoint exists today
- Recommendations: define auth middleware/guards before adding protected resources

**No explicit input validation pipeline in API:**
- Risk: future request payload handling may accept unsafe/invalid inputs
- Current mitigation: none needed for current static response route
- Recommendations: add DTO validation (`ValidationPipe`) and schema validation once payload endpoints exist

## Performance Bottlenecks

**No caching or data optimization strategy yet:**
- Problem: architecture is fine for starter traffic but unprepared for growth
- Measurement: no production telemetry configured yet
- Cause: bootstrap template stage
- Improvement path: add observability first, then optimize based on measured hotspots

## Fragile Areas

**Nested repository metadata under `apps/api/.git`:**
- Why fragile: parent repo operations and workspace tooling can behave unexpectedly with nested git repos
- Common failures: partial commits, tooling confusion, accidental detached histories
- Safe modification: decide whether API should stay standalone or be absorbed into monorepo history
- Test coverage: not applicable; operational concern

**Direct subpath exports from `@repo/ui`:**
- Why fragile: package export map points directly to source tsx files
- Common failures: import path breakage when files are renamed/moved
- Safe modification: consider stable public entrypoints or barrel exports for larger component sets
- Test coverage: no UI package tests currently to catch regressions

## Scaling Limits

**Current backend capability is minimal:**
- Current capacity: suitable for demo-level traffic
- Limit: no persistence, no queueing, no horizontal strategy defined
- Symptoms at limit: inability to serve real product workflows
- Scaling path: add persistence layer, request validation, and production observability

## Dependencies at Risk

**Root dependency drift risk (`zod` added but not used):**
- Risk: unused dependencies increase attack surface and maintenance burden
- Impact: unnecessary updates/security audits
- Migration plan: either adopt `zod` for validation soon or remove until needed

## Missing Critical Features

**No web-to-api integration path implemented:**
- Problem: frontend and backend exist but do not communicate
- Current workaround: frontend displays static content only
- Blocks: end-to-end product behavior
- Implementation complexity: low to medium for first API client integration

**No persistence layer:**
- Problem: cannot store user/application state
- Current workaround: none
- Blocks: nearly all non-trivial features
- Implementation complexity: medium (DB selection, schema, migration path)

## Test Coverage Gaps

**No test coverage for web app and shared UI package:**
- What's not tested: React routes/components and shared UI behavior
- Risk: UI regressions can pass CI unnoticed
- Priority: High
- Difficulty to test: Low to medium (add component and route-level tests)

**No contract tests between web and api layers:**
- What's not tested: interface agreement for future integration
- Risk: integration breaks during independent app evolution
- Priority: Medium
- Difficulty to test: Medium

---

*Concerns audit: 2026-04-05*
*Update as issues are fixed or new ones discovered*
