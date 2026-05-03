"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatAppNumber } from "@/lib/i18n";
import { resolveImageUrl } from "@/lib/image";
import { getDiscoveryHref } from "../discovery/api";
import {
  normalizeDiscoveryQuery,
  parseDiscoverySearchParams,
  type DiscoveryNovel,
  type DiscoveryQuery,
  type DiscoveryResponse,
  type DiscoverySortBy,
  type DiscoverySortDir,
} from "../discovery/types";
import { fetchNovelCatalog, fetchPublicTerms, type PublicTerm } from "./api";

interface FilterState {
  q: string;
  author: string;
  category: string;
  tag: string;
  status: string;
  releaseYear: string;
}

type SortValue =
  | "updatedAt:desc"
  | "createdAt:desc"
  | "viewCount:desc"
  | "recommendationVotes:desc"
  | "updatedAt:asc";

function fallbackCover(event: { currentTarget: HTMLImageElement }) {
  if (!event.currentTarget.src.endsWith("/default-novel-cover.svg")) {
    event.currentTarget.src = "/default-novel-cover.svg";
  }
}

function toSortValue(query: DiscoveryQuery): SortValue {
  if (query.sortBy === "createdAt" && query.sortDir === "desc") {
    return "createdAt:desc";
  }

  if (query.sortBy === "viewCount" && query.sortDir === "desc") {
    return "viewCount:desc";
  }

  if (query.sortBy === "recommendationVotes" && query.sortDir === "desc") {
    return "recommendationVotes:desc";
  }

  if (query.sortBy === "updatedAt" && query.sortDir === "asc") {
    return "updatedAt:asc";
  }

  return "updatedAt:desc";
}

function parseSortValue(value: string): {
  sortBy: DiscoverySortBy;
  sortDir: DiscoverySortDir;
} {
  if (value === "createdAt:desc") {
    return { sortBy: "createdAt", sortDir: "desc" };
  }

  if (value === "viewCount:desc") {
    return { sortBy: "viewCount", sortDir: "desc" };
  }

  if (value === "recommendationVotes:desc") {
    return { sortBy: "recommendationVotes", sortDir: "desc" };
  }

  if (value === "updatedAt:asc") {
    return { sortBy: "updatedAt", sortDir: "asc" };
  }

  return { sortBy: "updatedAt", sortDir: "desc" };
}

function getCover(novel: DiscoveryNovel) {
  return (
    resolveImageUrl(novel.coverUrl || novel.thumbnailUrl || novel.featuredImage) ??
    "/default-novel-cover.svg"
  );
}

