import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';

export type TaxonomyMismatch = {
  kind: 'term' | 'link';
  key: string;
  reason: 'missing_in_target' | 'missing_in_source' | 'taxonomy_mismatch';
  sourceValue: string | number | null;
  targetValue: string | number | null;
};

export type TaxonomyReconciliationReport = {
  generatedAt: string;
  totals: {
    sourceTerms: number;
    targetTerms: number;
    sourceLinks: number;
    targetLinks: number;
  };
  deltas: {
    termDelta: number;
    linkDelta: number;
  };
  integrity: {
    termMismatches: number;
    linkMismatches: number;
  };
  mismatches: TaxonomyMismatch[];
};

export type TaxonomyRerunSnapshot = {
  terms: number;
  links: number;
};

export type TaxonomyRerunSafetyReport = {
  beforeRun: TaxonomyRerunSnapshot;
  afterRun: TaxonomyRerunSnapshot;
  deltas: {
    terms: number;
    links: number;
  };
  duplicateGrowth: {
    terms: boolean;
    links: boolean;
  };
};

export type TaxonomyReconciliationPayload = {
  generatedAt: string;
  reconciliation: TaxonomyReconciliationReport;
  rerunSafety:
    | { skipped: true; reason: string }
    | { skipped: false; report: TaxonomyRerunSafetyReport };
};

type TermSnapshot = {
  id: number;
  slug: string;
  taxonomy: string;
};

type LinkSnapshot = {
  novelId: number;
  termId: number;
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

function sortMismatches(mismatches: TaxonomyMismatch[]): TaxonomyMismatch[] {
  return mismatches.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.key !== b.key) return a.key.localeCompare(b.key);
    return a.reason.localeCompare(b.reason);
  });
}

function linkKey(link: LinkSnapshot): string {
  return `${link.novelId}:${link.termId}`;
}

export function buildTaxonomyReconciliationReport(input: {
  sourceTerms: TermSnapshot[];
  targetTerms: TermSnapshot[];
  sourceLinks: LinkSnapshot[];
  targetLinks: LinkSnapshot[];
}): TaxonomyReconciliationReport {
  const sourceTermMap = new Map(input.sourceTerms.map((row) => [row.id, row]));
  const targetTermMap = new Map(input.targetTerms.map((row) => [row.id, row]));
  const sourceLinkSet = new Set(input.sourceLinks.map(linkKey));
  const targetLinkSet = new Set(input.targetLinks.map(linkKey));

  const mismatches: TaxonomyMismatch[] = [];

  for (const [id, source] of sourceTermMap) {
    const target = targetTermMap.get(id);
    if (!target) {
      mismatches.push({
        kind: 'term',
        key: String(id),
        reason: 'missing_in_target',
        sourceValue: id,
        targetValue: null,
      });
      continue;
    }

    if (source.slug !== target.slug || source.taxonomy !== target.taxonomy) {
      mismatches.push({
        kind: 'term',
        key: String(id),
        reason: 'taxonomy_mismatch',
        sourceValue: `${source.slug}:${source.taxonomy}`,
        targetValue: `${target.slug}:${target.taxonomy}`,
      });
    }
  }

  for (const [id] of targetTermMap) {
    if (!sourceTermMap.has(id)) {
      mismatches.push({
        kind: 'term',
        key: String(id),
        reason: 'missing_in_source',
        sourceValue: null,
        targetValue: id,
      });
    }
  }

  for (const key of sourceLinkSet) {
    if (!targetLinkSet.has(key)) {
      mismatches.push({
        kind: 'link',
        key,
        reason: 'missing_in_target',
        sourceValue: key,
        targetValue: null,
      });
    }
  }

  for (const key of targetLinkSet) {
    if (!sourceLinkSet.has(key)) {
      mismatches.push({
        kind: 'link',
        key,
        reason: 'missing_in_source',
        sourceValue: null,
        targetValue: key,
      });
    }
  }

  const sorted = sortMismatches(mismatches);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      sourceTerms: input.sourceTerms.length,
      targetTerms: input.targetTerms.length,
      sourceLinks: input.sourceLinks.length,
      targetLinks: input.targetLinks.length,
    },
    deltas: {
      termDelta: input.targetTerms.length - input.sourceTerms.length,
      linkDelta: input.targetLinks.length - input.sourceLinks.length,
    },
    integrity: {
      termMismatches: sorted.filter((row) => row.kind === 'term').length,
      linkMismatches: sorted.filter((row) => row.kind === 'link').length,
    },
    mismatches: sorted,
  };
}

export function buildTaxonomyRerunSafetyReport(input: {
  beforeRun: TaxonomyRerunSnapshot;
  afterRun: TaxonomyRerunSnapshot;
}): TaxonomyRerunSafetyReport {
  const termsDelta = input.afterRun.terms - input.beforeRun.terms;
  const linksDelta = input.afterRun.links - input.beforeRun.links;

  return {
    beforeRun: input.beforeRun,
    afterRun: input.afterRun,
    deltas: {
      terms: termsDelta,
      links: linksDelta,
    },
    duplicateGrowth: {
      terms: termsDelta > 0,
      links: linksDelta > 0,
    },
  };
}

export async function persistTaxonomyReconciliationReport(
  outputPath: string,
  payload: TaxonomyReconciliationPayload,
): Promise<void> {
  const resolvedPath = normalizeOutputPath(outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, JSON.stringify(payload, null, 2), 'utf8');
}

export function formatTaxonomyReconciliationSummary(
  payload: TaxonomyReconciliationPayload,
): string {
  const lines = [
    'Taxonomy Reconciliation Summary',
    `Source terms: ${payload.reconciliation.totals.sourceTerms}`,
    `Target terms: ${payload.reconciliation.totals.targetTerms}`,
    `Term delta: ${payload.reconciliation.deltas.termDelta}`,
    `Source links: ${payload.reconciliation.totals.sourceLinks}`,
    `Target links: ${payload.reconciliation.totals.targetLinks}`,
    `Link delta: ${payload.reconciliation.deltas.linkDelta}`,
    `Term mismatches: ${payload.reconciliation.integrity.termMismatches}`,
    `Link mismatches: ${payload.reconciliation.integrity.linkMismatches}`,
    `Total mismatches: ${payload.reconciliation.mismatches.length}`,
  ];

  if (payload.rerunSafety.skipped) {
    lines.push(`Rerun safety: skipped (${payload.rerunSafety.reason})`);
  } else {
    lines.push(
      `Rerun deltas (terms/links): ${payload.rerunSafety.report.deltas.terms}/${payload.rerunSafety.report.deltas.links}`,
    );
    lines.push(
      `Duplicate growth (terms/links): ${payload.rerunSafety.report.duplicateGrowth.terms}/${payload.rerunSafety.report.duplicateGrowth.links}`,
    );
  }

  return lines.join('\n');
}
