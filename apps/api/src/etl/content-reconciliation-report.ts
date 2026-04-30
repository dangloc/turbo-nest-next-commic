import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';

export type ReconciliationEntityType = 'novel' | 'chapter';

export type ContentReconciliationMismatch = {
  entityType: ReconciliationEntityType;
  id: number;
  reason:
    | 'missing_in_target'
    | 'missing_in_source'
    | 'missing_parent_novel'
    | 'novel_relation_mismatch'
    | 'content_mismatch';
  sourceValue: string | number | null;
  targetValue: string | number | null;
};

export type ContentReconciliationReport = {
  generatedAt: string;
  totals: {
    sourceNovels: number;
    targetNovels: number;
    sourceChapters: number;
    targetChapters: number;
  };
  deltas: {
    novelDelta: number;
    chapterDelta: number;
  };
  integrity: {
    orphanChapters: number;
    relationMismatches: number;
    contentMismatches: number;
  };
  mismatches: ContentReconciliationMismatch[];
};

export type RerunSnapshot = {
  novels: number;
  chapters: number;
};

export type RerunSafetyReport = {
  beforeRun: RerunSnapshot;
  afterRun: RerunSnapshot;
  deltas: {
    novels: number;
    chapters: number;
  };
  duplicateGrowth: {
    novels: boolean;
    chapters: boolean;
  };
};

export type ContentReconciliationPayload = {
  generatedAt: string;
  reconciliation: ContentReconciliationReport;
  rerunSafety:
    | { skipped: true; reason: string }
    | { skipped: false; report: RerunSafetyReport };
};

type NovelSnapshot = {
  id: number;
  postContent: string;
};

type ChapterSnapshot = {
  id: number;
  novelId: number;
  postContent: string;
};

function normalizeOutputPath(filePath: string): string {
  if (isAbsolute(filePath)) return filePath;

  const normalizedPath = normalize(filePath);
  const cwd = normalize(process.cwd());
  const appApiPrefix = `apps${sep}api${sep}`;

  if (
    cwd.endsWith(`${sep}apps${sep}api`) &&
    normalizedPath.startsWith(appApiPrefix)
  ) {
    return resolve(cwd, normalizedPath.slice(appApiPrefix.length));
  }

  return resolve(cwd, normalizedPath);
}

function sortMismatches(
  mismatches: ContentReconciliationMismatch[],
): ContentReconciliationMismatch[] {
  return mismatches.sort((a, b) => {
    if (a.entityType !== b.entityType) {
      return a.entityType.localeCompare(b.entityType);
    }
    if (a.id !== b.id) {
      return a.id - b.id;
    }
    return a.reason.localeCompare(b.reason);
  });
}

