"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSessionToken } from "../../lib/auth/session-store";
import { AppContext } from "../../providers/app-provider";
import { formatAppCurrency, formatAppNumber } from "../../lib/i18n";
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

function formatMoney(value: number | null, locale: "vi" | "en") {
  return formatAppCurrency(value ?? 0, locale);
}

function getNovelCopy(locale: "vi" | "en") {
  return locale === "vi"
    ? {
        loadingNovelDetails: "Đang tải chi tiết truyện...",
        novelNotFound: "Không tìm thấy truyện",
        readerExperience: "Trải nghiệm đọc",
        novelLabel: "Truyện",
        viewsLabel: "lượt xem",
        noSummaryAvailableYet: "Chưa có tóm tắt.",
        chapterIdLabel: "Mã chương",
        chapterIdPlaceholder: "Nhập mã chương",
        startReading: "Bắt đầu đọc",
        enterValidChapter: "Nhập chương hợp lệ",
        viewPurchaseActivity: "Xem hoạt động mua",
        backToDiscovery: "Quay lại khám phá",
        recentReadingHistory: "Lịch sử đọc gần đây",
        signInAndOpenChapters: "Đăng nhập và mở chương để lưu lịch sử đọc.",
        resumeChapter: "Tiếp tục chương",
        discussionTitle: "Thảo luận truyện",
        discussionEmpty: "Chưa có bình luận. Hãy bắt đầu cuộc thảo luận về truyện này.",
      }
    : {
        loadingNovelDetails: "Loading novel details...",
        novelNotFound: "Novel not found",
        readerExperience: "Reader experience",
        novelLabel: "Novel",
        viewsLabel: "views",
        noSummaryAvailableYet: "No summary available yet.",
        chapterIdLabel: "Chapter ID",
        chapterIdPlaceholder: "Enter chapter id",
        startReading: "Start reading",
        enterValidChapter: "Enter valid chapter",
        viewPurchaseActivity: "View purchase activity",
        backToDiscovery: "Back to discovery",
        recentReadingHistory: "Recent reading history",
        signInAndOpenChapters: "Sign in and open chapters to build resume history.",
        resumeChapter: "Resume chapter",
        discussionTitle: "Novel discussion",
        discussionEmpty: "No comments yet. Start the novel discussion.",
      };
}

