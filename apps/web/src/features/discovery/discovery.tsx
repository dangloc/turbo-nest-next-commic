"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppContext } from "../../providers/app-provider";
import { formatAppDate, formatAppNumber } from "../../lib/i18n";
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

function getPrimaryCategory(novel: DiscoveryNovel) {
  return novel.terms.find((term) => term.taxonomy === "category") ?? novel.terms[0];
}

function NovelCard({ novel }: { novel: DiscoveryNovel }) {
  const { locale } = useContext(AppContext);
  const copy = locale === "vi" ? { views: "lượt xem", uncategorized: "Chưa phân loại" } : { views: "views", uncategorized: "Uncategorized" };
  const category = getPrimaryCategory(novel);

  return (
    <article className="discovery-card">
      <div className="discovery-card__meta">
        <span>{formatAppNumber(novel.viewCount, locale)} {copy.views}</span>
        <span>{formatAppDate(novel.updatedAt, locale)}</span>
      </div>
      <h3>
        <Link className="reader-history-link" href={"/novels/" + novel.id}>
          {novel.title}
        </Link>
      </h3>
      <div className="discovery-card__chips">
        {category ? (
          <Link className="discovery-chip discovery-chip--link" href={"/category/" + category.slug}>
            {category.name}
          </Link>
        ) : (
          <span className="discovery-chip">{copy.uncategorized}</span>
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
  const { locale } = useContext(AppContext);
  const copy =
    locale === "vi"
      ? {
          sortBy: "Sắp xếp theo",
          latest: "Mới nhất",
          mostViewed: "Xem nhiều nhất",
          oldest: "Cũ nhất",
          perPage: "Mỗi trang",
          direction: "Thứ tự",
          category: "Danh mục",
          allCategories: "Tất cả danh mục",
          descending: "Giảm dần",
          ascending: "Tăng dần",
        }
      : {
          sortBy: "Sort by",
          latest: "Latest",
          mostViewed: "Most viewed",
          oldest: "Oldest",
          perPage: "Per page",
          direction: "Direction",
          category: "Category",
          allCategories: "All categories",
          descending: "Descending",
          ascending: "Ascending",
        };

  return (
    <div className="discovery-controls">
      <label>
        <span>{copy.sortBy}</span>
        <select
          value={query.sortBy}
          onChange={(event) => onQueryChange({ ...query, sortBy: event.target.value as DiscoveryQuery["sortBy"] })}
        >
          <option value="updatedAt">{copy.latest}</option>
          <option value="viewCount">{copy.mostViewed}</option>
          <option value="createdAt">{copy.oldest}</option>
        </select>
      </label>
      <label>
        <span>{copy.perPage}</span>
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
        <span>{copy.direction}</span>
        <select
          value={query.sortDir}
          onChange={(event) => onQueryChange({ ...query, sortDir: event.target.value as DiscoveryQuery["sortDir"] })}
        >
          <option value="desc">{copy.descending}</option>
          <option value="asc">{copy.ascending}</option>
        </select>
      </label>
      <label>
        <span>{copy.category}</span>
        <input readOnly value={category ?? query.category ?? copy.allCategories} />
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
  const { locale } = useContext(AppContext);
  const copy = locale === "vi" ? { previous: "Trước", next: "Tiếp" } : { previous: "Previous", next: "Next" };

  return (
    <div className="discovery-pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        {copy.previous}
      </button>
      <span>{"Page " + page + " of " + totalPages}</span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        {copy.next}
      </button>
    </div>
  );
}

export function DiscoveryFeed({ title, eyebrow, intro, category, categoryLabel, backHref = "/" }: DiscoveryFeedProps) {
  const { locale } = useContext(AppContext);
  const copy =
    locale === "vi"
      ? {
          backToAll: "Quay lại tất cả",
          loading: "Đang tải truyện...",
          empty: "Chưa có truyện nào khớp bộ lọc này.",
        }
      : {
          backToAll: "Back to all",
          loading: "Loading novels...",
          empty: "No novels matched this filter yet.",
        };
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
            {copy.backToAll}
          </Link>
          {categoryLabel ? <span className="discovery-chip">{categoryLabel}</span> : null}
        </div>
      </section>

      <QueryControls query={query} category={categoryLabel} onQueryChange={syncQuery} />

      {loading ? <p className="discovery-state">{copy.loading}</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}
      {emptyState ? <p className="discovery-state">{copy.empty}</p> : null}

      <section className="discovery-grid" aria-live="polite">
        {result?.items.map((novel) => <NovelCard key={novel.id} novel={novel} />)}
      </section>

      {result ? <Pagination page={result.page} totalPages={totalPages} onPageChange={changePage} /> : null}
    </main>
  );
}