export function buildContentReconciliationReport(input: {
  sourceNovels: NovelSnapshot[];
  targetNovels: NovelSnapshot[];
  sourceChapters: ChapterSnapshot[];
  targetChapters: ChapterSnapshot[];
}): ContentReconciliationReport {
  const sourceNovelMap = new Map(
    input.sourceNovels.map((row) => [row.id, row]),
  );
  const targetNovelMap = new Map(
    input.targetNovels.map((row) => [row.id, row]),
  );
  const sourceChapterMap = new Map(
    input.sourceChapters.map((row) => [row.id, row]),
  );
  const targetChapterMap = new Map(
    input.targetChapters.map((row) => [row.id, row]),
  );

  const mismatches: ContentReconciliationMismatch[] = [];

  for (const [id] of sourceNovelMap) {
    if (!targetNovelMap.has(id)) {
      mismatches.push({
        entityType: 'novel',
        id,
        reason: 'missing_in_target',
        sourceValue: id,
        targetValue: null,
      });
    }
  }

  for (const [id] of targetNovelMap) {
    if (!sourceNovelMap.has(id)) {
      mismatches.push({
        entityType: 'novel',
        id,
        reason: 'missing_in_source',
        sourceValue: null,
        targetValue: id,
      });
    }
  }

  for (const [id, sourceChapter] of sourceChapterMap) {
    const targetChapter = targetChapterMap.get(id);

    if (!targetChapter) {
      mismatches.push({
        entityType: 'chapter',
        id,
        reason: 'missing_in_target',
        sourceValue: id,
        targetValue: null,
      });
      continue;
    }

    if (!targetNovelMap.has(targetChapter.novelId)) {
      mismatches.push({
        entityType: 'chapter',
        id,
        reason: 'missing_parent_novel',
        sourceValue: sourceChapter.novelId,
        targetValue: targetChapter.novelId,
      });
    }

    if (sourceChapter.novelId !== targetChapter.novelId) {
      mismatches.push({
        entityType: 'chapter',
        id,
        reason: 'novel_relation_mismatch',
        sourceValue: sourceChapter.novelId,
        targetValue: targetChapter.novelId,
      });
    }

    if (sourceChapter.postContent !== targetChapter.postContent) {
      mismatches.push({
        entityType: 'chapter',
        id,
        reason: 'content_mismatch',
        sourceValue: sourceChapter.postContent,
        targetValue: targetChapter.postContent,
      });
    }
  }

  for (const [id] of targetChapterMap) {
    if (!sourceChapterMap.has(id)) {
      mismatches.push({
        entityType: 'chapter',
        id,
        reason: 'missing_in_source',
        sourceValue: null,
        targetValue: id,
      });
    }
  }

  const sorted = sortMismatches(mismatches);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      sourceNovels: input.sourceNovels.length,
      targetNovels: input.targetNovels.length,
      sourceChapters: input.sourceChapters.length,
      targetChapters: input.targetChapters.length,
    },
    deltas: {
      novelDelta: input.targetNovels.length - input.sourceNovels.length,
      chapterDelta: input.targetChapters.length - input.sourceChapters.length,
    },
    integrity: {
      orphanChapters: sorted.filter(
        (row) => row.reason === 'missing_parent_novel',
      ).length,
      relationMismatches: sorted.filter(
        (row) => row.reason === 'novel_relation_mismatch',
      ).length,
      contentMismatches: sorted.filter(
        (row) => row.reason === 'content_mismatch',
      ).length,
    },
    mismatches: sorted,
  };
}

export function buildRerunSafetyReport(input: {
  beforeRun: RerunSnapshot;
  afterRun: RerunSnapshot;
}): RerunSafetyReport {
  const novelsDelta = input.afterRun.novels - input.beforeRun.novels;
  const chaptersDelta = input.afterRun.chapters - input.beforeRun.chapters;

  return {
    beforeRun: input.beforeRun,
    afterRun: input.afterRun,
    deltas: {
      novels: novelsDelta,
      chapters: chaptersDelta,
    },
    duplicateGrowth: {
      novels: novelsDelta > 0,
      chapters: chaptersDelta > 0,
    },
  };
}

export async function persistContentReconciliationReport(
  outputPath: string,
  payload: ContentReconciliationPayload,
): Promise<void> {
  const resolvedPath = normalizeOutputPath(outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, JSON.stringify(payload, null, 2), 'utf8');
}

export function formatContentReconciliationSummary(
  payload: ContentReconciliationPayload,
): string {
  const lines = [
    'Content Reconciliation Summary',
    `Source novels: ${payload.reconciliation.totals.sourceNovels}`,
    `Target novels: ${payload.reconciliation.totals.targetNovels}`,
    `Novel delta: ${payload.reconciliation.deltas.novelDelta}`,
    `Source chapters: ${payload.reconciliation.totals.sourceChapters}`,
    `Target chapters: ${payload.reconciliation.totals.targetChapters}`,
    `Chapter delta: ${payload.reconciliation.deltas.chapterDelta}`,
    `Orphan chapters: ${payload.reconciliation.integrity.orphanChapters}`,
    `Relation mismatches: ${payload.reconciliation.integrity.relationMismatches}`,
    `Content mismatches: ${payload.reconciliation.integrity.contentMismatches}`,
    `Total mismatches: ${payload.reconciliation.mismatches.length}`,
  ];

  if (payload.rerunSafety.skipped) {
    lines.push(`Rerun safety: skipped (${payload.rerunSafety.reason})`);
  } else {
    lines.push(
      `Rerun deltas (novels/chapters): ${payload.rerunSafety.report.deltas.novels}/${payload.rerunSafety.report.deltas.chapters}`,
    );
    lines.push(
      `Duplicate growth (novels/chapters): ${payload.rerunSafety.report.duplicateGrowth.novels}/${payload.rerunSafety.report.duplicateGrowth.chapters}`,
    );
  }

  return lines.join('\n');
}
