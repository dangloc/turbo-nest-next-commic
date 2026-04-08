"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSessionToken } from "../../lib/auth/session-store";
import { SocialThread } from "../social/social";
import {
  buildChapterHref,
  buildNovelHref,
  fetchChapterById,
  fetchNovelById,
  fetchReadingHistory,
  normalizeChapterId,
  upsertReadingHistory,
} from "./api";
import type { ReaderChapter, ReaderNovel, ReadingHistoryEntry } from "./types";

function toDisplayText(content: string) {
  return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function NovelDetailView({ novelId }: { novelId: number }) {
  const [novel, setNovel] = useState<ReaderNovel | null>(null);
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapterInput, setChapterInput] = useState("1");

  useEffect(() => {
    const token = getSessionToken() ?? undefined;

    setLoading(true);
    setError(null);

    void (async () => {
      const novelResult = await fetchNovelById(novelId);
      if (!novelResult.ok || !novelResult.data) {
        setError(novelResult.ok ? "Novel not found" : novelResult.error.message);
        setLoading(false);
        return;
      }

      setNovel(novelResult.data);

      if (token) {
        const historyResult = await fetchReadingHistory(token, novelId);
        if (historyResult.ok) {
          setHistory(historyResult.data);
          const resume = historyResult.data[0]?.chapterId;
          if (resume) {
            setChapterInput(String(resume));
          }
        }
      }

      setLoading(false);
    })();
  }, [novelId]);

  const parsedChapterId = useMemo(() => normalizeChapterId(chapterInput), [chapterInput]);
  const startHref = parsedChapterId ? buildChapterHref(parsedChapterId, novelId) : null;

  return (
    <main className="reader-shell">
      {loading ? <p className="discovery-state">Loading novel details...</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}

      {novel ? (
        <>
          <section className="reader-card">
            <div className="reader-card__header">
              <span className="home-kicker">Reader Experience</span>
              <h1>{novel.title}</h1>
              <p>
                Novel #{novel.id} · {String(novel.viewCount)} views
              </p>
            </div>
            <p className="reader-card__summary">{toDisplayText(novel.postContent).slice(0, 220) || "No summary available yet."}</p>
            <div className="reader-actions">
              <label className="reader-input-group">
                <span>Chapter ID</span>
                <input
                  value={chapterInput}
                  onChange={(event) => setChapterInput(event.target.value)}
                  placeholder="Enter chapter id"
                  inputMode="numeric"
                />
              </label>
              {startHref ? (
                <Link className="action-primary" href={startHref}>
                  Start reading
                </Link>
              ) : (
                <button className="action-primary" type="button" disabled>
                  Enter valid chapter
                </button>
              )}
              <Link className="action-secondary" href="/">
                Back to discovery
              </Link>
            </div>
          </section>

          <section className="reader-card">
            <h2>Recent reading history</h2>
            {history.length === 0 ? (
              <p className="reader-muted">Sign in and open chapters to build resume history.</p>
            ) : (
              <ul className="reader-history-list">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <Link className="reader-history-link" href={buildChapterHref(entry.chapterId ?? 1, entry.novelId)}>
                      Resume chapter {entry.chapterId ?? "N/A"}
                    </Link>
                    <span>{entry.progressPercent}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <SocialThread
            title="Novel discussion"
            scope={{ novelId }}
            emptyHint="No comments yet. Start the novel discussion."
          />
        </>
      ) : null}
    </main>
  );
}

export function ChapterReaderView({ chapterId }: { chapterId: number }) {
  const [chapter, setChapter] = useState<ReaderChapter | null>(null);
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [progress, setProgress] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getSessionToken() ?? undefined;

    setLoading(true);
    setError(null);
    setSaveMessage(null);

    void (async () => {
      const chapterResult = await fetchChapterById(chapterId);
      if (!chapterResult.ok) {
        setError(chapterResult.error.message);
        setLoading(false);
        return;
      }

      setChapter(chapterResult.data);

      if (token) {
        const historyResult = await fetchReadingHistory(token, chapterResult.data.novelId);
        if (historyResult.ok) {
          setHistory(historyResult.data);
          const current = historyResult.data.find((item) => item.chapterId === chapterId);
          if (current) {
            setProgress(current.progressPercent);
          }
        }

        await upsertReadingHistory(
          {
            novelId: chapterResult.data.novelId,
            chapterId,
            progressPercent: 5,
          },
          token,
        );
      }

      setLoading(false);
    })();
  }, [chapterId]);

  async function saveProgress() {
    const token = getSessionToken() ?? undefined;
    if (!chapter || !token) {
      setSaveMessage("Sign in to persist reading history.");
      return;
    }

    const result = await upsertReadingHistory(
      {
        novelId: chapter.novelId,
        chapterId: chapter.id,
        progressPercent: progress,
      },
      token,
    );

    if (!result.ok) {
      setSaveMessage(result.error.message);
      return;
    }

    setSaveMessage("Progress saved.");
  }

  const previousChapter = chapterId > 1 ? buildChapterHref(chapterId - 1, chapter?.novelId) : null;
  const nextChapter = buildChapterHref(chapterId + 1, chapter?.novelId);

  return (
    <main className="reader-shell">
      {loading ? <p className="discovery-state">Loading chapter...</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}

      {chapter ? (
        <>
          <section className="reader-card">
            <div className="reader-card__header">
              <span className="home-kicker">Chapter Reader</span>
              <h1>{chapter.title}</h1>
              <p>
                Chapter #{chapter.id} · Novel #{chapter.novelId} · {String(chapter.viewCount)} views
              </p>
            </div>
            <article className="reader-content">{toDisplayText(chapter.postContent) || "No chapter content."}</article>
            <div className="reader-actions">
              {previousChapter ? (
                <Link className="action-secondary" href={previousChapter}>
                  Previous chapter
                </Link>
              ) : null}
              <Link className="action-secondary" href={buildNovelHref(chapter.novelId)}>
                Back to novel
              </Link>
              <Link className="action-secondary" href={nextChapter}>
                Next chapter
              </Link>
            </div>
          </section>

          <section className="reader-card">
            <h2>Reading progress</h2>
            <p className="reader-muted">Progress is saved for authenticated readers via `/reader/me/reading-history`.</p>
            <div className="reader-progress-row">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(event) => setProgress(Number(event.target.value))}
              />
              <span>{progress}%</span>
              <button className="action-primary" type="button" onClick={saveProgress}>
                Save progress
              </button>
            </div>
            {saveMessage ? <p className="reader-muted">{saveMessage}</p> : null}

            {history.length > 0 ? (
              <ul className="reader-history-list">
                {history.slice(0, 5).map((entry) => (
                  <li key={entry.id}>
                    <Link className="reader-history-link" href={buildChapterHref(entry.chapterId ?? 1, entry.novelId)}>
                      Chapter {entry.chapterId ?? "N/A"}
                    </Link>
                    <span>{entry.progressPercent}%</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <SocialThread
            title="Chapter discussion"
            scope={{ chapterId }}
            emptyHint="No replies yet. Be the first to discuss this chapter."
          />
        </>
      ) : null}
    </main>
  );
}