function getChapterCopy(locale: "vi" | "en") {
  return locale === "vi"
    ? {
        loadingChapter: "Đang tải chương...",
        chapterReader: "Trình đọc chương",
        chapterLabel: "Chương",
        novelLabel: "Truyện",
        viewsLabel: "lượt xem",
        readingPreferences: "Tùy chọn đọc",
        fontSize: "Cỡ chữ",
        compact: "Gọn",
        comfort: "Thoải mái",
        large: "Lớn",
        theme: "Giao diện",
        light: "Sáng",
        dark: "Tối",
        fontFamily: "Kiểu chữ",
        serif: "Có chân",
        sans: "Không chân",
        monospace: "Đơn cách",
        lineHeight: "Giãn dòng",
        contentWidth: "Độ rộng nội dung",
        chapterLockedTitle: "Chương bị khóa",
        chapterLockedBody:
          "Mua chương này để mở khóa toàn bộ nội dung. Nếu số dư đã nạp thấp, hãy nạp thêm ví rồi thử lại.",
        priceLabel: "Giá",
        comboLabel: "Combo",
        discountSuffix: "giảm",
        processing: "Đang xử lý...",
        purchaseChapter: "Mua chương",
        purchaseCombo: "Mua combo",
        topUpWallet: "Nạp ví",
        noChapterContent: "Chưa có nội dung chương.",
        tableOfContents: "Mục lục",
        loadingChapterList: "Đang tải danh sách chương...",
        previousChapter: "Chương trước",
        firstChapter: "Chương đầu",
        backToNovel: "Quay lại truyện",
        nextChapterLocked: "Chương tiếp theo đang khóa",
        nextChapter: "Chương tiếp theo",
        lastChapter: "Chương cuối",
        readingProgress: "Tiến độ đọc",
        progressSavedForAuthenticatedReaders: "Tiến độ được lưu cho người đọc đã xác thực qua /reader/me/reading-history.",
        signInToPersistReadingHistory: "Đăng nhập để lưu lịch sử đọc.",
        purchaseThisChapterBeforeSavingProgress: "Mua chương này trước khi lưu tiến độ.",
        progressSaved: "Đã lưu tiến độ.",
        signInBeforePurchasingComboAccess: "Đăng nhập trước khi mua quyền truy cập combo.",
        signInBeforePurchasingChapter: "Đăng nhập trước khi mua chương.",
        chapterDetailsUnavailable: "Chi tiết chương hiện không khả dụng.",
        confirmComboPurchase: "Xác nhận mua combo cho truyện #",
        confirmChapterPurchase: "Xác nhận mua chương #",
        insufficientDepositedBalance: "Số dư đã nạp không đủ.",
        topUpWalletAndTryAgain: "Hãy nạp ví rồi thử lại.",
        comboPurchaseSuccessful: "Mua combo thành công. Đã mở khóa các chương bị khóa.",
        allLockedChaptersAlreadyUnlocked: "Tất cả chương bị khóa đã được mở khóa cho tài khoản của bạn.",
        chapterAlreadyUnlockedForYourAccount: "Chương đã được mở khóa sẵn cho tài khoản của bạn.",
        chapterUnlockedImmediately: "Mua thành công. Chương được mở khóa ngay lập tức.",
        unableToVerifyLatestProgressAcrossDevices: "Không thể xác minh tiến độ mới nhất giữa các thiết bị.",
        serverKeptNewerCheckpointFromAnotherSession: "Máy chủ giữ lại mốc mới hơn từ một phiên khác.",
        progressSynchronizedAcrossDevices: "Đã đồng bộ tiến độ giữa các thiết bị.",
        historyChapterLabel: "Chương",
        noRepliesTitle: "Thảo luận chương",
        noRepliesHint: "Chưa có phản hồi. Hãy là người đầu tiên thảo luận chương này.",
      }
    : {
        loadingChapter: "Loading chapter...",
        chapterReader: "Chapter reader",
        chapterLabel: "Chapter",
        novelLabel: "Novel",
        viewsLabel: "views",
        readingPreferences: "Reading preferences",
        fontSize: "Font size",
        compact: "Compact",
        comfort: "Comfort",
        large: "Large",
        theme: "Theme",
        light: "Light",
        dark: "Dark",
        fontFamily: "Font family",
        serif: "Serif",
        sans: "Sans",
        monospace: "Monospace",
        lineHeight: "Line height",
        contentWidth: "Content width",
        chapterLockedTitle: "Chapter locked",
        chapterLockedBody:
          "Purchase this chapter to unlock full reading access. If your deposited balance is low, top up from wallet and retry.",
        priceLabel: "Price",
        comboLabel: "Combo",
        discountSuffix: "off",
        processing: "Processing...",
        purchaseChapter: "Purchase chapter",
        purchaseCombo: "Purchase combo",
        topUpWallet: "Top up wallet",
        noChapterContent: "No chapter content.",
        tableOfContents: "Table of contents",
        loadingChapterList: "Loading chapter list...",
        previousChapter: "Previous chapter",
        firstChapter: "First chapter",
        backToNovel: "Back to novel",
        nextChapterLocked: "Next chapter locked",
        nextChapter: "Next chapter",
        lastChapter: "Last chapter",
        readingProgress: "Reading progress",
        progressSavedForAuthenticatedReaders: "Progress is saved for authenticated readers via /reader/me/reading-history.",
        signInToPersistReadingHistory: "Sign in to persist reading history.",
        purchaseThisChapterBeforeSavingProgress: "Purchase this chapter before saving progress.",
        progressSaved: "Progress saved.",
        signInBeforePurchasingComboAccess: "Sign in before purchasing combo access.",
        signInBeforePurchasingChapter: "Sign in before purchasing chapter access.",
        chapterDetailsUnavailable: "Chapter details are unavailable.",
        confirmComboPurchase: "Confirm combo purchase for novel #",
        confirmChapterPurchase: "Confirm purchase for chapter #",
        insufficientDepositedBalance: "Insufficient deposited balance.",
        topUpWalletAndTryAgain: "Top up your wallet and try again.",
        comboPurchaseSuccessful: "Combo purchase successful. Locked chapters unlocked.",
        allLockedChaptersAlreadyUnlocked: "All locked chapters are already unlocked for your account.",
        chapterAlreadyUnlockedForYourAccount: "Chapter is already unlocked for your account.",
        chapterUnlockedImmediately: "Purchase successful. Chapter unlocked immediately.",
        unableToVerifyLatestProgressAcrossDevices: "Unable to verify latest progress across devices.",
        serverKeptNewerCheckpointFromAnotherSession: "Server kept a newer checkpoint from another session.",
        progressSynchronizedAcrossDevices: "Progress synchronized across devices.",
        historyChapterLabel: "Chapter",
        noRepliesTitle: "Chapter discussion",
        noRepliesHint: "No replies yet. Be the first to discuss this chapter.",
      };
}

