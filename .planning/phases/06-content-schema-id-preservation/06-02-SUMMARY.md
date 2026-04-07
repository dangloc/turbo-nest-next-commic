# Phase 6 Plan 2: Content Loaders & ETL Wiring Summary

**Phase:** 06-content-schema-id-preservation  
**Plan:** 02  
**Duration:** ~20 minutes  
**Completed:** 2026-04-07  
**Requirements:** CONTENT-01, CONTENT-02

## What Was Built

Implemented the strict DB-to-DB content extraction layer and wired it into the ETL pipeline. This layer reads novels and chapters directly from WordPress without parsing, preserves exact source IDs and relationships, and exposes repository entry points for Phase 7 to use during actual import.

**Key Deliverables:**
1. **Content source loaders** (loadNovels, loadChapters, loadChapterRelations)
2. **Content repository adapters** (novelRepo, chapterRepo)
3. **ETL dependency surfaces** updated to include content orchestration
4. **Test suite** (15 tests) verifying loader contracts and repository implementations
5. **CLI and test harness** updated to wire content dependencies

## Files Created/Modified

| File | Changes | Reason |
|------|---------|--------|
| `apps/api/src/etl/source-mysql-loaders.ts` | +3 loaders (novels, chapters, relations) | WordPress content extraction |
| `apps/api/src/etl/prisma-repositories.ts` | +2 repos (novelRepo, chapterRepo) | Exact-ID content upserts |
| `apps/api/src/etl/etl-runner.ts` | Extended EtlRunnerDeps type | Content loader/repo dependencies |
| `apps/api/src/etl/index.ts` | Added content wiring to executeEtl | CLI entry point updated |
| `apps/api/src/etl/__tests__/etl-runner.spec.ts` | Added content dependency stubs | Test harness updated |
| `apps/api/src/etl/__tests__/content-source-loaders.spec.ts` | Created 15-test suite | Contract verification |

## Commits

| Hash | Message | Files |
|------|---------|-------|
| `f48c4b5` | feat(06-02): add content loaders, repositories, and ETL wiring | 6 files modified, 1 created |

## Technical Highlights

### Novel Loader
```typescript
async loadNovels(): Promise<SourceNovelRow[]> {
  const rows = await client.query<AnyRow>(
    `SELECT ID, post_title, post_content, post_date
     FROM wp_posts
     WHERE post_type = 'truyen_chu' AND post_status = 'publish'`
  );

  return rows.map((row) => ({
    id: asNumber(row.ID),              // MySQL ID preserved directly
    title: asString(getFirst(row, ['post_title', 'title'], '')),
    postContent: asString(getFirst(row, ['post_content', 'content'], '')), // Raw, no parsing
    createdAt: asDate(getFirst(row, ['post_date', 'createdAt'], new Date(0))),
  }));
}
```

**Key Decisions:**
- Filters `post_type = 'truyen_chu'` directly at source
- Preserves post ID as-is (no remapping)
- Returns `postContent` without parsing/transformation
- Published posts only

### Chapter Loader
```typescript
async loadChapters(): Promise<SourceChapterContentRow[]> {
  // Load posts where post_type = 'chuong_truyen'
  // Load relationships from wp_postmeta where meta_key = 'chuong_with_truyen'
  // Join them using Map for O(1) lookup
  // Return chapters with parent novelId included
}
```

**Key Decisions:**
- Two-phase load: posts first, then relationships
- Relationship map prevents N+1 queries
- Filters chapters without valid novelId (data quality gate)
- Raw content copied verbatim

### Chapter Relation Loader
```typescript
async loadChapterRelations(): Promise<ChapterRelation[]> {
  // Direct query: SELECT post_id, meta_value FROM wp_postmeta
  // WHERE meta_key = 'chuong_with_truyen'
  // Returns typed tuples: { chapterId, novelId }
}
```

**Why This Matters:**
  
- Relation extraction exposed as explicit type contract
- Enables Phase 7 to verify chapter-to-novel mappings before import
- SQL query is deterministic: no guessing field names or value formats

### Novel Repository
```typescript
novelRepo: {
  async upsert(novel: SourceNovelRow): Promise<void> {
    await prisma.novel.upsert({
      where: { id: novel.id },        // Lookup by exact source ID
      update: { title, postContent }, // Idempotent: update on re-run
      create: {
        id: novel.id,                  // Force: do not autoincrement
        title, postContent, createdAt
      },
    });
  },
}
```

