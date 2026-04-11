"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSessionToken } from "../../lib/auth/session-store";
import { SocialThread } from "../social/social";
import {
  buildChapterHref,
  buildNovelHref,
  fetchChapterById,
  fetchChapterContextById,
  fetchFirstChapterByNovelId,
  fetchNovelById,
  fetchReaderNovelPricing,
  fetchReadingHistory,
  syncReaderChapterOpen,
  normalizeChapterId,
  purchaseReaderChapter,
  purchaseReaderNovelCombo,
  upsertReadingHistory,
} from "./api";
import {
  READER_TYPOGRAPHY_DEFAULTS,
  loadReaderTypographyPreferences,
  saveReaderTypographyPreferences,
} from "./preferences";
import type {
  ReaderChapter,
  ReaderChapterContext,
  ReaderContentWidthOption,
  ReaderFontFamilyOption,
  ReaderFontSizeOption,
  ReaderLineHeightOption,
  ReaderNovel,
  ReaderThemeMode,
  ReadingHistoryEntry,
} from "./types";

function toDisplayText(content: string) {
  return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatVnd(value: number | null) {
  return new Intl.NumberFormat("vi-VN").format(value ?? 0);
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

      let preferredChapterId: number | null = null;
      const firstChapterResult = await fetchFirstChapterByNovelId(novelId);
      if (firstChapterResult.ok && firstChapterResult.data.chapterId) {
        preferredChapterId = firstChapterResult.data.chapterId;
      }

      if (token) {
        const historyResult = await fetchReadingHistory(token, novelId);
        if (historyResult.ok) {
          setHistory(historyResult.data);
          const resume = historyResult.data[0]?.chapterId;
          if (resume) {
            preferredChapterId = resume;
          }
        }
      }

      if (preferredChapterId) {
        setChapterInput(String(preferredChapterId));
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
              <Link className="action-secondary" href="/dashboard?section=purchases">
                View purchase activity
              </Link>
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
  const [chapterContext, setChapterContext] = useState<ReaderChapterContext | null>(null);
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [progress, setProgress] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(chapterId === 1);
  const [requiresPurchase, setRequiresPurchase] = useState(chapterId > 1);
  const [chapterPrice, setChapterPrice] = useState<number | null>(null);
  const [comboPrice, setComboPrice] = useState<number | null>(null);
  const [comboDiscountPct, setComboDiscountPct] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<ReaderFontSizeOption>(READER_TYPOGRAPHY_DEFAULTS.fontSize);
  const [themeMode, setThemeMode] = useState<ReaderThemeMode>(READER_TYPOGRAPHY_DEFAULTS.themeMode);
  const [fontFamily, setFontFamily] = useState<ReaderFontFamilyOption>(READER_TYPOGRAPHY_DEFAULTS.fontFamily);
  const [lineHeight, setLineHeight] = useState<ReaderLineHeightOption>(READER_TYPOGRAPHY_DEFAULTS.lineHeight);
  const [contentWidth, setContentWidth] = useState<ReaderContentWidthOption>(READER_TYPOGRAPHY_DEFAULTS.contentWidth);
  const syncedChapterKeysRef = useRef(new Set<string>());

  function saveTypography(next: {
    fontSize?: ReaderFontSizeOption;
    themeMode?: ReaderThemeMode;
    fontFamily?: ReaderFontFamilyOption;
    lineHeight?: ReaderLineHeightOption;
    contentWidth?: ReaderContentWidthOption;
  }) {
    saveReaderTypographyPreferences({
      fontSize: next.fontSize ?? fontSize,
      themeMode: next.themeMode ?? themeMode,
      fontFamily: next.fontFamily ?? fontFamily,
      lineHeight: next.lineHeight ?? lineHeight,
      contentWidth: next.contentWidth ?? contentWidth,
    });
  }

  useEffect(() => {
    const loaded = loadReaderTypographyPreferences();
    setFontSize(loaded.fontSize);
    setThemeMode(loaded.themeMode);
    setFontFamily(loaded.fontFamily);
    setLineHeight(loaded.lineHeight);
    setContentWidth(loaded.contentWidth);
  }, []);

  useEffect(() => {
    const token = getSessionToken() ?? undefined;

    setLoading(true);
    setError(null);
    setSaveMessage(null);
    setPurchaseMessage(null);
    setChapterContext(null);
    setIsUnlocked(chapterId === 1);
    setRequiresPurchase(chapterId > 1);
    setChapterPrice(null);
    setComboPrice(null);
    setComboDiscountPct(null);

    void (async () => {
      const chapterResult = await fetchChapterById(chapterId);
      if (!chapterResult.ok) {
        setError(chapterResult.error.message);
        setLoading(false);
        return;
      }

      setChapter(chapterResult.data);

      const contextResult = await fetchChapterContextById(
        chapterId,
        chapterResult.data.novelId,
      );
      if (contextResult.ok) {
        setChapterContext(contextResult.data);
      }

      if (token) {
        const pricingResult = await fetchReaderNovelPricing(chapterResult.data.novelId, token);
        if (pricingResult.ok) {
          const chapterPricing = pricingResult.data.chapters.find((item) => item.id === chapterId);
          if (chapterPricing) {
            setRequiresPurchase(chapterPricing.isLocked);
            setChapterPrice(chapterPricing.effectivePrice);
            if (!chapterPricing.isLocked) {
              setIsUnlocked(true);
            }
          }
          setComboPrice(pricingResult.data.combo.discountedTotalPrice);
          setComboDiscountPct(pricingResult.data.settings.comboDiscountPct);
        }

        const historyResult = await fetchReadingHistory(token, chapterResult.data.novelId);
        if (historyResult.ok) {
          setHistory(historyResult.data);
          const current = historyResult.data.find((item) => item.chapterId === chapterId);
          if (current) {
            setProgress(current.progressPercent);
            setIsUnlocked(true);
          }
        }

        const syncKey = String(chapterResult.data.novelId) + ":" + String(chapterId);
        if (!syncedChapterKeysRef.current.has(syncKey)) {
          syncedChapterKeysRef.current.add(syncKey);
          const syncResult = await syncReaderChapterOpen(
            {
              novelId: chapterResult.data.novelId,
              chapterId,
              progressPercent: historyResult.ok
                ? (historyResult.data.find((item) => item.chapterId === chapterId)?.progressPercent ?? 5)
                : 5,
            },
            token,
          );

          if (!syncResult.ok) {
            syncedChapterKeysRef.current.delete(syncKey);
          }
        }
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

    if (requiresPurchase && !isUnlocked) {
      setSaveMessage("Purchase this chapter before saving progress.");
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

  async function purchaseComboAccess() {
    const token = getSessionToken() ?? undefined;
    if (!token) {
      setPurchaseMessage("Sign in before purchasing combo access.");
      return;
    }

    if (!chapter) {
      setPurchaseMessage("Chapter details are unavailable.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm combo purchase for novel #${chapter.novelId} at ${formatVnd(comboPrice)} VND?`,
    );
    if (!confirmed) {
      return;
    }

    setPurchaseBusy(true);
    setPurchaseMessage(null);

    const comboResult = await purchaseReaderNovelCombo(chapter.novelId, token);

    setPurchaseBusy(false);

    if (!comboResult.ok) {
      setPurchaseMessage(comboResult.error.message);
      return;
    }

    if (comboResult.data.status === "insufficient_balance") {
      setIsUnlocked(false);
      setPurchaseMessage("Insufficient deposited balance. Top up your wallet and try again.");
      return;
    }

    setIsUnlocked(true);
    setPurchaseMessage(
      comboResult.data.status === "already_owned"
        ? "All locked chapters are already unlocked for your account."
        : "Combo purchase successful. Locked chapters unlocked.",
    );
  }

  async function purchaseChapterAccess() {
    const token = getSessionToken() ?? undefined;
    if (!token) {
      setPurchaseMessage("Sign in before purchasing chapter access.");
      return;
    }

    if (!chapter) {
      setPurchaseMessage("Chapter details are unavailable.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm purchase for chapter #${chapter.id} at ${formatVnd(chapterPrice)} VND?`,
    );
    if (!confirmed) {
      return;
    }

    setPurchaseBusy(true);
    setPurchaseMessage(null);

    const purchaseResult = await purchaseReaderChapter(
      {
        chapterId: chapter.id,
        novelId: chapter.novelId,
      },
      token,
    );

    setPurchaseBusy(false);

    if (!purchaseResult.ok) {
      setPurchaseMessage(purchaseResult.error.message);
      return;
    }

    if (purchaseResult.data.status === "insufficient_balance") {
      setIsUnlocked(false);
      setPurchaseMessage("Insufficient deposited balance. Top up your wallet and try again.");
      return;
    }

    setIsUnlocked(true);
    setPurchaseMessage(
      purchaseResult.data.status === "already_owned"
        ? "Chapter is already unlocked for your account."
        : "Purchase successful. Chapter unlocked immediately.",
    );

    const refreshedChapter = await fetchChapterById(chapter.id);
    if (refreshedChapter.ok) {
      setChapter(refreshedChapter.data);
    }

    const refreshedHistory = await fetchReadingHistory(token, chapter.novelId);
    if (refreshedHistory.ok) {
      setHistory(refreshedHistory.data);
    }
  }

  const previousChapterHref = chapterContext?.previousChapterId
    ? buildChapterHref(chapterContext.previousChapterId, chapterContext.novelId)
    : null;
  const nextChapterHref = chapterContext?.nextChapterId
    ? buildChapterHref(chapterContext.nextChapterId, chapterContext.novelId)
    : null;

  return (
    <main className="reader-shell" style={{ width: "min(1200px, calc(100% - 32px))" }}>
      {loading ? <p className="discovery-state">Loading chapter...</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}

      {chapter ? (
        <>
          <section className="reader-card" style={{ gap: 16 }}>
            <div className="reader-card__header">
              <span className="home-kicker">Chapter Reader</span>
              <h1>{chapter.title}</h1>
              <p>
                Chapter #{chapter.id} · Novel #{chapter.novelId} · {String(chapter.viewCount)} views
              </p>
            </div>

            <div className="reader-preference-bar" role="group" aria-label="Reading preferences">
              <label className="reader-input-group">
                <span>Font size</span>
                <select
                  value={fontSize}
                  onChange={(event) => {
                    const next = event.target.value as ReaderFontSizeOption;
                    setFontSize(next);
                    saveTypography({ fontSize: next });
                  }}
                >
                  <option value="sm">Compact</option>
                  <option value="md">Comfort</option>
                  <option value="lg">Large</option>
                </select>
              </label>

              <label className="reader-input-group">
                <span>Theme</span>
                <select
                  value={themeMode}
                  onChange={(event) => {
                    const next = event.target.value as ReaderThemeMode;
                    setThemeMode(next);
                    saveTypography({ themeMode: next });
                  }}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>

              <label className="reader-input-group">
                <span>Font family</span>
                <select
                  value={fontFamily}
                  onChange={(event) => {
                    const next = event.target.value as ReaderFontFamilyOption;
                    setFontFamily(next);
                    saveTypography({ fontFamily: next });
                  }}
                >
                  <option value="serif">Serif</option>
                  <option value="sans">Sans</option>
                  <option value="mono">Monospace</option>
                </select>
              </label>

              <label className="reader-input-group">
                <span>Line height</span>
                <select
                  value={lineHeight}
                  onChange={(event) => {
                    const next = event.target.value as ReaderLineHeightOption;
                    setLineHeight(next);
                    saveTypography({ lineHeight: next });
                  }}
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="airy">Airy</option>
                </select>
              </label>

              <label className="reader-input-group">
                <span>Content width</span>
                <select
                  value={contentWidth}
                  onChange={(event) => {
                    const next = event.target.value as ReaderContentWidthOption;
                    setContentWidth(next);
                    saveTypography({ contentWidth: next });
                  }}
                >
                  <option value="narrow">Narrow</option>
                  <option value="standard">Standard</option>
                  <option value="wide">Wide</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(240px, 1fr)", alignItems: "start" }}>
              <article style={{ minWidth: 0 }}>
                {requiresPurchase && !isUnlocked ? (
                  <article className="reader-locked-box">
                    <h2>Chapter locked</h2>
                    <p>
                      Purchase this chapter to unlock full reading access. If your deposited balance is low,
                      top up from wallet and retry.
                    </p>

                    <p className="reader-muted">Price: {formatVnd(chapterPrice)} VND</p>
                    {comboPrice !== null && comboPrice > 0 ? (
                      <p className="reader-muted">
                        Combo: {formatVnd(comboPrice)} VND
                        {comboDiscountPct !== null ? " (" + comboDiscountPct + "% off)" : ""}
                      </p>
                    ) : null}

                    <div className="reader-actions">
                      <button
                        className="action-primary"
                        type="button"
                        disabled={purchaseBusy}
                        onClick={purchaseChapterAccess}
                      >
                        {purchaseBusy ? "Processing..." : "Purchase chapter"}
                      </button>
                      {comboPrice !== null && comboPrice > 0 ? (
                        <button
                          className="action-secondary"
                          type="button"
                          disabled={purchaseBusy}
                          onClick={purchaseComboAccess}
                        >
                          Purchase combo
                        </button>
                      ) : null}
                      <Link className="action-secondary" href="/dashboard?section=wallet">
                        Top up wallet
                      </Link>
                    </div>

                    {purchaseMessage ? <p className="reader-muted">{purchaseMessage}</p> : null}
                  </article>
                ) : (
                  <article
                    className={
                      `reader-content ` +
                      `reader-content--font-${fontSize} ` +
                      `reader-content--theme-${themeMode} ` +
                      `reader-content--font-family-${fontFamily} ` +
                      `reader-content--line-height-${lineHeight} ` +
                      `reader-content--width-${contentWidth}`
                    }
                  >
                    {toDisplayText(chapter.postContent) || "No chapter content."}
                  </article>
                )}
              </article>

              <aside aria-label="Chapter table of contents" style={{ border: "1px solid var(--line)", borderRadius: 12, background: "#fff", padding: 12, display: "grid", gap: 10 }}>
                <h2>Table of contents</h2>
                {chapterContext?.chapters.length ? (
                  <ul style={{ listStyle: "none", display: "grid", gap: 8 }}>
                    {chapterContext.chapters.map((item) => (
                      <li key={item.id}>
                        <Link
                          className="reader-history-link"
                          style={item.id === chapter.id ? { textDecoration: "underline" } : undefined}
                          href={buildChapterHref(item.id, chapterContext.novelId)}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="reader-muted">Loading chapter list...</p>
                )}
              </aside>
            </div>

            <div className="reader-actions">
              {previousChapterHref ? (
                <Link className="action-secondary" href={previousChapterHref}>
                  Previous chapter
                </Link>
              ) : (
                <button className="action-secondary" type="button" disabled>
                  First chapter
                </button>
              )}

              <Link className="action-secondary" href={buildNovelHref(chapter.novelId)}>
                Back to novel
              </Link>

              {requiresPurchase && !isUnlocked ? (
                <button className="action-secondary" type="button" disabled>
                  Next chapter locked
                </button>
              ) : nextChapterHref ? (
                <Link className="action-secondary" href={nextChapterHref}>
                  Next chapter
                </Link>
              ) : (
                <button className="action-secondary" type="button" disabled>
                  Last chapter
                </button>
              )}
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
