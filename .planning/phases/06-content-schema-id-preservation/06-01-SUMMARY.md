# Phase 6 Plan 1: Content Schema & ETL Contracts Summary

**Phase:** 06-content-schema-id-preservation  
**Plan:** 01  
**Duration:** ~15 minutes  
**Completed:** 2026-04-07  
**Requirements:** CONTENT-01, CONTENT-02

## What Was Built

Established the strict content domain schema and ETL contracts for novels and chapters with exact MySQL ID preservation. This is the contract layer that Phase 7 will implement against - no import wiring yet, just the type definitions and Prisma models.

**Key Deliverables:**
1. **Novel and Chapter Prisma models** with direct MySQL ID preservation (no autoincrement)
2. **ETL contract types** (SourceNovelRow, SourceChapterContentRow, ChapterRelation) that make source semantics explicit
3. **Comprehensive test suite** (15 tests) verifying exact-ID preservation strategy
4. **Updated MigrationStats** to include content operation counts

## Files Created/Modified

| File | Changes | Reason |
|------|---------|--------|
| `apps/api/prisma/schema.prisma` | Added Novel and Chapter models | Domain schema for content with exact ID preservation |
| `apps/api/src/etl/types.ts` | Added SourceNovelRow, SourceChapterContentRow, ChapterRelation, updated MigrationStats | ETL contracts for content source extraction |
| `apps/api/src/etl/__tests__/content-schema.spec.ts` | Created 15-test suite | Schema contract assertions and ID preservation verification |
| `apps/api/src/etl/summary-report.ts` | Added content operation counts to stats | Reporting for novel and chapter migration counts |

## Commits

| Hash | Message | Files |
|------|---------|-------|
| `b7fe49f` | feat(06-01): add exact-ID Novel and Chapter Prisma models | schema.prisma, content-schema.spec.ts |
| `2b86938` | feat(06-01): extend ETL contracts for novel and chapter content rows | types.ts (Rule 2 fix: summary-report.ts also updated) |

## Technical Highlights

### Novel Model
```prisma
model Novel {
  id            Int                @id
  title         String
  postContent   String             # Raw WordPress post_content, no parsing
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  chapters      Chapter[]          # Relationship to child chapters
  purchasedChps PurchasedChapter[] # Relationship to purchase history
  @@map("novels")
}
```

**Key Decisions:**
- `id Int @id` — Direct MySQL ID insertion, no surrogate generation
- `postContent String` — Stores raw HTML/content as-is (no parsing in Phase 6)
- Exposed `createdAt` for audit trail

### Chapter Model
```prisma
model Chapter {
  id            Int                @id         # Preserves MySQL post ID
  novelId       Int                            # Parent novel, direct relation
  novel         Novel              @relation(...) # Explicit FK to Novel
  title         String
  postContent   String             # Raw WordPress post_content
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  purchasedChps PurchasedChapter[] # Relationship to purchase history
  @@index([novelId])
  @@map("chapters")
}
```

**Key Decisions:**
- Exact-ID preservation mirrors Novel strategy
- `novelId Int` relationship ensures purchase history can link back to source novel
- Index on `novelId` for fast chapter-by-novel lookups

### ETL Contracts

```typescript
export type SourceNovelRow = {
  id: number;                    // MySQL post ID from wp_posts.ID
  title: string;                 // From wp_posts.post_title
  postContent: string;           // From wp_posts.post_content (RAW)
  createdAt: Date;               // WordPress timestamp
};

export type SourceChapterContentRow = {
  id: number;                    // MySQL post ID from wp_posts.ID
  novelId: number;               // From wp_postmeta (meta_key='chuong_with_truyen')
  title: string;                 // From wp_posts.post_title
  postContent: string;           // Raw, no parsing
  createdAt: Date;
};

export type ChapterRelation = {
  chapterId: number;             // From wp_posts.ID
  novelId: number;               // From wp_postmeta
};
```

**Why These Contracts Matter:**
- Explicit ID fields prevent accidental remapping
- No transformation fields (parsedContent, markdown, etc.) — those are Phase 7+ concerns
- Narrow scope makes source semantics unambiguous
- Type safety prevents `any` casts that hide migrations

## Test Coverage

**15 tests all passing:**
- 3 Novel model tests (schema, ID preservation, content field)
- 4 Chapter model tests (schema, ID preservation, parent relation, content field)
- 2 Schema relationship tests (PurchasedChapter refs, Novel-Chapter link)
- 4 ETL contract tests (shape verification, ID preservation enforcement)
- 2 Content migration contract tests (no transformation fields, stats inclusion)

**Test Quality:**
- Tests verify schema structure via file parsing (Prisma schema contract)
- Tests assert TypeScript type shapes at compile time
- Tests check field existence (preventing accidental schema drift)
- Tests verify ID preservation strategy across schema ↔ contracts boundary

## Deviations from Plan

**[Rule 2 - Missing Critical]** — Updated `src/etl/summary-report.ts` to include `novelUpserted` and `chapterUpserted` fields in stats output. This was required because MigrationStats type was extended but summary reporting wasn't updated — type checker caught it before execution.

**Impact:** 1 additional file modified, 0 delays. All checks pass.

## Next Phase Readiness

✓ Prisma models ready for migration wiring  
✓ ETL contracts locked in (Phase 7 can depend on them)  
✓ Test suite provides confidence in schema boundaries  
✓ No breaking changes to existing v1.0 tables

**Phase 7 can now:**
- Implement loaders that return `SourceNovelRow` and `SourceChapterContentRow`
- Call repository save functions with exact IDs
- Know that schema won't change mid-migration

## Issues Encountered

None. Plan executed exactly as written. Type-checker caught a contract mismatch early (summary-report.ts), which was fixed with a 2-line addition.

## Key Links Verified

- Novel schema → novel repository (Phase 7 concern, but schema is prepared)
- Chapter schema → chapter repository (Phase 7 concern, but schema is prepared)
- PurchasedChapter → Novel + Chapter relations (schema confirms links exist)
- ETL types → Prisma models (field names correspond exactly)

---

**Ready for:** `/gsd:execute-phase 6 --wave 2` (Plan 06-02: Loaders & Wiring)
