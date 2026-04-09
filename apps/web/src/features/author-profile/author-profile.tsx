"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  fetchAuthorProfile,
  getAuthorProfileHref,
  normalizeAuthorProfileQuery,
  parseAuthorProfileSearchParams,
  type AuthorProfileQuery,
  type AuthorProfileResponse,
} from "./api";
import type { AuthorCatalogItem } from "./types";

interface AuthorProfileViewProps {
  authorId: number;
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPrimaryCategory(novel: AuthorCatalogItem) {
  return novel.terms.find((term) => term.taxonomy === "category") ?? novel.terms[0];
}

function AuthorNovelCard({ novel }: { novel: AuthorCatalogItem }) {
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

function AuthorPagination({
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

export function AuthorProfileView({ authorId }: AuthorProfileViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQuery = useMemo(
    () => normalizeAuthorProfileQuery(parseAuthorProfileSearchParams(searchParams)),
    [searchParams],
  );

  const [query, setQuery] = useState<AuthorProfileQuery>(initialQuery);
  const [result, setResult] = useState<AuthorProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setIsNotFound(false);

    void (async () => {
      const response = await fetchAuthorProfile(authorId, query, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        setResult(null);
        setLoading(false);

        if (response.error.status === 404) {
          setIsNotFound(true);
          return;
        }

        setError(response.error.message);
        return;
      }

      setResult(response.data);
      setLoading(false);
    })();

    return () => controller.abort();
  }, [authorId, query]);

  function syncQuery(next: AuthorProfileQuery) {
    const normalized = normalizeAuthorProfileQuery(next);
    setQuery(normalized);
    router.replace(getAuthorProfileHref(authorId, normalized, pathname), { scroll: false });
  }

  function changePage(nextPage: number) {
    syncQuery({ ...query, page: Math.max(1, nextPage) });
  }

  const emptyState = !loading && !error && !isNotFound && result?.catalog.total === 0;
  const totalPages = result?.catalog.totalPages ?? 1;

  return (
    <main className="discovery-shell author-profile-shell">
      <section className="discovery-hero author-profile-hero">
        <div>
          <span className="home-kicker">Author Profile</span>
          <h1>{result?.author.displayName ?? "Loading author..."}</h1>
          <p>{result?.author.bio ?? "This author is setting up their profile details."}</p>
        </div>
        <div className="author-profile-hero__meta">
          {result?.author.avatar ? (
            <Image
              className="author-profile-avatar"
              src={result.author.avatar}
              alt={result.author.displayName}
              width={88}
              height={88}
              unoptimized
            />
          ) : (
            <div className="author-profile-avatar author-profile-avatar--placeholder" aria-hidden>
              {result?.author.displayName?.slice(0, 1).toUpperCase() ?? "A"}
            </div>
          )}
          <div className="author-profile-stats">
            <span className="discovery-chip">{(result?.stats.totalPublishedNovels ?? 0).toLocaleString()} novels</span>
            <span className="discovery-chip">{(result?.stats.totalViews ?? 0).toLocaleString()} total views</span>
            <span className="discovery-chip">Latest update: {formatDate(result?.stats.latestUpdateAt ?? null)}</span>
          </div>
        </div>
      </section>

      {loading ? <p className="discovery-state">Loading author profile...</p> : null}
      {isNotFound ? <p className="discovery-state discovery-state--error">Author not found.</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}
      {emptyState ? <p className="discovery-state">This author hasn&apos;t published any novels yet.</p> : null}

      <section className="discovery-grid" aria-live="polite">
        {result?.catalog.items.map((novel) => <AuthorNovelCard key={novel.id} novel={novel} />)}
      </section>

      {result ? (
        <AuthorPagination page={result.catalog.page} totalPages={totalPages} onPageChange={changePage} />
      ) : null}
    </main>
  );
}