function TermSelect({
  label,
  value,
  emptyLabel,
  terms,
  onChange,
}: {
  label: string;
  value: string;
  emptyLabel: string;
  terms: PublicTerm[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <option value="">{emptyLabel}</option>
        {terms.map((term) => (
          <option key={`${term.taxonomy}-${term.id}`} value={term.slug}>
            {term.name}
          </option>
        ))}
      </Select>
    </label>
  );
}

function NovelCard({ novel }: { novel: DiscoveryNovel }) {
  return (
    <article className="novels-catalog-item">
      <Link href={`/novels/${novel.id}`} className="novels-catalog-cover">
        <img
          src={getCover(novel)}
          alt={novel.title}
          loading="lazy"
          decoding="async"
          onError={fallbackCover}
          className="h-full w-full object-cover"
        />
      </Link>
      <div className="novels-catalog-meta">
        <h2>
          <Link href={`/novels/${novel.id}`}>{novel.title}</Link>
        </h2>
        <p>{novel.author?.displayName ?? "Đang cập nhật"}</p>
        <span>
          C.{formatAppNumber(Number(novel.chapterCount ?? 0), "vi")}/
          {formatAppNumber(Number(novel.chapterCount ?? 0), "vi")}
        </span>
      </div>
    </article>
  );
}

export function NovelsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQuery = useMemo(
    () => parseDiscoverySearchParams(searchParams),
    [searchParams],
  );

  const [query, setQuery] = useState<DiscoveryQuery>(initialQuery);
  const [filters, setFilters] = useState<FilterState>({
    q: initialQuery.q ?? "",
    author: initialQuery.author ?? "",
    category: initialQuery.category ?? "",
    tag: initialQuery.tag ?? "",
    status: initialQuery.status ?? "",
    releaseYear: initialQuery.releaseYear ?? "",
  });
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authors, setAuthors] = useState<PublicTerm[]>([]);
  const [categories, setCategories] = useState<PublicTerm[]>([]);
  const [tags, setTags] = useState<PublicTerm[]>([]);
  const [statuses, setStatuses] = useState<PublicTerm[]>([]);
  const [releaseYears, setReleaseYears] = useState<PublicTerm[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setFilters({
      q: initialQuery.q ?? "",
      author: initialQuery.author ?? "",
      category: initialQuery.category ?? "",
      tag: initialQuery.tag ?? "",
      status: initialQuery.status ?? "",
      releaseYear: initialQuery.releaseYear ?? "",
    });
  }, [initialQuery]);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const [authorResult, categoryResult, statusResult, tagResult, releaseYearResult] =
        await Promise.all([
          fetchPublicTerms("tac_gia", controller.signal),
          fetchPublicTerms("the_loai", controller.signal),
          fetchPublicTerms("trang_thai", controller.signal),
          fetchPublicTerms("post_tag", controller.signal),
          fetchPublicTerms("nam_phat_hanh", controller.signal),
      ]);

      if (controller.signal.aborted) {
        return;
      }

      if (authorResult.ok) {
        setAuthors(authorResult.data);
      }

      if (categoryResult.ok) {
        setCategories(categoryResult.data);
      }

      if (tagResult.ok) {
        setTags(tagResult.data);
      }

      if (statusResult.ok) {
        setStatuses(statusResult.data);
      }

      if (releaseYearResult.ok) {
        setReleaseYears(releaseYearResult.data);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      const response = await fetchNovelCatalog(query, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        setResult(null);
        setError(response.error.message || "Không thể tải danh sách truyện.");
        setLoading(false);
        return;
      }

      setResult(response.data);
      setLoading(false);
    })();

    return () => controller.abort();
  }, [query]);

  function syncQuery(next: DiscoveryQuery) {
    const normalized = normalizeDiscoveryQuery(next);
    setQuery(normalized);
    router.replace(getDiscoveryHref(normalized, pathname), { scroll: false });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    syncQuery({
      ...query,
      page: 1,
      q: filters.q,
      author: filters.author || undefined,
      category: filters.category || undefined,
      tag: filters.tag || undefined,
      status: filters.status || undefined,
      releaseYear: filters.releaseYear || undefined,
    });
  }

  function clearFilters() {
    const next = normalizeDiscoveryQuery({
      page: 1,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    setFilters({
      q: "",
      author: "",
      category: "",
      tag: "",
      status: "",
      releaseYear: "",
    });
    syncQuery(next);
  }

  function changeSort(value: string) {
    syncQuery({
      ...query,
      ...parseSortValue(value),
      page: 1,
    });
  }

  const totalPages = result?.totalPages ?? 1;
  const from = result && result.total > 0 ? (result.page - 1) * result.limit + 1 : 0;
  const to = result && result.total > 0 ? Math.min(result.total, result.page * result.limit) : 0;
  const activeFilterCount = [
    query.q,
    query.author,
    query.category,
    query.tag,
    query.status,
    query.releaseYear,
  ].filter(Boolean).length;
  const filterButtonLabel = filtersOpen
    ? "Ẩn bộ lọc"
    : activeFilterCount > 0
      ? `Hiển thị bộ lọc (${activeFilterCount})`
      : "Hiển thị bộ lọc";
  const readerPicksMode =
    query.sortBy === "recommendationVotes" && query.sortDir === "desc";
  const title = readerPicksMode ? "Bạn đọc đề cử" : "Danh sách truyện";
  const intro = readerPicksMode
    ? "Danh sách này được xếp theo tổng phiếu đề cử từ bạn đọc, từ cao xuống thấp."
    : "Tìm truyện theo từ khóa, lọc theo phân loại và sắp xếp kết quả.";
  const eyebrow = readerPicksMode ? "Kho truyện / Đề cử" : "Kho truyện";

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-normal text-foreground">
            {title}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {intro}
          </p>
        </div>

        <div className="novels-catalog-toolbar">
          <Button
            type="button"
            className="novels-filter-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter className="h-4 w-4" />
            {filterButtonLabel}
          </Button>

          <div className="novels-sort-controls">
            <label>
              <span>Sắp xếp</span>
              <Select value={toSortValue(query)} onValueChange={changeSort}>
                <option value="updatedAt:desc">Mới cập nhật</option>
                <option value="createdAt:desc">Mới đăng</option>
                <option value="viewCount:desc">Xem nhiều</option>
                <option value="recommendationVotes:desc">Đề cử nhiều nhất</option>
                <option value="updatedAt:asc">Cũ nhất</option>
              </Select>
            </label>
            <Select
              value={String(query.limit)}
              onValueChange={(value) =>
                syncQuery({
                  ...query,
                  page: 1,
                  limit: Number(value),
                })
              }
              aria-label="Số truyện mỗi trang"
            >
              {[12, 20, 24, 36].map((value) => (
                <option key={value} value={value}>
                  {value}/trang
                </option>
              ))}
            </Select>
          </div>
        </div>

        {filtersOpen ? (
          <Card className="novels-filter-panel">
            <CardContent className="p-6">
              <form className="grid gap-4 lg:grid-cols-12" onSubmit={applyFilters}>
                <label className="grid gap-2 text-sm font-medium text-foreground lg:col-span-3">
                  Tên truyện
                  <div className="relative">
                    <Input
                      className="pl-9"
                      value={filters.q}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          q: event.target.value,
                        }))
                      }
                      placeholder="Tìm theo tên truyện..."
                      type="search"
                    />
                  </div>
                </label>

                <label className="grid gap-2 text-sm font-medium text-foreground lg:col-span-3">
                  Tác giả
                  <Select
                    value={filters.author}
                    onValueChange={(value) =>
                      setFilters((current) => ({ ...current, author: value }))
                    }
                  >
                    <option value="">Tất cả</option>
                    {authors.map((term) => (
                      <option key={`${term.taxonomy}-${term.id}`} value={term.slug}>
                        {term.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <div className="lg:col-span-3">
                  <TermSelect
                    label="Thể loại"
                    value={filters.category}
                    emptyLabel="Tất cả"
                    terms={categories}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, category: value }))
                    }
                  />
                </div>

                <div className="lg:col-span-3">
                  <TermSelect
                    label="Trạng thái"
                    value={filters.status}
                    emptyLabel="Tất cả"
                    terms={statuses}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, status: value }))
                    }
                  />
                </div>

                <div className="lg:col-span-3">
                  <TermSelect
                    label="Tag"
                    value={filters.tag}
                    emptyLabel="Tất cả"
                    terms={tags}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, tag: value }))
                    }
                  />
                </div>

                <div className="lg:col-span-3">
                  <TermSelect
                    label="Năm phát hành"
                    value={filters.releaseYear}
                    emptyLabel="Tất cả"
                    terms={releaseYears}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, releaseYear: value }))
                    }
                  />
                </div>

                <div className="novels-filter-actions lg:col-span-6">
                  <Button disabled={loading} type="submit" className="novels-filter-apply">
                    Áp dụng
                  </Button>
                  <Button
                    disabled={loading}
                    type="button"
                    variant="outline"
                    className="novels-filter-clear"
                    onClick={clearFilters}
                  >
                    Xóa lọc
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Đang tải truyện..."
              : result
                ? `${from}-${to} trong ${result.total} truyện`
                : "Chưa có dữ liệu"}
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        {!loading && !error && result?.items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Không có truyện phù hợp bộ lọc hiện tại.
            </CardContent>
          </Card>
        ) : null}

        <section className="novels-catalog-grid">
          {result?.items.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </section>

        <div className="flex items-center justify-end gap-3 py-2">
          <Button
            disabled={loading || !result || result.page <= 1}
            onClick={() => syncQuery({ ...query, page: Math.max(1, query.page - 1) })}
            variant="outline"
          >
            Trước
          </Button>
          <p className="text-sm text-muted-foreground">
            Trang {result?.page ?? query.page} / {totalPages}
          </p>
          <Button
            disabled={loading || !result || result.page >= totalPages}
            onClick={() => syncQuery({ ...query, page: query.page + 1 })}
            variant="outline"
          >
            Tiếp
          </Button>
        </div>
      </section>
    </main>
  );
}
