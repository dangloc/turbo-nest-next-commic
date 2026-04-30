"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchSession } from "../../src/lib/auth/api";
import {
  clearSessionStorage,
  getSessionToken,
  persistSessionToStorage,
} from "../../src/lib/auth/session-store";
import { fetchDiscoveryNovels } from "../../src/features/discovery/api";
import type { DiscoveryNovel } from "../../src/features/discovery/types";
import { fetchRecentReviews, type RecentReviewItem } from "../../src/features/social/api";
import { AppContext } from "../../src/providers/app-provider";
import { resolveImageUrl } from "../../src/lib/image";

function getCategoryName(novel: DiscoveryNovel) {
  return novel.terms.find((term) => term.taxonomy === "category")?.name ?? novel.terms[0]?.name ?? "Khác";
}

function getCover(novel: DiscoveryNovel) {
  return (
    resolveImageUrl(novel.thumbnailUrl || novel.coverUrl || novel.featuredImage) ??
    "/default-novel-cover.svg"
  );
}

function fallbackToDefaultCover(event: { currentTarget: HTMLImageElement }) {
  const target = event.currentTarget;
  if (target.src.endsWith("/default-novel-cover.svg")) {
    return;
  }
  target.src = "/default-novel-cover.svg";
}

function getExcerpt(novel: DiscoveryNovel, locale: "vi" | "en") {
  const content = novel.postContent?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (content) {
    return content.length > 170 ? content.slice(0, 167).trimEnd() + "..." : content;
  }

  const label = getCategoryName(novel);
  if (locale === "vi") {
    return "Truyện thuộc nhóm " + label + ", cập nhật đều và phù hợp để theo dõi dài hơi.";
  }

  return "A " + label + " novel with frequent updates and a consistent reading rhythm.";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
}

function getLoopIndex(current: number, offset: number, total: number) {
  return (current + offset + total) % total;
}

function getReviewCover(review: RecentReviewItem) {
  return resolveImageUrl(review.novel.featuredImage) ?? "/default-novel-cover.svg";
}

function hideBrokenImage(event: { currentTarget: HTMLImageElement }) {
  event.currentTarget.style.display = "none";
}

function getReviewAuthorName(review: RecentReviewItem, fallback: string) {
  return review.user.nickname?.trim() || fallback;
}

function getInitials(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "U";
}

function formatRelativeDate(value: string, locale: "vi" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return locale === "vi" ? "Gần đây" : "Recently";
  }

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  for (const [unit, unitMs] of units) {
    if (absMs >= unitMs || unit === "minute") {
      return new Intl.RelativeTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        numeric: "auto",
      }).format(Math.round(diffMs / unitMs), unit);
    }
  }

  return locale === "vi" ? "vừa xong" : "just now";
}

function splitReviewContent(content: string | null, locale: "vi" | "en") {
  const fallback = locale === "vi" ? "Người đọc đã đánh giá truyện này." : "The reader rated this novel.";
  const normalized = (content || fallback).replace(/\s+/g, " ").trim();
  const parts = normalized
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    character: parts.length >= 3 ? parts[0] : null,
    plot: parts.length >= 3 ? parts[1] : null,
    detail: parts.length >= 3 ? parts.slice(2).join(" ") : normalized,
  };
}