export function NovelDetailView({ novelId }: { novelId: number }) {
  const { locale } = useContext(AppContext);
  const copy = getNovelCopy(locale);
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
        setError(novelResult.ok ? copy.novelNotFound : String(novelResult.error.message));
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
  }, [copy.novelNotFound, novelId]);

  const parsedChapterId = useMemo(() => normalizeChapterId(chapterInput), [chapterInput]);
  const startHref = parsedChapterId ? buildChapterHref(parsedChapterId, novelId) : null;

  return (
    <main className="reader-shell">
      {loading ? <p className="discovery-state">{copy.loadingNovelDetails}</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}

      {novel ? (
        <>
          <section className="reader-card">
            <div className="reader-card__header">
              <span className="home-kicker">{copy.readerExperience}</span>
              <h1>{novel.title}</h1>
              <p>
                {copy.novelLabel} #{formatAppNumber(Number(novel.id), locale)} · {formatAppNumber(Number(novel.viewCount), locale)} {copy.viewsLabel}
              </p>
            </div>
            <p className="reader-card__summary">{toDisplayText(novel.postContent).slice(0, 220) || copy.noSummaryAvailableYet}</p>
            <div className="reader-actions">
              <label className="reader-input-group">
                <span>{copy.chapterIdLabel}</span>
                <input
                  value={chapterInput}
                  onChange={(event) => setChapterInput(event.target.value)}
                  placeholder={copy.chapterIdPlaceholder}
                  inputMode="numeric"
                />
              </label>
              {startHref ? (
                <Link className="action-primary" href={startHref}>
                  {copy.startReading}
                </Link>
              ) : (
                <button className="action-primary" type="button" disabled>
                  {copy.enterValidChapter}
                </button>
              )}
              <Link className="action-secondary" href="/dashboard?section=purchases">
                {copy.viewPurchaseActivity}
              </Link>
              <Link className="action-secondary" href="/">
                {copy.backToDiscovery}
              </Link>
            </div>
          </section>

          <section className="reader-card">
            <h2>{copy.recentReadingHistory}</h2>
            {history.length === 0 ? (
              <p className="reader-muted">{copy.signInAndOpenChapters}</p>
            ) : (
              <ul className="reader-history-list">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <Link className="reader-history-link" href={buildChapterHref(entry.chapterId ?? 1, entry.novelId)}>
                      {copy.resumeChapter} {formatAppNumber(Number(entry.chapterId ?? 0), locale)}
                    </Link>
                    <span>{formatAppNumber(Number(entry.progressPercent), locale)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <SocialThread
            title={copy.discussionTitle}
            scope={{ novelId }}
            emptyHint={copy.discussionEmpty}
          />
        </>
      ) : null}
    </main>
  );
}

export function ChapterReaderView({ chapterId }: { chapterId: number }) {
  const { locale } = useContext(AppContext);
  const copy = getChapterCopy(locale);
  const [chapter, setChapter] = useState<ReaderChapter | null>(null);
  const [chapterContext, setChapterContext] = useState<ReaderChapterContext | null>(null);
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [progress, setProgress] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(chapterId === 1);
  const [requiresPurchase, setRequiresPurchase] = useState(chapterId > 1);
  const [chapterPrice, setChapterPrice] = useState<number | null>(null);
  const [comboPrice, setComboPrice] = useState<number | null>(null);
  const [comboDiscountPct, setComboDiscountPct] = useState<number | null>(null);
  const [chapterPricingMeta, setChapterPricingMeta] = useState<Record<number, { isLocked: boolean; effectivePrice: number; priceSource: string }>>({});
  const [vipAccessMode, setVipAccessMode] = useState(false);
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
    setSyncStatus(null);
    setPurchaseMessage(null);
    setChapterContext(null);
    setIsUnlocked(chapterId === 1);
    setRequiresPurchase(chapterId > 1);
    setChapterPrice(null);
    setComboPrice(null);
    setComboDiscountPct(null);
    setChapterPricingMeta({});
    setVipAccessMode(false);

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
          const nextPricingMeta: Record<number, { isLocked: boolean; effectivePrice: number; priceSource: string }> = {};
          pricingResult.data.chapters.forEach((item) => {
            nextPricingMeta[item.id] = {
              isLocked: item.isLocked,
              effectivePrice: item.effectivePrice,
              priceSource: item.priceSource,
            };
          });

          setChapterPricingMeta(nextPricingMeta);
          setVipAccessMode(
            pricingResult.data.chapters.length > 0
              && pricingResult.data.chapters.every((item) => item.priceSource === "vip_subscription"),
          );

          const chapterPricing = nextPricingMeta[chapterId];
          if (chapterPricing) {
            setRequiresPurchase(chapterPricing.isLocked);
            setChapterPrice(chapterPricing.effectivePrice);
            if (chapterPricing.isLocked === false) {
              setIsUnlocked(true);
            }
          } else {
            setRequiresPurchase(false);
            setIsUnlocked(true);
            setChapterPrice(0);
          }

          setComboPrice(pricingResult.data.combo.discountedTotalPrice);
          setComboDiscountPct(pricingResult.data.settings.comboDiscountPct);
        }

        const historyResult = await fetchReadingHistory(token, chapterResult.data.novelId);
        const localHistoryEntry = historyResult.ok
          ? historyResult.data.find((item) => item.chapterId === chapterId)
          : undefined;

        if (historyResult.ok) {
          setHistory(historyResult.data);
          if (localHistoryEntry) {
            setProgress(localHistoryEntry.progressPercent);
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
              progressPercent: localHistoryEntry?.progressPercent ?? 5,
              clientUpdatedAt: localHistoryEntry?.lastReadAt ?? new Date().toISOString(),
            },
            token,
          );

          if (!syncResult.ok) {
            syncedChapterKeysRef.current.delete(syncKey);
            setSyncStatus(copy.unableToVerifyLatestProgressAcrossDevices);
          } else {
            setProgress(syncResult.data.effectiveProgressPercent);
            if (syncResult.data.conflictDetected && !syncResult.data.serverAcceptedProgress) {
              setSyncStatus(copy.serverKeptNewerCheckpointFromAnotherSession);
            } else if (!syncResult.data.firstOpen) {
              setSyncStatus(copy.progressSynchronizedAcrossDevices);
            }
          }
        }
      }

      setLoading(false);
    })();
  }, [chapterId, copy.progressSynchronizedAcrossDevices, copy.serverKeptNewerCheckpointFromAnotherSession, copy.unableToVerifyLatestProgressAcrossDevices]);

  async function saveProgress() {
    const token = getSessionToken() ?? undefined;
    if (!chapter || !token) {
      setSaveMessage(copy.signInToPersistReadingHistory);
      return;
    }

    if (requiresPurchase && !isUnlocked) {
      setSaveMessage(copy.purchaseThisChapterBeforeSavingProgress);
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

    setSaveMessage(copy.progressSaved);
  }

  async function purchaseComboAccess() {
    const token = getSessionToken() ?? undefined;
    if (!token) {
      setPurchaseMessage(copy.signInBeforePurchasingComboAccess);
      return;
    }

    if (!chapter) {
      setPurchaseMessage(copy.chapterDetailsUnavailable);
      return;
    }

    const confirmed = window.confirm(
      copy.confirmComboPurchase + chapter.novelId + " at " + formatMoney(comboPrice, locale) + "?",
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
      setPurchaseMessage(copy.insufficientDepositedBalance + " " + copy.topUpWalletAndTryAgain);
      return;
    }

    setIsUnlocked(true);
    setRequiresPurchase(false);
    setChapterPricingMeta((prev) => {
      const next: Record<number, { isLocked: boolean; effectivePrice: number; priceSource: string }> = {};
      Object.keys(prev).forEach((key) => {
        const chapterKey = Number(key);
        const previous = prev[chapterKey] ?? {
          isLocked: false,
          effectivePrice: 0,
          priceSource: "novel_default",
        };
        next[chapterKey] = {
          ...previous,
          isLocked: false,
        };
      });
      return next;
    });
    setPurchaseMessage(
      comboResult.data.status === "already_owned"
        ? copy.allLockedChaptersAlreadyUnlocked
        : copy.comboPurchaseSuccessful,
    );
  }

  async function purchaseChapterAccess() {
    const token = getSessionToken() ?? undefined;
    if (!token) {
      setPurchaseMessage(copy.signInBeforePurchasingChapter);
      return;
    }

    if (!chapter) {
      setPurchaseMessage(copy.chapterDetailsUnavailable);
      return;
    }

    const confirmed = window.confirm(
      copy.confirmChapterPurchase + chapter.id + " at " + formatMoney(chapterPrice, locale) + "?",
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
      setPurchaseMessage(copy.insufficientDepositedBalance + " " + copy.topUpWalletAndTryAgain);
      return;
    }

    setIsUnlocked(true);
    setRequiresPurchase(false);
    setChapterPricingMeta((prev) => {
      const chapterMeta = prev[chapterId];
      if (!chapterMeta) {
        return prev;
      }

      return {
        ...prev,
        [chapterId]: {
          ...chapterMeta,
          isLocked: false,
        },
      };
    });
    setPurchaseMessage(
      purchaseResult.data.status === "already_owned"
        ? copy.chapterAlreadyUnlockedForYourAccount
        : copy.chapterUnlockedImmediately,
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
      {loading ? <p className="discovery-state">{copy.loadingChapter}</p> : null}
      {error ? <p className="discovery-state discovery-state--error">{error}</p> : null}

      {chapter ? (
        <>
          <section className="reader-card" style={{ gap: 16 }}>
            <div className="reader-card__header">
              <span className="home-kicker">{copy.chapterReader}</span>
              <h1>{chapter.title}</h1>
              <p>
                {copy.chapterLabel} #{formatAppNumber(Number(chapter.id), locale)} · {copy.novelLabel} #{formatAppNumber(Number(chapter.novelId), locale)} · {formatAppNumber(Number(chapter.viewCount), locale)} {copy.viewsLabel}
              </p>
            </div>

            <div className="reader-preference-bar" role="group" aria-label={copy.readingPreferences}>
              <label className="reader-input-group">
                <span>{copy.fontSize}</span>
                <select
                  value={fontSize}
                  onChange={(event) => {
                    const next = event.target.value as ReaderFontSizeOption;
                    setFontSize(next);
                    saveTypography({ fontSize: next });
                  }}
                >
                  <option value="sm">{copy.compact}</option>
                  <option value="md">{copy.comfort}</option>
                  <option value="lg">{copy.large}</option>
                </select>
              </label>

              <label className="reader-input-group">
                <span>{copy.theme}</span>
                <select
                  value={themeMode}
                  onChange={(event) => {
                    const next = event.target.value as ReaderThemeMode;
                    setThemeMode(next);
                    saveTypography({ themeMode: next });
                  }}
                >
                  <option value="light">{copy.light}</option>
                  <option value="dark">{copy.dark}</option>
                </select>
              </label>

              <label className="reader-input-group">
                <span>{copy.fontFamily}</span>
                <select
                  value={fontFamily}
                  onChange={(event) => {
                    const next = event.target.value as ReaderFontFamilyOption;
                    setFontFamily(next);
                    saveTypography({ fontFamily: next });
                  }}
                >
                  <option value="serif">{copy.serif}</option>
                  <option value="sans">{copy.sans}</option>
                  <option value="mono">{copy.monospace}</option>
                </select>
              </label>

              <label className="reader-input-group">
                <span>{copy.lineHeight}</span>
                <select
                  value={lineHeight}
                  onChange={(event) => {
                    const next = event.target.value as ReaderLineHeightOption;
                    setLineHeight(next);
                    saveTypography({ lineHeight: next });
                  }}
                >
                  <option value="compact">{copy.compact}</option>
                  <option value="comfortable">{copy.comfort}</option>
                  <option value="airy">{copy.large}</option>
                </select>
              </label>

              <label className="reader-input-group">
                <span>{copy.contentWidth}</span>
                <select
                  value={contentWidth}
                  onChange={(event) => {
                    const next = event.target.value as ReaderContentWidthOption;
                    setContentWidth(next);
                    saveTypography({ contentWidth: next });
                  }}
                >
                  <option value="narrow">{copy.compact}</option>
                  <option value="standard">{copy.comfort}</option>
                  <option value="wide">{copy.large}</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(240px, 1fr)", alignItems: "start" }}>
              <article style={{ minWidth: 0 }}>
                {requiresPurchase && !isUnlocked ? (
                  <article className="reader-locked-box">
                    <h2>{copy.chapterLockedTitle}</h2>
                    <p>{copy.chapterLockedBody}</p>

                    <p className="reader-muted">{copy.priceLabel}: {formatMoney(chapterPrice, locale)}</p>
                    {comboPrice !== null && comboPrice > 0 ? (
                      <p className="reader-muted">
                        {copy.comboLabel}: {formatMoney(comboPrice, locale)}
                        {comboDiscountPct !== null ? " (" + formatAppNumber(comboDiscountPct, locale) + "% " + copy.discountSuffix + ")" : ""}
                      </p>
                    ) : null}

                    <div className="reader-actions">
                      <button
                        className="action-primary"
                        type="button"
                        disabled={purchaseBusy}
                        onClick={purchaseChapterAccess}
                      >
                        {purchaseBusy ? copy.processing : copy.purchaseChapter}
                      </button>
                      {comboPrice !== null && comboPrice > 0 ? (
                        <button
                          className="action-secondary"
                          type="button"
                          disabled={purchaseBusy}
                          onClick={purchaseComboAccess}
                        >
                          {copy.purchaseCombo}
                        </button>
                      ) : null}
                      <Link className="action-secondary" href="/dashboard?section=wallet">
                        {copy.topUpWallet}
                      </Link>
                    </div>

                    {purchaseMessage ? <p className="reader-muted">{purchaseMessage}</p> : null}
                  </article>
                ) : (
                  <article
                    className={
                      "reader-content " +
                      "reader-content--font-" + fontSize + " " +
                      "reader-content--theme-" + themeMode + " " +
                      "reader-content--font-family-" + fontFamily + " " +
                      "reader-content--line-height-" + lineHeight + " " +
                      "reader-content--width-" + contentWidth
                    }
                  >
                    {toDisplayText(chapter.postContent) || copy.noChapterContent}
                  </article>
                )}
              </article>

              <aside className="reader-chapter-menu" aria-label={copy.tableOfContents}>
                <h2>{copy.tableOfContents}</h2>
                {chapterContext?.chapters.length ? (
                  <ul className="reader-chapter-menu__list">
                    {chapterContext.chapters.map((item) => (
                      <li key={item.id}>
                        <Link
                          className="reader-history-link"
                          data-active={item.id === chapter.id ? "true" : "false"}
                          href={buildChapterHref(item.id, chapterContext.novelId)}
                        >
                          <span>{item.title}</span>
                          {vipAccessMode ? (
                            <span className="reader-chapter-badge reader-chapter-badge--vip" aria-label={copy.comboLabel + " VIP"}>
                              <span className="reader-chapter-badge__icon" aria-hidden="true" />
                              VIP
                            </span>
                          ) : chapterPricingMeta[item.id]?.isLocked ? (
                            <span className="reader-chapter-badge reader-chapter-badge--locked" aria-label={copy.chapterLockedTitle}>
                              <span className="reader-chapter-badge__icon" aria-hidden="true" />
                              {formatMoney(chapterPricingMeta[item.id]?.effectivePrice ?? 0, locale)}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="reader-muted">{copy.loadingChapterList}</p>
                )}
              </aside>
            </div>

            <div className="reader-actions">
              {previousChapterHref ? (
                <Link className="action-secondary" href={previousChapterHref}>
                  {copy.previousChapter}
                </Link>
              ) : (
                <button className="action-secondary" type="button" disabled>
                  {copy.firstChapter}
                </button>
              )}

              <Link className="action-secondary" href={buildNovelHref(chapter.novelId)}>
                {copy.backToNovel}
              </Link>

              {requiresPurchase && !isUnlocked ? (
                <button className="action-secondary" type="button" disabled>
                  {copy.nextChapterLocked}
                </button>
              ) : nextChapterHref ? (
                <Link className="action-secondary" href={nextChapterHref}>
                  {copy.nextChapter}
                </Link>
              ) : (
                <button className="action-secondary" type="button" disabled>
                  {copy.lastChapter}
                </button>
              )}
            </div>
          </section>

          <section className="reader-card">
            <h2>{copy.readingProgress}</h2>
            <p className="reader-muted">{copy.progressSavedForAuthenticatedReaders}</p>
            <div className="reader-progress-row">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(event) => setProgress(Number(event.target.value))}
              />
              <span>{formatAppNumber(progress, locale)}%</span>
              <button className="action-primary" type="button" onClick={saveProgress}>
                {copy.progressSaved}
              </button>
            </div>
            {saveMessage ? <p className="reader-muted">{saveMessage}</p> : null}
            {syncStatus ? (
              <p
                className={
                  "reader-sync-status " +
                  (syncStatus.includes(copy.serverKeptNewerCheckpointFromAnotherSession) ? "reader-sync-status--warning" : "reader-sync-status--ok")
                }
              >
                {syncStatus}
              </p>
            ) : null}

            {history.length > 0 ? (
              <ul className="reader-history-list">
                {history.slice(0, 5).map((entry) => (
                  <li key={entry.id}>
                    <Link className="reader-history-link" href={buildChapterHref(entry.chapterId ?? 1, entry.novelId)}>
                      {copy.historyChapterLabel} {formatAppNumber(Number(entry.chapterId ?? 0), locale)}
                    </Link>
                    <span>{formatAppNumber(Number(entry.progressPercent), locale)}%</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <SocialThread
            title={copy.noRepliesTitle}
            scope={{ chapterId }}
            emptyHint={copy.noRepliesHint}
          />
        </>
      ) : null}
    </main>
  );
}
