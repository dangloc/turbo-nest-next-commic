"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { fetchSession } from "../src/lib/auth/api";
import {
  clearSessionStorage,
  getSessionToken,
  persistSessionToStorage,
} from "../src/lib/auth/session-store";
import { fetchDiscoveryNovels } from "../src/features/discovery/api";
import type { DiscoveryNovel } from "../src/features/discovery/types";
import { AppContext } from "../src/providers/app-provider";

function getCategoryName(novel: DiscoveryNovel) {
  return novel.terms.find((term) => term.taxonomy === "category")?.name ?? novel.terms[0]?.name ?? "Khac";
}

function getCover(novel: DiscoveryNovel) {
  return novel.thumbnailUrl || novel.coverUrl || "/default-novel-cover.svg";
}

function fallbackToDefaultCover(event: { currentTarget: HTMLImageElement }) {
  const target = event.currentTarget;
  if (target.src.endsWith("/default-novel-cover.svg")) {
    return;
  }
  target.src = "/default-novel-cover.svg";
}

function getExcerpt(novel: DiscoveryNovel, locale: "vi" | "en") {
  const label = getCategoryName(novel);
  if (locale === "vi") {
    return "Truyen thuoc nhom " + label + ", cap nhat thuong xuyen va giu nhip doc on dinh.";
  }

  return "A " + label + " novel with frequent updates and a consistent reading rhythm.";
}

export default function Home() {
  const { user, loaded, locale, setUser } = useContext(AppContext);
  const [novels, setNovels] = useState<DiscoveryNovel[]>([]);
  const [loading, setLoading] = useState(true);

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

  const featured = useMemo(() => novels.slice(0, 6), [novels]);
  const newest = useMemo(() => novels.slice(0, 6), [novels]);

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

  const copy =
    locale === "vi"
      ? {
          featured: "Truyen noi bat",
          newest: "Truyen moi",
          list: "Danh sach truyen >",
          topUnlock: "TOP mo khoa chuong",
          topWeek: "TOP luot xem tuan",
          topTotal: "TOP luot xem tong",
          seeAll: "Xem tat ca >",
          loading: "Dang tai du lieu trang chu...",
          guest: "Khach",
          postedBy: "Tac gia",
          comments: "Binh luan",
          likes: "Yeu thich",
        }
      : {
          featured: "Featured novels",
          newest: "Newest novels",
          list: "Novel list >",
          topUnlock: "TOP chapter unlocks",
          topWeek: "TOP weekly views",
          topTotal: "TOP total views",
          seeAll: "See all >",
          loading: "Loading homepage data...",
          guest: "Guest",
          postedBy: "Author",
          comments: "Comments",
          likes: "Likes",
        };

  const hero = featured[0];

  return (
    <main className="home-page tsh-home">
      <section className="tsh-home-banner">
        <img
          src={hero ? getCover(hero) : "/tusachiep/bg_qc_popup.png"}
          alt={hero?.title ?? "Banner"}
          loading="lazy"
          decoding="async"
          onError={fallbackToDefaultCover}
        />
        <div className="tsh-home-banner__overlay">
          <img src="/tusachiep/newlogoTSH.png" alt="TSH" className="tsh-home-banner__brand" />
          <h1>{hero?.title ?? "Anh Den Gian Em, Anh Chiem Lay Em"}</h1>
          <p>{user ? user.email : copy.guest}</p>
        </div>
      </section>

      <section className="tsh-featured">
        <div className="tsh-section-title">
          <h2>{copy.featured}</h2>
        </div>
        <div className="tsh-featured-grid">
          {featured.map((novel) => (
            <article className="tsh-cover-card" key={novel.id}>
              <Link href={"/novels/" + novel.id}>
                <img src={getCover(novel)} alt={novel.title} loading="lazy" decoding="async" onError={fallbackToDefaultCover} />
                <h3>{novel.title}</h3>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="tsh-newest">
        <div className="tsh-newest__header">
          <h2>{copy.newest}</h2>
          <Link href="/" className="tsh-pill-link">{copy.list}</Link>
        </div>
        <div className="tsh-newest__grid">
          {newest.map((novel) => (
            <article className="tsh-newest-card" key={novel.id}>
              <h3>
                <Link href={"/novels/" + novel.id}>{novel.title}</Link>
              </h3>
              <p>{getExcerpt(novel, locale)}</p>
              <footer>
                <span>{copy.postedBy}: {getCategoryName(novel)}</span>
                <div>
                  <span>{copy.comments} 0</span>
                  <span>{copy.likes} 0</span>
                </div>
              </footer>
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
                  <Link href={"/novels/" + novel.id}>{novel.title}</Link>
                  <strong>{Number(novel.viewCount).toLocaleString()}</strong>
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
                  <Link href={"/novels/" + novel.id}>{novel.title}</Link>
                  <strong>{Number(novel.viewCount).toLocaleString()}</strong>
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
            <Link href="/" className="tsh-pill-link">{copy.seeAll}</Link>
          </div>
          <div className="tsh-featured-grid">
            {items.map((novel) => (
              <article className="tsh-cover-card" key={name + "-" + novel.id}>
                <Link href={"/novels/" + novel.id}>
                  <img src={getCover(novel)} alt={novel.title} onError={fallbackToDefaultCover} />
                  <h3>{novel.title}</h3>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ))}

      {loading ? <p className="tsh-home-loading">{copy.loading}</p> : null}
    </main>
  );
}