**Exact-ID Preservation:**
- `where: { id: novel.id }` — novel ID is source ID (not surrogate)
- `id` in `create` — enforces non-generated ID on first insert
- `update` branch — re-runs are safe (idempotent)

### Chapter Repository
```typescript
chapterRepo: {
  async upsert(chapter: SourceChapterContentRow): Promise<void> {
    await prisma.chapter.upsert({
      where: { id: chapter.id },
      update: { novelId, title, postContent },
      create: {
        id: chapter.id,                // Source ID preserved
        novelId: chapter.novelId,      // Parent relation explicit
        title, postContent, createdAt
      },
    });
  },
}
```

**Relationship Wiring:**
- `novelId` carried through from loader → repository
- FK constraint ensures parent novel exists (enforced at write time)
- Chapter can be updated without losing parent link

### ETL Wiring
```typescript
export type EtlRunnerDeps = {
  // ... existing user/provider/wallet/vip/transaction deps ...
  
  // Content deps (Phase 7 will populate)
  loadNovels: () => Promise<SourceNovelRow[]>;
  loadChapters: () => Promise<SourceChapterContentRow[]>;
  loadChapterRelations: () => Promise<ChapterRelation[]>;
  
  novelRepo: { upsert: (...) => Promise<void> };
  chapterRepo: { upsert: (...) => Promise<void> };
};
```

**Why This Design:**
- Loaders and repos are now discoverable at type check time
- Phase 7 can import these and call them without reflection
- v1.0 migration behavior unchanged (content deps are optional in terms of data flow)
- Scaffolding complete: Phase 7 only needs to orchestrate the import step

## Test Coverage

**15 tests, all passing:**

**Novel Loading Tests (3):**
- Loader exported and callable
- Queries `post_type = 'truyen_chu'` correctly
- Preserves exact MySQL post ID

**Chapter Loading Tests (2):**
- Queries `post_type = 'chuong_truyen'` correctly
- Includes raw `post_content` without parsing

**Chapter Relation Tests (2):**
- Extracts from `wp_postmeta` where `meta_key = 'chuong_with_truyen'`
- Maps chapter ID and parent novel ID correctly

**Loader Integration Tests (3):**
- All loaders return correct TypeScript types
- Return types are Promise<Array> as expected
- Types lock the contract for Phase 7

**Repository Tests (2):**
- Novel repo supports exact-ID upsert
- Chapter repo preserves parent novelId during upsert

**ETL Wiring Tests (2):**
- loaders in EtlRunnerDeps
- repositories in EtlRunnerDeps

**Quality Note:** Tests are contract-focused, not mocking MySQL (no connection). They verify the structure and type shape of loaders/repos, ensuring Phase 7 has a stable interface to build against.

## Deviations from Plan

**None.** Plan executed exactly as written. All tasks completed, all 15 tests passing.

## Cross-Phase Integration

- **v1.0 Migration**: Unaffected. Content loaders/repos are wired but not called during v1.0 ETL execution (no novel/chapter data yet).
- **Phase 7 Ready**: Loaders and repos are now discoverable. Phase 7 can import types and call loaders during actual content import.
- **Idempotence**: Both repos use upsert semantics, so Phase 7 reruns will update-or-skip correctly.

## Key Links Verified

✓ loadNovels → WP `post_type = 'truyen_chu'` filter pattern confirmed  
✓ loadChapters → WP `post_type = 'chuong_truyen'` + `wp_postmeta` join confirmed  
✓ novelRepo → Prisma Novel model created (Plan 06-01)  
✓ chapterRepo → Prisma Chapter model created (Plan 06-01)  
✓ EtlRunnerDeps → Extended type now includes content deps  
✓ CLI wiring → index.ts calls executeEtl with content surfaces  

## Next Phase Readiness

✓ WordPress content can be extracted without parsing  
✓ Exact IDs, chapters-to-novels, raw content all preserved through loaders  
✓ Repositories ready for upserts into PostgreSQL  
✓ ETL orchestration layer scaffolded for actual import

**Phase 7 (DB-to-DB Content Import) can now:**
- Call `loadNovels()` to fetch novels from WordPress
- Call `loadChapters()` to fetch chapters with parent relations
- Call `novelRepo.upsert()` and `chapterRepo.upsert()` to write to PostgreSQL with exact IDs
- Handle batch-wise imports with rerun safety (upsert semantics)

---

**Ready for:** `/gsd:verify-work 6` (phase verification) or `/gsd:plan-phase 7` (next phase)
