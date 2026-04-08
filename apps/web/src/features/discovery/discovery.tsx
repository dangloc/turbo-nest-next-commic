"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchDiscoveryNovels, getDiscoveryHref } from "./api";
import {
  normalizeDiscoveryQuery,
  parseDiscoverySearchParams,
  type DiscoveryNovel,
  type DiscoveryQuery,
  type DiscoveryResponse,
} from "./types";

interface DiscoveryFeedProps {
  title: string;
  eyebrow: string;
  intro: string;
  category?: string;
  categoryLabel?: string;
  backHref?: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPrimaryCategory(novel: DiscoveryNovel) {
  return novel.terms.find((term) => term.taxonomy === "category") ?? novel.terms[0];
}

function NovelCard({ novel }: { novel: DiscoveryNovel }) {
  const category = getPrimaryCategory(novel);

  return (
    <article className="discovery-card">
      <div className="discovery-card__meta">
        <span>{novel.viewCount.toLocaleString()} views</span>
        <span>{formatDate(novel.updatedAt)}</span>
      </div>
      <h3><Link className="reader-history-link" href={"/novels/" + novel.id}>{novel.title}</Link></h3>
      <div className="discovery-card__chips">
        {category ? (
          <Link className="discovery-chip discovery-chip--link" href={"/category/" + category.slug}>
            {category.name}
          </Link>
        ) : (
          <span className="discovery-chip">Uncategorized</span>
        )}
        {novel.terms.slice(0, 3).map((term) => (
          <span key={term.id} className="discovery-chip discovery-chip--muted">
            {term.name}
          </span>
        ))}
      </div>
    </article>
  );
}

function QueryControls({
  query,
  category,
  onQueryChange,
}: {
  query: DiscoveryQuery;
  category?: string;
  onQueryChange: (next: DiscoveryQuery) => void;
}) {
  return (
    <div className="discovery-controls">
      <label>
        <span>Sort by</span>
        <select
          value={query.sortBy}
          onChange={(event) => onQueryChange({ ...query, sortBy: event.target.value as DiscoveryQuery["sortBy"] })}
        >
          <option value="updatedAt">Latest</option>
          <option value="viewCount">Most viewed</option>
          <option value="createdAt">Oldest</option>
        </select>
      </label>
      <label>
        <span>Per page</span>
        <select
          value={query.limit}
          onChange={(event) => onQueryChange({ ...query, limit: Number(event.target.value) })}
        >
          {[12, 20, 24, 36].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Direction</span>
        <select
          value={query.sortDir}
          onChange={(event) => onQueryChange({ ...query, sortDir: event.target.value as DiscoveryQuery["sortDir"] })}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
      <label>
        <span>Category</span>
        <input readOnly value={category ?? query.category ?? "All categories"} />
      </label>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <div className="discovery-pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        Previous
      </button>
      <span>{"Page " + page + " of " + totalPages}</span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        Next
      </button>
    </div>
  );
}

export function DiscoveryFeed({ title, eyebrow, intro, category, categoryLabel, backHref = "/" }: DiscoveryFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQuery = useMemo(() => {
    const parsed = parseDiscoverySearchParams(searchParams);
    return normalizeDiscoveryQuery({
      ...parsed,
      category: category ?? parsed.category,
    });
  }, [category, searchParams]);

  const [query, setQuery] = useState<DiscoveryQuery>(initialQuery);
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void (async () => {
      const response = await fetchDiscoveryNovels(query, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        setResult(null);
        setError(response.error.message);
        setLoading(false);
        return;
      }

      setResult(response.data);
      setLoading(false);
    })();

    return () => controller.abort();
  }, [query]);

  function syncQuery(next: DiscoveryQuery) {
    const normalized = normalizeDiscoveryQuery({ ...next, category: category ?? next.category });
    setQuery(normalized);
    router.replace(getDiscoveryHref(normalized, pathname), { scroll: false });
  }

  function changePage(nextPage: number) {
    syncQuery({ ...query, page: Math.max(1, nextPage) });
  }

  const emptyState = !loading && !error && result?.items.length === 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <main className="discovery-shell">
      <section className="discovery-hero">
        <div>
          <span className="home-kicker">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <div className="discovery-hero__actions">
          <Link className="action-secondary" href={backHref}>
            Back to all
          </Link>
          {categoryLabel ? <span className="discovery-chip">{categoryLabel}</span> : null}
        </div>
      </section>

      <QueryControls query={query} category={categoryLabel} onQueryChange={syncQuery} />

      {loading ? <p className="discovery-state">Loading novels...</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}
      {emptyState ? <p className="discovery-state">No novels matched this filter yet.</p> : null}

      <section className="discovery-grid" aria-live="polite">
        {result?.items.map((novel) => <NovelCard key={novel.id} novel={novel} />)}
      </section>

      {result ? <Pagination page={result.page} totalPages={totalPages} onPageChange={changePage} /> : null}
    </main>
  );
}