function chunkReviews(items: RecentReviewItem[], size: number) {
  const chunks: RecentReviewItem[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function chunkNovels(items: DiscoveryNovel[], size: number) {
  const chunks: DiscoveryNovel[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getAuthorName(novel: DiscoveryNovel, fallback: string) {
  return novel.author?.displayName?.trim() || fallback;
}

function formatChapterProgress(novel: DiscoveryNovel, fallback: string) {
  const chapterCount = Number(novel.chapterCount ?? 0);
  if (Number.isFinite(chapterCount) && chapterCount > 0) {
    return `C.${chapterCount}/${chapterCount}`;
  }

  return fallback;
}

export default function Home() {
  const { loaded, locale, setUser } = useContext(AppContext);
  const [novels, setNovels] = useState<DiscoveryNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [recentReviews, setRecentReviews] = useState<RecentReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewPageIndex, setReviewPageIndex] = useState(0);
  const [featuredPageIndex, setFeaturedPageIndex] = useState(0);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const token = getSessionToken();
    if (!token) {
      return;
    }

    void (async () => {
      const session = await fetchSession(token);
      if (!session.ok || !session.data.user) {
        clearSessionStorage();
        setUser(null);
        return;
      }

      persistSessionToStorage(session.data.user);
      setUser(session.data.user);
    })();
  }, [loaded, setUser]);

  useEffect(() => {
    void (async () => {
      const response = await fetchDiscoveryNovels({
        page: 1,
        limit: 60,
        sortBy: "updatedAt",
        sortDir: "desc",
      });

      if (response.ok) {
        setNovels(response.data.items);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    void (async () => {
      const response = await fetchRecentReviews(9, abortController.signal);
      if (response.ok) {
        setRecentReviews(response.data);
      }
      setReviewsLoading(false);
    })();

    return () => abortController.abort();
  }, []);

  const featured = useMemo(() => novels.slice(0, 18), [novels]);
  const newest = useMemo(() => novels.slice(0, 6), [novels]);
  const sliderNovels = useMemo(() => novels.slice(0, 12), [novels]);
  const featuredPages = useMemo(() => chunkNovels(featured, 6), [featured]);
  const visibleFeatured = featuredPages[featuredPageIndex] ?? featuredPages[0] ?? [];
  const reviewPages = useMemo(() => chunkReviews(recentReviews, 3), [recentReviews]);
  const visibleReviews = reviewPages[reviewPageIndex] ?? reviewPages[0] ?? [];

  const ranking = useMemo(
    () => [...novels].sort((a, b) => Number(b.viewCount) - Number(a.viewCount)).slice(0, 10),
    [novels],
  );

  const categorySections = useMemo(() => {
    const grouped = new Map<string, DiscoveryNovel[]>();
    for (const novel of novels) {
      const name = getCategoryName(novel);
      if (!grouped.has(name)) {
        grouped.set(name, []);
      }

      const current = grouped.get(name);
      if (!current) {
        continue;
      }

      if (current.length < 5) {
        current.push(novel);
      }
    }

    return Array.from(grouped.entries()).slice(0, 4);
  }, [novels]);

  useEffect(() => {
    if (heroIndex >= sliderNovels.length) {
      setHeroIndex(0);
    }
  }, [heroIndex, sliderNovels.length]);

  useEffect(() => {
    if (sliderNovels.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setHeroIndex((current) => getLoopIndex(current, 1, sliderNovels.length));
    }, 5200);

    return () => window.clearInterval(timer);
  }, [sliderNovels.length]);

  useEffect(() => {
    if (reviewPageIndex >= reviewPages.length) {
      setReviewPageIndex(0);
    }
  }, [reviewPageIndex, reviewPages.length]);

  useEffect(() => {
    if (reviewPages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setReviewPageIndex((current) => getLoopIndex(current, 1, reviewPages.length));
    }, 6500);

    return () => window.clearInterval(timer);
  }, [reviewPages.length]);

  useEffect(() => {
    if (featuredPageIndex >= featuredPages.length) {
      setFeaturedPageIndex(0);
    }
  }, [featuredPageIndex, featuredPages.length]);

  useEffect(() => {
    if (featuredPages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setFeaturedPageIndex((current) => getLoopIndex(current, 1, featuredPages.length));
    }, 7200);

    return () => window.clearInterval(timer);
  }, [featuredPages.length]);

  const copy =
    locale === "vi"
      ? {
          heroKicker: "Truyện đang nổi bật",
          heroFallbackTitle: "Tủ Sách Hiệp",
          heroFallbackText: "Khám phá truyện mới, lưu bookmark và đọc tiếp các chương yêu thích.",
          author: "Tác giả",
          intro: "Giới thiệu",
          unknownAuthor: "Đang cập nhật",
          readNow: "Đọc ngay",
          browse: "Danh sách truyện",
          previous: "Truyện trước",
          next: "Truyện tiếp theo",
          updated: "Mới cập nhật",
          views: "lượt xem",
          featured: "Truyện đang tiến hành",
          recentReviews: "Đánh giá gần đây",
          reviewsLoading: "Đang tải đánh giá gần đây...",
          reviewsEmpty: "Chưa có đánh giá nào.",
          character: "Nhân vật",
          plot: "Cốt truyện",
          detail: "Chi tiết",
          newest: "Truyện mới",
          list: "Danh sách truyện",
          topUnlock: "TOP mở khóa chương",
          topWeek: "TOP lượt xem tuần",
          topTotal: "TOP lượt xem tổng",
          seeAll: "Xem tất cả",
          loading: "Đang tải dữ liệu trang chủ...",
          empty: "Chưa có truyện để hiển thị.",
          guest: "Khách",
          category: "Thể loại",
        }
      : {
          heroKicker: "Featured reading",
          heroFallbackTitle: "Tusachiep",
          heroFallbackText: "Discover new novels, save bookmarks, and keep reading your favorite chapters.",
          author: "Author",
          intro: "Intro",
          unknownAuthor: "Updating",
          readNow: "Read now",
          browse: "Novel list",
          previous: "Previous novel",
          next: "Next novel",
          updated: "Updated",
          views: "views",
          featured: "Featured novels",
          recentReviews: "Recent reviews",
          reviewsLoading: "Loading recent reviews...",
          reviewsEmpty: "No reviews yet.",
          character: "Characters",
          plot: "Plot",
          detail: "Detail",
          newest: "Newest novels",
          list: "Novel list",
          topUnlock: "TOP chapter unlocks",
          topWeek: "TOP weekly views",
          topTotal: "TOP total views",
          seeAll: "See all",
          loading: "Loading homepage data...",
          empty: "No novels available yet.",
          guest: "Guest",
          category: "Category",
        };

  const hero = sliderNovels[heroIndex] ?? featured[0];
  const heroHref = hero ? "/novels/" + hero.id : "/novels";
  const heroStack = sliderNovels.length
    ? [-2, -1, 0].map((offset) => sliderNovels[getLoopIndex(heroIndex, offset, sliderNovels.length)])
    : [];

  function showPreviousHero() {
    if (sliderNovels.length <= 1) {
      return;
    }

    setHeroIndex((current) => getLoopIndex(current, -1, sliderNovels.length));
  }

  function showNextHero() {
    if (sliderNovels.length <= 1) {
      return;
    }

    setHeroIndex((current) => getLoopIndex(current, 1, sliderNovels.length));
  }

  function showPreviousReviewPage() {
    if (reviewPages.length <= 1) {
      return;
    }

    setReviewPageIndex((current) => getLoopIndex(current, -1, reviewPages.length));
  }

  function showNextReviewPage() {
    if (reviewPages.length <= 1) {
      return;
    }

    setReviewPageIndex((current) => getLoopIndex(current, 1, reviewPages.length));
  }

  function showPreviousFeaturedPage() {
    if (featuredPages.length <= 1) {
      return;
    }

    setFeaturedPageIndex((current) => getLoopIndex(current, -1, featuredPages.length));
  }

  function showNextFeaturedPage() {
    if (featuredPages.length <= 1) {
      return;
    }

    setFeaturedPageIndex((current) => getLoopIndex(current, 1, featuredPages.length));
  }

  return (
    <main className="home-page tsh-home">
      <section className="tsh-hero-slider" aria-label={copy.heroKicker} aria-roledescription="carousel">
        <div className="tsh-hero-slider__visual">
          <div className="tsh-hero-slider__stack" aria-hidden="true">
            {heroStack.map((novel, index) =>
              novel ? (
                <img
                  src={getCover(novel)}
                  alt=""
                  className={"tsh-hero-slider__peek tsh-hero-slider__peek--" + index}
                  key={novel.id + "-" + index}
                  loading="lazy"
                  decoding="async"
                  onError={fallbackToDefaultCover}
                />
              ) : null,
            )}
          </div>

          <Link href={heroHref} className="tsh-hero-slider__main">
            <img
              src={hero ? getCover(hero) : "/default-novel-cover.svg"}
              alt={hero?.title ?? copy.heroFallbackTitle}
              loading="eager"
              decoding="async"
              onError={fallbackToDefaultCover}
            />
          </Link>

          {sliderNovels.length > 1 ? (
            <>
              <button
                type="button"
                className="tsh-hero-slider__nav tsh-hero-slider__nav--prev"
                aria-label={copy.previous}
                onClick={showPreviousHero}
              >
                <ChevronLeft size={28} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="tsh-hero-slider__nav tsh-hero-slider__nav--next"
                aria-label={copy.next}
                onClick={showNextHero}
              >
                <ChevronRight size={28} aria-hidden="true" />
              </button>
            </>
          ) : null}

          <div className="tsh-hero-slider__dots" aria-label={copy.heroKicker}>
            {(sliderNovels.length ? sliderNovels : [null]).map((novel, index) => (
              <button
                type="button"
                aria-label={`${copy.heroKicker} ${index + 1}`}
                aria-current={index === heroIndex}
                className={
                  index === heroIndex
                    ? "tsh-hero-slider__dot tsh-hero-slider__dot--active"
                    : "tsh-hero-slider__dot"
                }
                key={novel?.id ?? "fallback"}
                onClick={() => setHeroIndex(index)}
              />
            ))}
          </div>
        </div>

        <div className="tsh-hero-slider__content">
          <h1>
            <Link href={heroHref}>
              {hero?.title ?? copy.heroFallbackTitle}
            </Link>
          </h1>

          <div className="tsh-hero-slider__meta">
            <span>
              <strong>{copy.author}:</strong>{" "}
              {hero?.author?.displayName ?? copy.unknownAuthor}
            </span>
          </div>

          <div className="tsh-hero-slider__intro">
            <strong>{copy.intro}:</strong>
            <p>{hero ? getExcerpt(hero, locale) : copy.heroFallbackText}</p>
          </div>

          <div className="tsh-hero-slider__chips">
            <span>{hero ? getCategoryName(hero) : copy.guest}</span>
            <span>{hero ? formatNumber(hero.viewCount) : "0"} {copy.views}</span>
            <span>{copy.updated}</span>
          </div>

          <Link href={heroHref} className="tsh-hero-slider__cta">
            {copy.readNow}
          </Link>
        </div>
      </section>

      <section className="tsh-featured">
        <div className="tsh-featured__header">
          <h2>{copy.featured}</h2>
          <Link href="/novels" className="tsh-featured__more">{copy.seeAll}</Link>
        </div>

        <div className="tsh-featured__viewport">
          {featuredPages.length > 1 ? (
            <>
              <button
                type="button"
                aria-label={copy.previous}
                className="tsh-featured__nav tsh-featured__nav--prev"
                onClick={showPreviousFeaturedPage}
              >
                <ChevronLeft size={26} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={copy.next}
                className="tsh-featured__nav tsh-featured__nav--next"
                onClick={showNextFeaturedPage}
              >
                <ChevronRight size={26} aria-hidden="true" />
              </button>
            </>
          ) : null}

          <div className="tsh-featured__track">
            {visibleFeatured.map((novel) => (
              <article className="tsh-featured-card" key={novel.id}>
                <Link href={"/novels/" + novel.id} className="tsh-featured-card__cover">
                  <img
                    src={getCover(novel)}
                    alt={novel.title}
                    loading="lazy"
                    decoding="async"
                    onError={fallbackToDefaultCover}
                  />
                </Link>
                <h3>
                  <Link href={"/novels/" + novel.id}>{novel.title}</Link>
                </h3>
                <p>{getAuthorName(novel, getCategoryName(novel))}</p>
                <span>{formatChapterProgress(novel, `${formatNumber(novel.viewCount)} ${copy.views}`)}</span>
              </article>
            ))}
          </div>
        </div>

        {featuredPages.length > 1 ? (
          <div className="tsh-featured__dots" aria-label={copy.featured}>
            {featuredPages.map((page, index) => (
              <button
                type="button"
                aria-label={`${copy.featured} ${index + 1}`}
                aria-current={index === featuredPageIndex}
                className={
                  index === featuredPageIndex
                    ? "tsh-featured__dot tsh-featured__dot--active"
                    : "tsh-featured__dot"
                }
                key={page[0]?.id ?? index}
                onClick={() => setFeaturedPageIndex(index)}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="tsh-newest">
        <div className="tsh-newest__header">
          <h2>{copy.newest}</h2>
          <Link href="/novels" className="tsh-pill-link">{copy.list}</Link>
        </div>
        <div className="tsh-newest__grid">
          {newest.map((novel) => (
            <article className="tsh-newest-card" key={novel.id}>
              <Link href={"/novels/" + novel.id} className="tsh-newest-card__cover">
                <img src={getCover(novel)} alt={novel.title} loading="lazy" decoding="async" onError={fallbackToDefaultCover} />
              </Link>
              <div className="tsh-newest-card__body">
                <h3>
                  <Link href={"/novels/" + novel.id}>{novel.title}</Link>
                </h3>
                <p>{getExcerpt(novel, locale)}</p>
                <footer>
                  <span>{copy.category}: {getCategoryName(novel)}</span>
                  <div>
                    <span>{formatNumber(novel.viewCount)} {copy.views}</span>
                  </div>
                </footer>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="tsh-top-rankings">
        <div className="tsh-top-rankings__grid">
          <article className="tsh-top-card">
            <h3>{copy.topUnlock}</h3>
            <ol>
              {ranking.map((novel, index) => (
                <li key={"unlock-" + novel.id + "-" + index}>
                  <span>{index + 1}</span>
                  <img src={getCover(novel)} alt="" loading="lazy" decoding="async" onError={fallbackToDefaultCover} />
                  <Link href={"/novels/" + novel.id}>{novel.title}</Link>
                  <strong>{Math.max(1, Math.floor(Number(novel.viewCount) / 20))}</strong>
                </li>
              ))}
            </ol>
          </article>

          <article className="tsh-top-card">
            <h3>{copy.topWeek}</h3>
            <ol>
              {ranking.map((novel, index) => (
                <li key={"week-" + novel.id + "-" + index}>
                  <span>{index + 1}</span>
                  <img src={getCover(novel)} alt="" loading="lazy" decoding="async" onError={fallbackToDefaultCover} />
                  <Link href={"/novels/" + novel.id}>{novel.title}</Link>
                  <strong>{formatNumber(novel.viewCount)}</strong>
                </li>
              ))}
            </ol>
          </article>

          <article className="tsh-top-card">
            <h3>{copy.topTotal}</h3>
            <ol>
              {ranking.map((novel, index) => (
                <li key={"total-" + novel.id + "-" + index}>
                  <span>{index + 1}</span>
                  <img src={getCover(novel)} alt="" loading="lazy" decoding="async" onError={fallbackToDefaultCover} />
                  <Link href={"/novels/" + novel.id}>{novel.title}</Link>
                  <strong>{formatNumber(novel.viewCount)}</strong>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      {categorySections.map(([name, items]) => (
        <section className="tsh-taxonomy" key={name}>
          <div className="tsh-section-title tsh-section-title--row">
            <h2>{name}</h2>
            <Link href="/novels" className="tsh-pill-link">{copy.seeAll}</Link>
          </div>
          <div className="tsh-featured-grid">
            {items.map((novel) => (
              <article className="tsh-cover-card" key={name + "-" + novel.id}>
                <Link href={"/novels/" + novel.id}>
                  <img src={getCover(novel)} alt={novel.title} onError={fallbackToDefaultCover} />
                  <h3>{novel.title}</h3>
                  <span>{formatNumber(novel.viewCount)} {copy.views}</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ))}

            <section className="tsh-review-slider" aria-label={copy.recentReviews}>
        <div className="tsh-section-title tsh-section-title--row">
          <h2>{copy.recentReviews}</h2>
          {reviewPages.length > 1 ? (
            <div className="tsh-review-slider__controls">
              <button type="button" aria-label={copy.previous} onClick={showPreviousReviewPage}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" aria-label={copy.next} onClick={showNextReviewPage}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {reviewsLoading ? <p className="tsh-home-loading">{copy.reviewsLoading}</p> : null}
        {!reviewsLoading && recentReviews.length === 0 ? (
          <p className="tsh-home-loading">{copy.reviewsEmpty}</p>
        ) : null}

        {visibleReviews.length > 0 ? (
          <>
            <div className="tsh-review-slider__grid">
              {visibleReviews.map((review) => {
                const authorName = getReviewAuthorName(review, copy.guest);
                const segments = splitReviewContent(review.content, locale);
                const avatarUrl = resolveImageUrl(review.user.avatar);
                const rating = Math.max(0, Math.min(5, Math.round(review.rating)));

                return (
                  <article className="tsh-review-card" key={review.id}>
                    <header className="tsh-review-card__header">
                      <span className="tsh-review-card__avatar" aria-hidden="true">
                        <span>{getInitials(authorName)}</span>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" loading="lazy" decoding="async" onError={hideBrokenImage} />
                        ) : null}
                      </span>
                      <div>
                        <strong>{authorName}</strong>
                        <small>{formatRelativeDate(review.createdAt, locale)}</small>
                      </div>
                      <Link href={"/novels/" + review.novel.id} className="tsh-review-card__cover">
                        <img
                          src={getReviewCover(review)}
                          alt={review.novel.title}
                          loading="lazy"
                          decoding="async"
                          onError={fallbackToDefaultCover}
                        />
                      </Link>
                    </header>

                    <h3>
                      <Link href={"/novels/" + review.novel.id}>{review.novel.title}</Link>
                    </h3>

                    <div className="tsh-review-card__stars" aria-label={`${rating}/5`}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span key={index} className={index < rating ? "is-active" : undefined}>
                          ★
                        </span>
                      ))}
                    </div>

                    <div className="tsh-review-card__content">
                      {segments.character ? (
                        <p>
                          <strong>{copy.character}:</strong> {segments.character}
                        </p>
                      ) : null}
                      {segments.plot ? (
                        <p>
                          <strong>{copy.plot}:</strong> {segments.plot}
                        </p>
                      ) : null}
                      <p>
                        <strong>{copy.detail}:</strong> {segments.detail}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            {reviewPages.length > 1 ? (
              <div className="tsh-review-slider__dots" aria-label={copy.recentReviews}>
                {reviewPages.map((page, index) => (
                  <button
                    type="button"
                    aria-label={`${copy.recentReviews} ${index + 1}`}
                    aria-current={index === reviewPageIndex}
                    className={
                      index === reviewPageIndex
                        ? "tsh-review-slider__dot tsh-review-slider__dot--active"
                        : "tsh-review-slider__dot"
                    }
                    key={page[0]?.id ?? index}
                    onClick={() => setReviewPageIndex(index)}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {loading ? <p className="tsh-home-loading">{copy.loading}</p> : null}
      {!loading && novels.length === 0 ? <p className="tsh-home-loading">{copy.empty}</p> : null}
    </main>
  );
}
