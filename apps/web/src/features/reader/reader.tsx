"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  List,
  LockOpen,
  Mic2,
  Moon,
  Settings,
  Sparkles,
  Star,
  Sun,
  Type,
  Wallet,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { getSessionToken } from "../../lib/auth/session-store";
import { AppContext } from "../../providers/app-provider";
import { formatAppCurrency, formatAppNumber } from "../../lib/i18n";
import { resolveImageUrl } from "../../lib/image";
import {
  DEFAULT_PUBLIC_AD_SETTINGS,
  fetchPublicAdSettings,
  type PublicAdSettings,
} from "../ads/api";
import { fetchDiscoveryNovels } from "../discovery/api";
import type { DiscoveryNovel } from "../discovery/types";
import { SocialThread } from "../social/social";
import { SponsoredNativeBanner } from "../ads/sponsored-native-banner";
import {
  fetchNovelReviews,
  fetchNovelReviewSummary,
  submitNovelReview,
  type NovelReviewListResponse,
  type NovelReviewSummary,
} from "../social/api";
import {
  addBookmark,
  buildChapterHref,
  buildNovelHref,
  fetchChapterById,
  fetchBookmarkEntries,
  fetchChapterContextById,
  fetchChapterLikeStatus,
  fetchChaptersByNovelId,
  fetchFirstChapterByNovelId,
  fetchNovelById,
  fetchNovelRecommendationStatus,
  fetchReaderNovelPricing,
  fetchReadingHistory,
  recommendNovel,
  removeBookmark,
  syncReaderChapterOpen,
  likeReaderChapter,
  purchaseReaderChapter,
  purchaseReaderNovelCombo,
  upsertReadingHistory,
} from "./api";
import type { NovelPricingResponse } from "../finance/types";
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
  NovelRecommendationStatus,
  ReaderThemeMode,
  ReadingHistoryEntry,
} from "./types";

function toDisplayText(content: string) {
  return content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMoney(value: number | null, locale: "vi" | "en") {
  return formatAppCurrency(value ?? 0, locale);
}

const CHAPTER_AD_COUNTER_KEY = "chapter-ad-counter";
const CHAPTER_AD_ANON_KEY = "chapter-ad-anonymous-id";
const CHAPTER_AD_ROTATION_KEY = "chapter-ad-link-rotation";

type ChapterAdCounter = {
  actorId: string;
  novelId: number;
  counter: number;
  lastAdShownAt: number | null;
};

type ChapterAdRotationState = {
  actorId: string;
  nextIndex: number;
  updatedAt: number | null;
};

function getAnonymousReaderId() {
  const existing = window.localStorage.getItem(CHAPTER_AD_ANON_KEY);
  if (existing) {
    return existing;
  }

  const next =
    window.crypto?.randomUUID?.() ??
    "anon-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2);
  window.localStorage.setItem(CHAPTER_AD_ANON_KEY, next);
  return next;
}

function getChapterAdActorId(userId?: number | null) {
  return userId ? `user:${userId}` : getAnonymousReaderId();
}

function loadChapterAdCounter(
  actorId: string,
  novelId: number,
): ChapterAdCounter {
  const empty: ChapterAdCounter = {
    actorId,
    novelId,
    counter: 0,
    lastAdShownAt: null,
  };

  try {
    const stored = window.localStorage.getItem(CHAPTER_AD_COUNTER_KEY);
    if (!stored) {
      return empty;
    }

    const parsed = JSON.parse(stored) as Partial<ChapterAdCounter>;
    if (parsed.actorId !== actorId || parsed.novelId !== novelId) {
      return empty;
    }

    return {
      actorId,
      novelId,
      counter: Number.isInteger(parsed.counter) ? (parsed.counter ?? 0) : 0,
      lastAdShownAt:
        typeof parsed.lastAdShownAt === "number" ? parsed.lastAdShownAt : null,
    };
  } catch {
    return empty;
  }
}

function saveChapterAdCounter(counter: ChapterAdCounter) {
  window.localStorage.setItem(CHAPTER_AD_COUNTER_KEY, JSON.stringify(counter));
}

function loadChapterAdRotation(actorId: string): ChapterAdRotationState {
  const empty: ChapterAdRotationState = {
    actorId,
    nextIndex: 0,
    updatedAt: null,
  };

  try {
    const stored = window.localStorage.getItem(CHAPTER_AD_ROTATION_KEY);
    if (!stored) {
      return empty;
    }

    const parsed = JSON.parse(stored) as Partial<ChapterAdRotationState>;
    if (parsed.actorId !== actorId) {
      return empty;
    }

    return {
      actorId,
      nextIndex:
        Number.isInteger(parsed.nextIndex) && (parsed.nextIndex ?? 0) >= 0
          ? (parsed.nextIndex ?? 0)
          : 0,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : null,
    };
  } catch {
    return empty;
  }
}

function saveChapterAdRotation(state: ChapterAdRotationState) {
  window.localStorage.setItem(CHAPTER_AD_ROTATION_KEY, JSON.stringify(state));
}

function getChapterGateLinkSequence(settings: PublicAdSettings) {
  const urls = [settings.smartlinkUrl, settings.chapterGateAffiliateUrl].filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0,
  );

  return urls.filter((url, index) => urls.indexOf(url) === index);
}

function getNextChapterGateUrl(
  settings: PublicAdSettings,
  userId?: number | null,
) {
  const urls = getChapterGateLinkSequence(settings);
  if (urls.length === 0) {
    return null;
  }

  if (urls.length === 1) {
    return urls[0];
  }

  const actorId = getChapterAdActorId(userId);
  const current = loadChapterAdRotation(actorId);
  const nextIndex = current.nextIndex % urls.length;
  const nextUrl = urls[nextIndex] ?? urls[0];

  saveChapterAdRotation({
    actorId,
    nextIndex: (nextIndex + 1) % urls.length,
    updatedAt: Date.now(),
  });

  return nextUrl;
}

function advanceChapterAdCounter(
  novelId: number,
  threshold: number,
  userId?: number | null,
) {
  const actorId = getChapterAdActorId(userId);
  const current = loadChapterAdCounter(actorId, novelId);
  const nextCounter = current.counter + 1;

  if (nextCounter >= threshold) {
    saveChapterAdCounter({
      actorId,
      novelId,
      counter: 0,
      lastAdShownAt: Date.now(),
    });
    return true;
  }

  saveChapterAdCounter({
    ...current,
    counter: nextCounter,
  });
  return false;
}

function getNovelFeaturedImage(novel: ReaderNovel) {
  return resolveImageUrl(novel.featuredImage) ?? "/default-novel-cover.svg";
}

function getDiscoveryNovelImage(novel: DiscoveryNovel) {
  return (
    resolveImageUrl(
      novel.thumbnailUrl || novel.coverUrl || novel.featuredImage,
    ) ?? "/default-novel-cover.svg"
  );
}

const RATING_STARS = [1, 2, 3, 4, 5] as const;

function renderStarRow(value: number, className: string, label?: string) {
  const activeCount = Math.round(Math.max(0, Math.min(5, value)));

  return (
    <span className={className} aria-label={label}>
      {RATING_STARS.map((star) => (
        <Star
          key={star}
          className={star <= activeCount ? "is-active" : undefined}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function getAuthorName(novel: ReaderNovel) {
  return novel.author?.displayName?.trim() || "Đang cập nhật";
}

function getPrimaryCategory(novel: ReaderNovel) {
  return (
    novel.terms?.find((term) => term.taxonomy === "the_loai") ??
    novel.terms?.find((term) => term.taxonomy === "category") ??
    novel.terms?.[0] ??
    null
  );
}

function getNovelStatus(novel: ReaderNovel, locale: "vi" | "en") {
  const statusTerm =
    novel.terms?.find((term) => term.taxonomy === "trang_thai") ??
    novel.terms?.find((term) => term.taxonomy === "status");
  if (statusTerm?.name) {
    return statusTerm.name;
  }

  return locale === "vi" ? "Đang tiến hành" : "Ongoing";
}

function formatShortDate(value: string | undefined, locale: "vi" | "en") {
  if (!value) {
    return locale === "vi" ? "Chưa rõ" : "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return locale === "vi" ? "Chưa rõ" : "Unknown";
  }

  return parsed.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US");
}

function formatRelativeTime(value: string, locale: "vi" | "en") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return locale === "vi" ? "Vừa xong" : "Just now";
  }

  const diffMs = Date.now() - parsed.getTime();
  const days = Math.max(0, Math.floor(diffMs / 86_400_000));

  if (days === 0) {
    return locale === "vi" ? "Hôm nay" : "Today";
  }

  if (days < 7) {
    return locale === "vi" ? `${days} ngày trước` : `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return locale === "vi" ? `${weeks} tuần trước` : `${weeks} weeks ago`;
  }

  return formatShortDate(value, locale);
}

function getDisplayChapterNumber(chapter: ReaderChapter, index: number) {
  const chapterNumber = Number(chapter.chapterNumber);
  return Number.isFinite(chapterNumber) && chapterNumber > 0
    ? chapterNumber
    : index + 1;
}

function normalizeChapterTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getChapterNumberFromTitle(title: string | null | undefined) {
  if (!title) {
    return null;
  }

  const normalized = normalizeChapterTitle(title);
  const match = normalized.match(
    /\b(?:chuong|chapter)\s*[:#.-]?\s*(\d+(?:[.,]\d+)?)/,
  );
  if (!match?.[1]) {
    return null;
  }

  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function hasChapterNumberTitle(title: string | null | undefined) {
  return getChapterNumberFromTitle(title) !== null;
}

function sortReaderChapters(chapters: ReaderChapter[]) {
  return [...chapters].sort((a, b) => {
    const titleNumberA = getChapterNumberFromTitle(a.title);
    const titleNumberB = getChapterNumberFromTitle(b.title);

    if (
      titleNumberA !== null &&
      titleNumberB !== null &&
      titleNumberA !== titleNumberB
    ) {
      return titleNumberA - titleNumberB;
    }

    if (titleNumberA !== null && titleNumberB === null) {
      return -1;
    }

    if (titleNumberA === null && titleNumberB !== null) {
      return 1;
    }

    const chapterNumberA = Number(a.chapterNumber);
    const chapterNumberB = Number(b.chapterNumber);
    const safeChapterNumberA =
      Number.isFinite(chapterNumberA) && chapterNumberA > 0
        ? chapterNumberA
        : Number.MAX_SAFE_INTEGER;
    const safeChapterNumberB =
      Number.isFinite(chapterNumberB) && chapterNumberB > 0
        ? chapterNumberB
        : Number.MAX_SAFE_INTEGER;

    if (safeChapterNumberA !== safeChapterNumberB) {
      return safeChapterNumberA - safeChapterNumberB;
    }

    return a.id - b.id;
  });
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isLegacyChapterIdTitle(
  title: string,
  chapterId: number | null | undefined,
) {
  return Boolean(chapterId && normalizeDigits(title) === String(chapterId));
}

function getHistoryChapterDisplayNumber(
  entry: ReadingHistoryEntry,
  chapters: ReaderChapter[],
) {
  const historyChapterNumber = Number(entry.chapter?.chapterNumber);
  if (Number.isFinite(historyChapterNumber) && historyChapterNumber > 0) {
    return historyChapterNumber;
  }

  const chapterIndex = chapters.findIndex(
    (item) => item.id === entry.chapterId,
  );
  if (chapterIndex >= 0) {
    const chapter = chapters[chapterIndex];
    return chapter ? getDisplayChapterNumber(chapter, chapterIndex) : null;
  }

  return null;
}

function getHistoryChapterTitle(
  entry: ReadingHistoryEntry,
  chapters: ReaderChapter[],
) {
  const historyTitle = entry.chapter?.title?.trim();
  if (historyTitle && !isLegacyChapterIdTitle(historyTitle, entry.chapterId)) {
    return historyTitle;
  }

  const matchedChapter = chapters.find((item) => item.id === entry.chapterId);
  const matchedTitle = matchedChapter?.title?.trim();
  if (matchedTitle && !isLegacyChapterIdTitle(matchedTitle, entry.chapterId)) {
    return matchedTitle;
  }

  return null;
}

function getHistoryResumeLabel(
  entry: ReadingHistoryEntry,
  chapters: ReaderChapter[],
  locale: "vi" | "en",
  resumeChapterLabel: string,
) {
  const displayNumber = getHistoryChapterDisplayNumber(entry, chapters);
  const title = getHistoryChapterTitle(entry, chapters);
  const continueLabel = locale === "vi" ? "Tiếp tục" : "Continue";

  if (displayNumber !== null) {
    const numberLabel = formatAppNumber(displayNumber, locale);
    const chapterPrefix = locale === "vi" ? "chương " : "chapter ";
    const normalizedNumberLabel = normalizeDigits(numberLabel);
    const normalizedTitle = title?.toLowerCase() ?? "";
    if (
      title &&
      normalizedTitle.startsWith(chapterPrefix + numberLabel.toLowerCase())
    ) {
      return `${continueLabel} ${title}`;
    }

    const redundantTitle =
      title &&
      (normalizeDigits(title) === normalizedNumberLabel ||
        normalizedTitle === chapterPrefix + numberLabel.toLowerCase());

    return redundantTitle || !title
      ? `${resumeChapterLabel} ${numberLabel}`
      : `${resumeChapterLabel} ${numberLabel}: ${title}`;
  }

  if (title) {
    return `${continueLabel} ${title}`;
  }

  return resumeChapterLabel;
}

type ChapterAccessMeta = {
  displayNumber: number;
  isLocked: boolean;
  effectivePrice: number;
  priceSource: string;
};

function fallbackToDefaultCover(event: { currentTarget: HTMLImageElement }) {
  if (!event.currentTarget.src.endsWith("/default-novel-cover.svg")) {
    event.currentTarget.src = "/default-novel-cover.svg";
  }
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
        ratingSummaryLabel: "Điểm đánh giá",
        noRatingsYet: "Chưa có đánh giá",
        ratingCountLabel: "lượt đánh giá",
        authorLabel: "Tác giả",
        chaptersLabel: "Số chương",
        chapterUnit: "chương",
        chapterListTitle: "Danh sách chương",
        chapterListEmpty: "Truyện chưa có chương nào.",
        loadingChapterList: "Đang tải danh sách chương...",
        vipChapterAccess: "VIP",
        lockedChapterAccess: "Khóa",
        statusLabel: "Trạng thái",
        viewsMetricLabel: "Lượt xem",
        updatedLabel: "Cập nhật",
        genreLabel: "Thể loại",
        introTitle: "Giới thiệu truyện:",
        sameCategoryTitle: "Truyện cùng thể loại",
        relatedTitle: "Truyện gợi ý",
        noRelatedNovels: "Chưa có truyện gợi ý.",
        commentsReviewsTitle: "Bình Luận & Đánh Giá",
        reviewTab: "Đánh giá",
        commentTab: "Bình luận",
        scoreLabel: "Chấm điểm:",
        scoreOnlyLabel: "Chỉ chấm điểm",
        characterPlaceholder: "Nhân vật...",
        plotPlaceholder: "Cốt truyện...",
        minReviewPlaceholder: "Nội dung đánh giá (tối thiểu 50 ký tự)",
        reviewTooShort:
          "Nội dung đánh giá cần tối thiểu 50 ký tự hoặc chọn chỉ chấm điểm.",
        reviewListTitle: "Danh sách đánh giá",
        noReviewList: "Chưa có đánh giá nào cho truyện này.",
        detailLabel: "Chi tiết",
        characterLabel: "Nhân vật",
        plotLabel: "Cốt truyện",
        rateThisNovel: "Đánh giá truyện",
        selectRating: "Chọn số sao",
        yourRating: "Đánh giá của bạn",
        reviewPlaceholder: "Chia sẻ cảm nhận của bạn về truyện này",
        submitReview: "Gửi đánh giá",
        updatingReview: "Đang lưu...",
        signInToReview: "Đăng nhập để đánh giá truyện.",
        reviewSaved: "Đã lưu đánh giá.",
        chapterIdLabel: "Mã chương",
        chapterIdPlaceholder: "Nhập mã chương",
        startReading: "Bắt đầu đọc",
        noReadableChapter: "Chưa có chương để đọc",
        enterValidChapter: "Nhập chương hợp lệ",
        bookmarkNovel: "Theo dõi",
        bookmarkedNovel: "Đã theo dõi",
        bookmarking: "Đang lưu...",
        removingBookmark: "Đang bỏ lưu...",
        bookmarkSaved: "Đã theo dõi truyện.",
        bookmarkRemoved: "Đã bỏ theo dõi truyện.",
        signInToBookmark: "Đăng nhập để theo dõi truyện.",
        recommendLabel: "Đề cử",
        recommendVotesSuffix: "phiếu",
        recommendOneVote: "1 phiếu",
        recommendAllVotes: "Tất cả phiếu còn lại",
        recommendationSent: "Đã đề cử truyện.",
        recommendationNeedLogin: "Đăng nhập để đề cử truyện.",
        recommendationUsedUp: "Bạn đã dùng hết 5 phiếu đề cử hôm nay.",
        unlockAllLabel: "Mở khóa toàn bộ",
        unlockAllOwnedLabel: "Đã mở khóa toàn bộ",
        unlockAllDialogTitle: "Mở khóa trọn bộ",
        unlockAllDialogBody:
          "Hệ thống sẽ tính tổng tiền combo cho các chương còn khóa và tự trừ Kim Tệ trước, điểm thưởng sau.",
        unlockAllLoginRequired:
          "Đăng nhập để xem giá combo và mở khóa theo tài khoản của bạn.",
        unlockAllLoginAction: "Đăng nhập để mở khóa",
        unlockAllLockedListTitle: "Chương cần mở",
        unlockAllUnlockedListTitle: "Chương đã mở",
        unlockAllEmptyLocked: "Không còn chương nào cần mở khóa.",
        unlockAllEmptyUnlocked: "Chưa có chương nào được mở khóa.",
        unlockAllPurchaseAction: "Mua combo mở khóa",
        unlockAllProcessing: "Đang mở khóa...",
        unlockAllPurchaseSuccess:
          "Mua combo thành công. Tất cả chương còn khóa đã được mở.",
        unlockAllAlreadyOwned:
          "Tài khoản của bạn đã mở hết các chương bị khóa.",
        unlockAllSummaryTitle: "Tóm tắt thanh toán",
        unlockAllComboPriceLabel: "Tổng tiền combo",
        unlockAllOriginalPriceLabel: "Giá trước giảm",
        kimTeBalanceLabel: "Kim Tệ hiện có",
        rewardPointBalanceLabel: "Điểm thưởng hiện có",
        totalAvailableLabel: "Tổng khả dụng",
        topUpWallet: "Nạp ví",
        discountSuffix: "giảm",
        unlockAllAffordHint: "Bạn đủ số dư để mở khóa ngay.",
        unlockAllInsufficientHint:
          "Kim Tệ và điểm thưởng hiện tại chưa đủ cho combo này.",
        unlockAllOpenMissions: "Làm nhiệm vụ",
        unlockAllAutoSpendHint:
          "Hệ thống tự trừ Kim Tệ trước, sau đó mới dùng điểm thưởng nếu còn thiếu.",
        viewPurchaseActivity: "Xem hoạt động mua",
        backToDiscovery: "Quay lại khám phá",
        recentReadingHistory: "Lịch sử đọc gần đây",
        signInAndOpenChapters: "Đăng nhập và mở chương để lưu lịch sử đọc.",
        resumeChapter: "Tiếp tục chương",
        discussionTitle: "Thảo luận truyện",
        discussionEmpty:
          "Chưa có bình luận. Hãy bắt đầu cuộc thảo luận về truyện này.",
      }
    : {
        loadingNovelDetails: "Loading novel details...",
        novelNotFound: "Novel not found",
        readerExperience: "Reader experience",
        novelLabel: "Novel",
        viewsLabel: "views",
        noSummaryAvailableYet: "No summary available yet.",
        ratingSummaryLabel: "Average rating",
        noRatingsYet: "No ratings yet",
        ratingCountLabel: "ratings",
        authorLabel: "Author",
        chaptersLabel: "Chapters",
        chapterUnit: "chapters",
        chapterListTitle: "Chapter list",
        chapterListEmpty: "This novel has no chapters yet.",
        loadingChapterList: "Loading chapter list...",
        vipChapterAccess: "VIP",
        lockedChapterAccess: "Locked",
        statusLabel: "Status",
        viewsMetricLabel: "Views",
        updatedLabel: "Updated",
        genreLabel: "Genres",
        introTitle: "Story introduction:",
        sameCategoryTitle: "Similar novels",
        relatedTitle: "Recommended novels",
        noRelatedNovels: "No recommendations yet.",
        commentsReviewsTitle: "Comments & Reviews",
        reviewTab: "Reviews",
        commentTab: "Comments",
        scoreLabel: "Rating:",
        scoreOnlyLabel: "Score only",
        characterPlaceholder: "Characters...",
        plotPlaceholder: "Plot...",
        minReviewPlaceholder: "Review content (minimum 50 characters)",
        reviewTooShort:
          "Review content needs at least 50 characters or select score only.",
        reviewListTitle: "Review list",
        noReviewList: "No reviews for this novel yet.",
        detailLabel: "Details",
        characterLabel: "Characters",
        plotLabel: "Plot",
        rateThisNovel: "Rate this novel",
        selectRating: "Select star rating",
        yourRating: "Your rating",
        reviewPlaceholder: "Share your thoughts about this novel",
        submitReview: "Submit review",
        updatingReview: "Saving...",
        signInToReview: "Sign in to rate this novel.",
        reviewSaved: "Review saved.",
        chapterIdLabel: "Chapter ID",
        chapterIdPlaceholder: "Enter chapter id",
        startReading: "Start reading",
        noReadableChapter: "No readable chapter yet",
        enterValidChapter: "Enter valid chapter",
        bookmarkNovel: "Follow",
        bookmarkedNovel: "Following",
        bookmarking: "Saving...",
        removingBookmark: "Removing...",
        bookmarkSaved: "Novel followed.",
        bookmarkRemoved: "Novel unfollowed.",
        signInToBookmark: "Sign in to follow this novel.",
        recommendLabel: "Recommend",
        recommendVotesSuffix: "votes",
        recommendOneVote: "1 vote",
        recommendAllVotes: "All remaining votes",
        recommendationSent: "Recommendation sent.",
        recommendationNeedLogin: "Sign in to recommend this novel.",
        recommendationUsedUp: "You used all 5 recommendation votes today.",
        unlockAllLabel: "Unlock all",
        unlockAllOwnedLabel: "All unlocked",
        unlockAllDialogTitle: "Unlock full combo",
        unlockAllDialogBody:
          "The combo total is calculated from the remaining locked chapters. Kim Te is spent first, then reward points if needed.",
        unlockAllLoginRequired:
          "Sign in to view combo pricing and unlock chapters for your account.",
        unlockAllLoginAction: "Sign in to unlock",
        unlockAllLockedListTitle: "Still locked",
        unlockAllUnlockedListTitle: "Already unlocked",
        unlockAllEmptyLocked: "There are no locked chapters left to unlock.",
        unlockAllEmptyUnlocked: "No chapters are unlocked yet.",
        unlockAllPurchaseAction: "Purchase combo unlock",
        unlockAllProcessing: "Unlocking...",
        unlockAllPurchaseSuccess:
          "Combo purchase successful. All remaining locked chapters are now unlocked.",
        unlockAllAlreadyOwned:
          "Your account already has access to all locked chapters.",
        unlockAllSummaryTitle: "Payment summary",
        unlockAllComboPriceLabel: "Combo total",
        unlockAllOriginalPriceLabel: "Original total",
        kimTeBalanceLabel: "Current Kim Te",
        rewardPointBalanceLabel: "Reward points",
        totalAvailableLabel: "Total available",
        topUpWallet: "Top up wallet",
        discountSuffix: "off",
        unlockAllAffordHint: "You have enough balance to unlock now.",
        unlockAllInsufficientHint:
          "Current Kim Te and reward points are not enough for this combo.",
        unlockAllOpenMissions: "Open missions",
        unlockAllAutoSpendHint:
          "Kim Te is spent first, then reward points are used for any remaining amount.",
        viewPurchaseActivity: "View purchase activity",
        backToDiscovery: "Back to discovery",
        recentReadingHistory: "Recent reading history",
        signInAndOpenChapters:
          "Sign in and open chapters to build resume history.",
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
          "Mua chương này để mở khóa nội dung. Hệ thống sẽ ưu tiên trừ Kim Tệ trước, sau đó dùng điểm thưởng nếu còn thiếu.",
        priceLabel: "Giá",
        comboLabel: "Combo",
        discountSuffix: "giảm",
        processing: "Đang xử lý...",
        purchaseChapter: "Mua chương",
        purchaseCombo: "Mua combo",
        topUpWallet: "Nạp ví",
        walletBalanceLabel: "Kim Tệ hiện có",
        rewardPointBalanceLabel: "Điểm thưởng hiện có",
        totalAvailableLabel: "Tổng khả dụng",
        purchaseBalanceHint:
          "Hệ thống tự trừ Kim Tệ trước, sau đó mới dùng điểm thưởng nếu còn thiếu.",
        noChapterContent: "Chưa có nội dung chương.",
        tableOfContents: "Mục lục",
        loadingChapterList: "Đang tải danh sách chương...",
        previousChapter: "Chương trước",
        firstChapter: "Chương đầu",
        backToNovel: "Quay lại truyện",
        nextChapterLocked: "Chương tiếp theo đang khóa",
        nextChapter: "Chương tiếp theo",
        lastChapter: "Chương cuối",
        sponsoredGateTitle: "Xem nội dung tài trợ để tiếp tục",
        sponsoredGateBody:
          "Nội dung tài trợ sẽ mở trong cửa sổ mới. Sau vài giây bạn có thể đọc chương tiếp theo.",
        sponsoredGateOpen: "Tiếp tục",
        sponsoredGateContinue: "Đọc chương tiếp theo",
        sponsoredGateWait: "Đọc tiếp sau",
        sponsoredContentUnavailable:
          "Nội dung tài trợ chưa được cấu hình, chuyển sang chương tiếp theo.",
        readingProgress: "Tiến độ đọc",
        progressSavedForAuthenticatedReaders:
          "Tiến độ được lưu cho người đọc đã xác thực qua /reader/me/reading-history.",
        signInToPersistReadingHistory: "Đăng nhập để lưu lịch sử đọc.",
        purchaseThisChapterBeforeSavingProgress:
          "Mua chương này trước khi lưu tiến độ.",
        progressSaved: "Đã lưu tiến độ.",
        signInBeforePurchasingComboAccess:
          "Đăng nhập trước khi mua quyền truy cập combo.",
        signInBeforePurchasingChapter: "Đăng nhập trước khi mua chương.",
        chapterDetailsUnavailable: "Chi tiết chương hiện không khả dụng.",
        confirmComboPurchase: "Xác nhận mua combo cho truyện #",
        confirmChapterPurchase: "Xác nhận mua chương #",
        insufficientDepositedBalance: "Kim Tệ và điểm thưởng hiện tại chưa đủ.",
        topUpWalletAndTryAgain: "Hãy nạp ví hoặc làm nhiệm vụ rồi thử lại.",
        comboPurchaseSuccessful:
          "Mua combo thành công. Đã mở khóa các chương bị khóa.",
        allLockedChaptersAlreadyUnlocked:
          "Tất cả chương bị khóa đã được mở khóa cho tài khoản của bạn.",
        chapterAlreadyUnlockedForYourAccount:
          "Chương đã được mở khóa sẵn cho tài khoản của bạn.",
        chapterUnlockedImmediately:
          "Mua thành công. Chương được mở khóa ngay lập tức.",
        unableToVerifyLatestProgressAcrossDevices:
          "Không thể xác minh tiến độ mới nhất giữa các thiết bị.",
        serverKeptNewerCheckpointFromAnotherSession:
          "Máy chủ giữ lại mốc mới hơn từ một phiên khác.",
        progressSynchronizedAcrossDevices:
          "Đã đồng bộ tiến độ giữa các thiết bị.",
        historyChapterLabel: "Chương",
        noRepliesTitle: "Thảo luận chương",
        noRepliesHint:
          "Chưa có phản hồi. Hãy là người đầu tiên thảo luận chương này.",
        likeChapter: "Thả tim",
        likedChapter: "Đã thả tim",
        signInToLikeChapter: "Đăng nhập để thả tim chương.",
        chapterLikeSaved: "Đã thả tim chương.",
        chapterLikeRewarded: "Đã thả tim chương và nhận điểm thưởng nhiệm vụ.",
        chapterAlreadyLiked: "Bạn đã thả tim chương này.",
        tools: "Công cụ đọc",
        typographySettings: "Tùy chỉnh chữ",
        close: "Đóng",
        openReadingTools: "Mở công cụ đọc",
        closeReadingTools: "Đóng công cụ đọc",
        openTypographySettings: "Mở tùy chỉnh chữ",
        openChapterMenu: "Mở mục lục chương",
        readAloud: "Đọc truyện",
        readAloudSoon: "Sắp có chức năng đọc truyện.",
        activeChapter: "Đang đọc",
        currentChapter: "Chương hiện tại",
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
          "Purchase this chapter to unlock the content. Kim Te is spent first, then reward points if needed.",
        priceLabel: "Price",
        comboLabel: "Combo",
        discountSuffix: "off",
        processing: "Processing...",
        purchaseChapter: "Purchase chapter",
        purchaseCombo: "Purchase combo",
        topUpWallet: "Top up wallet",
        walletBalanceLabel: "Current Kim Te",
        rewardPointBalanceLabel: "Reward points",
        totalAvailableLabel: "Total available",
        purchaseBalanceHint:
          "Kim Te is spent first, then reward points are used for any remaining amount.",
        noChapterContent: "No chapter content.",
        tableOfContents: "Table of contents",
        loadingChapterList: "Loading chapter list...",
        previousChapter: "Previous chapter",
        firstChapter: "First chapter",
        backToNovel: "Back to novel",
        nextChapterLocked: "Next chapter locked",
        nextChapter: "Next chapter",
        lastChapter: "Last chapter",
        sponsoredGateTitle: "View sponsored content to continue",
        sponsoredGateBody:
          "Sponsored content opens in a new window. The next chapter button will unlock after a few seconds.",
        sponsoredGateOpen: "Continue",
        sponsoredGateContinue: "Read next chapter",
        sponsoredGateWait: "Continue in",
        sponsoredContentUnavailable:
          "Sponsored content is not configured, opening the next chapter.",
        readingProgress: "Reading progress",
        progressSavedForAuthenticatedReaders:
          "Progress is saved for authenticated readers via /reader/me/reading-history.",
        signInToPersistReadingHistory: "Sign in to persist reading history.",
        purchaseThisChapterBeforeSavingProgress:
          "Purchase this chapter before saving progress.",
        progressSaved: "Progress saved.",
        signInBeforePurchasingComboAccess:
          "Sign in before purchasing combo access.",
        signInBeforePurchasingChapter:
          "Sign in before purchasing chapter access.",
        chapterDetailsUnavailable: "Chapter details are unavailable.",
        confirmComboPurchase: "Confirm combo purchase for novel #",
        confirmChapterPurchase: "Confirm purchase for chapter #",
        insufficientDepositedBalance:
          "Current Kim Te and reward points are not enough.",
        topUpWalletAndTryAgain:
          "Top up your wallet or earn more points, then try again.",
        comboPurchaseSuccessful:
          "Combo purchase successful. Locked chapters unlocked.",
        allLockedChaptersAlreadyUnlocked:
          "All locked chapters are already unlocked for your account.",
        chapterAlreadyUnlockedForYourAccount:
          "Chapter is already unlocked for your account.",
        chapterUnlockedImmediately:
          "Purchase successful. Chapter unlocked immediately.",
        unableToVerifyLatestProgressAcrossDevices:
          "Unable to verify latest progress across devices.",
        serverKeptNewerCheckpointFromAnotherSession:
          "Server kept a newer checkpoint from another session.",
        progressSynchronizedAcrossDevices:
          "Progress synchronized across devices.",
        historyChapterLabel: "Chapter",
        noRepliesTitle: "Chapter discussion",
        noRepliesHint: "No replies yet. Be the first to discuss this chapter.",
        likeChapter: "Like",
        likedChapter: "Liked",
        signInToLikeChapter: "Sign in to like this chapter.",
        chapterLikeSaved: "Chapter liked.",
        chapterLikeRewarded: "Chapter liked and mission reward points granted.",
        chapterAlreadyLiked: "You already liked this chapter.",
        tools: "Reading tools",
        typographySettings: "Typography",
        close: "Close",
        openReadingTools: "Open reading tools",
        closeReadingTools: "Close reading tools",
        openTypographySettings: "Open typography settings",
        openChapterMenu: "Open chapter menu",
        readAloud: "Read aloud",
        readAloudSoon: "Read aloud is ready for the next integration.",
        activeChapter: "Reading",
        currentChapter: "Current chapter",
      };
}

export function NovelDetailView({ novelId }: { novelId: number }) {
  const { locale, user } = useContext(AppContext);
  const copy = getNovelCopy(locale);
  const [novel, setNovel] = useState<ReaderNovel | null>(null);
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkId, setBookmarkId] = useState<number | null>(null);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [bookmarkMessage, setBookmarkMessage] = useState<string | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [recommendationStatus, setRecommendationStatus] =
    useState<NovelRecommendationStatus | null>(null);
  const [recommendationVotes, setRecommendationVotes] = useState(1);
  const [recommendationBusy, setRecommendationBusy] = useState(false);
  const [recommendationMessage, setRecommendationMessage] = useState<
    string | null
  >(null);
  const [reviewSummary, setReviewSummary] = useState<NovelReviewSummary | null>(
    null,
  );
  const [reviewList, setReviewList] = useState<NovelReviewListResponse | null>(
    null,
  );
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewCharacter, setReviewCharacter] = useState("");
  const [reviewPlot, setReviewPlot] = useState("");
  const [reviewScoreOnly, setReviewScoreOnly] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [activeSocialTab, setActiveSocialTab] = useState<
    "reviews" | "comments"
  >("reviews");
  const [relatedNovels, setRelatedNovels] = useState<DiscoveryNovel[]>([]);
  const [firstChapterId, setFirstChapterId] = useState<number | null>(null);
  const [chapters, setChapters] = useState<ReaderChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [novelChapterAccessMeta, setNovelChapterAccessMeta] = useState<
    Record<number, ChapterAccessMeta>
  >({});
  const [novelVipAccessMode, setNovelVipAccessMode] = useState(false);
  const [comboPrice, setComboPrice] = useState<number | null>(null);
  const [comboOriginalPrice, setComboOriginalPrice] = useState<number | null>(
    null,
  );
  const [comboDiscountPct, setComboDiscountPct] = useState<number | null>(null);
  const [comboLockedChapterCount, setComboLockedChapterCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [comboPurchaseBusy, setComboPurchaseBusy] = useState(false);
  const [comboPurchaseMessage, setComboPurchaseMessage] = useState<
    string | null
  >(null);
  const [adSettings, setAdSettings] = useState<PublicAdSettings>(
    DEFAULT_PUBLIC_AD_SETTINGS,
  );
  const orderedChapters = useMemo(
    () => sortReaderChapters(chapters),
    [chapters],
  );

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const result = await fetchPublicAdSettings(controller.signal);
      if (controller.signal.aborted || !result.ok) {
        return;
      }

      setAdSettings(result.data);
    })();

    return () => controller.abort();
  }, []);

  function applyNovelPricing(pricing: NovelPricingResponse) {
    const nextMeta: Record<number, ChapterAccessMeta> = {};
    pricing.chapters.forEach((item) => {
      nextMeta[item.id] = {
        displayNumber: item.chapterNumber,
        isLocked: item.isLocked,
        effectivePrice: item.effectivePrice,
        priceSource: item.priceSource,
      };
    });

    setNovelChapterAccessMeta(nextMeta);
    setNovelVipAccessMode(
      pricing.chapters.length > 0 &&
        pricing.chapters.every(
          (item) => item.priceSource === "vip_subscription",
        ),
    );
    setComboPrice(pricing.combo.discountedTotalPrice);
    setComboOriginalPrice(pricing.combo.originalTotalPrice);
    setComboDiscountPct(pricing.settings.comboDiscountPct);
    setComboLockedChapterCount(pricing.combo.lockedChapterCount);
    setWalletBalance(pricing.buyer?.depositedBalance ?? null);
    setPointBalance(pricing.buyer?.pointBalance ?? null);
  }

  useEffect(() => {
    const token = getSessionToken() ?? undefined;

    setLoading(true);
    setError(null);
    setBookmarkId(null);
    setBookmarkMessage(null);
    setBookmarkBusy(false);
    setBookmarkCount(0);
    setRecommendationStatus(null);
    setRecommendationVotes(1);
    setRecommendationBusy(false);
    setRecommendationMessage(null);
    setReviewSummary(null);
    setReviewList(null);
    setReviewRating(5);
    setReviewContent("");
    setReviewCharacter("");
    setReviewPlot("");
    setReviewScoreOnly(false);
    setReviewMessage(null);
    setReviewBusy(false);
    setRelatedNovels([]);
    setFirstChapterId(null);
    setChapters([]);
    setChaptersLoading(true);
    setNovelChapterAccessMeta({});
    setNovelVipAccessMode(false);
    setComboPrice(null);
    setComboOriginalPrice(null);
    setComboDiscountPct(null);
    setComboLockedChapterCount(0);
    setWalletBalance(null);
    setPointBalance(null);
    setComboDialogOpen(false);
    setComboPurchaseBusy(false);
    setComboPurchaseMessage(null);

    void (async () => {
      const novelResult = await fetchNovelById(novelId);
      if (!novelResult.ok || !novelResult.data) {
        setError(
          novelResult.ok
            ? copy.novelNotFound
            : String(novelResult.error.message),
        );
        setChaptersLoading(false);
        setLoading(false);
        return;
      }

      setNovel(novelResult.data);
      setBookmarkCount(Number(novelResult.data.bookmarkCount ?? 0));

      const firstChapterResult = await fetchFirstChapterByNovelId(novelId);
      if (firstChapterResult.ok) {
        setFirstChapterId(firstChapterResult.data.chapterId);
      }

      const chaptersResult = await fetchChaptersByNovelId(novelId);
      if (chaptersResult.ok) {
        setChapters(chaptersResult.data);
      }

      if (token) {
        const pricingResult = await fetchReaderNovelPricing(novelId, token);
        if (pricingResult.ok) {
          applyNovelPricing(pricingResult.data);
        }
      }
      setChaptersLoading(false);

      const reviewResult = await fetchNovelReviewSummary(novelId, token);
      if (reviewResult.ok) {
        setReviewSummary(reviewResult.data);
        setReviewRating(reviewResult.data.viewerReview?.rating ?? 5);
        setReviewContent(reviewResult.data.viewerReview?.content ?? "");
      }

      const reviewListResult = await fetchNovelReviews(novelId, 1, 10);
      if (reviewListResult.ok) {
        setReviewList(reviewListResult.data);
      }

      const primaryCategory = getPrimaryCategory(novelResult.data);
      const relatedResult = await fetchDiscoveryNovels({
        category: primaryCategory?.slug,
        limit: 7,
        page: 1,
        sortBy: "updatedAt",
        sortDir: "desc",
      });
      if (relatedResult.ok) {
        setRelatedNovels(
          relatedResult.data.items
            .filter((item) => item.id !== novelId)
            .slice(0, 6),
        );
      }

      if (token) {
        const recommendationResult = await fetchNovelRecommendationStatus(
          novelId,
          token,
        );
        if (recommendationResult.ok) {
          setRecommendationStatus(recommendationResult.data);
          setRecommendationVotes(
            Math.max(
              1,
              Math.min(5, recommendationResult.data.remainingVotes || 1),
            ),
          );
        }

        const historyResult = await fetchReadingHistory(token, novelId);
        if (historyResult.ok) {
          setHistory(historyResult.data);
        }

        const bookmarkResult = await fetchBookmarkEntries(token);
        if (bookmarkResult.ok) {
          const existingBookmark = bookmarkResult.data.find(
            (item) => item.novelId === novelId && item.chapterId === null,
          );
          setBookmarkId(existingBookmark?.id ?? null);
        }
      }

      setLoading(false);
    })();
  }, [copy.novelNotFound, novelId]);

  const isBookmarked = bookmarkId !== null;
  const averageRating = reviewSummary?.averageRating ?? 0;
  const ratingCount = reviewSummary?.ratingCount ?? 0;
  const primaryCategory = novel ? getPrimaryCategory(novel) : null;
  const displayTerms =
    novel?.terms
      ?.filter(
        (term) => term.taxonomy !== "status" && term.taxonomy !== "trang_thai",
      )
      .slice(0, 8) ?? [];
  const reviewItems = reviewList?.items ?? [];
  const remainingRecommendationVotes =
    recommendationStatus?.remainingVotes ?? 5;
  const recommendationOptions = Array.from(
    { length: Math.max(1, remainingRecommendationVotes) },
    (_, index) => index + 1,
  ).slice(0, 5);
  const chapterRows = useMemo(
    () =>
      orderedChapters.map((chapter, index) => {
        const accessMeta = getNovelChapterAccessMeta(chapter, index);
        return {
          chapter,
          accessMeta,
          chapterNumber: accessMeta.displayNumber,
          isVipChapter:
            novelVipAccessMode || accessMeta.priceSource === "vip_subscription",
          titleIncludesChapterNumber: hasChapterNumberTitle(chapter.title),
        };
      }),
    [orderedChapters, novelChapterAccessMeta, novelVipAccessMode, novel],
  );
  const lockedChapterRows = chapterRows.filter(
    (item) => !item.isVipChapter && item.accessMeta.isLocked,
  );
  const unlockedChapterRows = chapterRows.filter(
    (item) => item.isVipChapter || !item.accessMeta.isLocked,
  );
  const totalPurchaseBalance = (walletBalance ?? 0) + (pointBalance ?? 0);
  const comboPriceKnown = comboPrice !== null;
  const comboHasLockedChapters =
    comboPriceKnown || comboLockedChapterCount > 0
      ? comboLockedChapterCount > 0
      : lockedChapterRows.length > 0;
  const comboAffordable =
    comboPrice !== null ? totalPurchaseBalance >= comboPrice : false;

  function getNovelChapterAccessMeta(
    chapter: ReaderChapter,
    index: number,
  ): ChapterAccessMeta {
    const pricingMeta = novelChapterAccessMeta[chapter.id];
    if (pricingMeta) {
      return pricingMeta;
    }

    const displayNumber = getDisplayChapterNumber(chapter, index);
    const freeChapterCount = Number(novel?.freeChapterCount ?? 0);
    const defaultPrice = Number(novel?.defaultChapterPrice ?? 0);

    return {
      displayNumber,
      isLocked:
        Number.isFinite(freeChapterCount) &&
        freeChapterCount >= 0 &&
        displayNumber > freeChapterCount,
      effectivePrice: Number.isFinite(defaultPrice) ? defaultPrice : 0,
      priceSource: "novel_default",
    };
  }

  async function onToggleBookmark() {
    const token = getSessionToken() ?? undefined;
    if (!token) {
      setBookmarkMessage(copy.signInToBookmark);
      return;
    }

    setBookmarkBusy(true);
    setBookmarkMessage(null);

    if (bookmarkId) {
      const result = await removeBookmark(bookmarkId, token);
      setBookmarkBusy(false);

      if (!result.ok) {
        setBookmarkMessage(result.error.message);
        return;
      }

      setBookmarkId(null);
      setBookmarkCount((current) => Math.max(0, current - 1));
      setBookmarkMessage(copy.bookmarkRemoved);
      return;
    }

    const result = await addBookmark({ novelId }, token);
    setBookmarkBusy(false);

    if (!result.ok) {
      setBookmarkMessage(result.error.message);
      return;
    }

    setBookmarkId(result.data.id);
    setBookmarkCount((current) => current + 1);
    setBookmarkMessage(copy.bookmarkSaved);
  }

  async function onRecommendNovel() {
    const token = getSessionToken() ?? undefined;
    if (!token || !user) {
      setRecommendationMessage(copy.recommendationNeedLogin);
      return;
    }

    if (remainingRecommendationVotes <= 0) {
      setRecommendationMessage(copy.recommendationUsedUp);
      return;
    }

    const votes = Math.max(
      1,
      Math.min(recommendationVotes, remainingRecommendationVotes),
    );
    setRecommendationBusy(true);
    setRecommendationMessage(null);

    const result = await recommendNovel(novelId, votes, token);
    setRecommendationBusy(false);

    if (!result.ok) {
      setRecommendationMessage(result.error.message);
      return;
    }

    setRecommendationStatus(result.data);
    setRecommendationVotes(
      Math.max(1, Math.min(5, result.data.remainingVotes || 1)),
    );
    setRecommendationMessage(copy.recommendationSent);
  }

  function onOpenComboDialog() {
    setComboPurchaseMessage(null);
    setComboDialogOpen(true);
  }

  async function onPurchaseNovelCombo() {
    const token = getSessionToken() ?? undefined;
    if (!token) {
      setComboPurchaseMessage(copy.unlockAllLoginRequired);
      return;
    }

    if (!comboHasLockedChapters) {
      setComboPurchaseMessage(copy.unlockAllAlreadyOwned);
      return;
    }

    setComboPurchaseBusy(true);
    setComboPurchaseMessage(null);

    const result = await purchaseReaderNovelCombo(novelId, token);

    if (!result.ok) {
      setComboPurchaseBusy(false);
      setComboPurchaseMessage(result.error.message);
      return;
    }

    if (result.data.status === "insufficient_balance") {
      setComboPurchaseBusy(false);
      setComboPurchaseMessage(copy.unlockAllInsufficientHint);
      return;
    }

    const refreshedPricing = await fetchReaderNovelPricing(novelId, token);
    if (refreshedPricing.ok) {
      applyNovelPricing(refreshedPricing.data);
    }

    setComboPurchaseBusy(false);
    setComboPurchaseMessage(
      result.data.status === "already_owned" ||
        result.data.status === "no_locked_chapters"
        ? copy.unlockAllAlreadyOwned
        : copy.unlockAllPurchaseSuccess,
    );
  }

  async function submitReview(nextRating: number, scoreOnly: boolean) {
    const token = getSessionToken() ?? undefined;
    if (!token || !user) {
      setReviewMessage(copy.signInToReview);
      return;
    }

    if (
      !scoreOnly &&
      reviewContent.trim().length > 0 &&
      reviewContent.trim().length < 50
    ) {
      setReviewMessage(copy.reviewTooShort);
      return;
    }

    setReviewBusy(true);
    setReviewMessage(null);

    const contentSections = scoreOnly
      ? []
      : [
          reviewCharacter.trim()
            ? copy.characterLabel + ": " + reviewCharacter.trim()
            : null,
          reviewPlot.trim() ? copy.plotLabel + ": " + reviewPlot.trim() : null,
          reviewContent.trim()
            ? copy.detailLabel + ": " + reviewContent.trim()
            : null,
        ].filter(Boolean);

    const result = await submitNovelReview(
      novelId,
      {
        rating: nextRating,
        content: contentSections.join("\n"),
      },
      token,
    );

    setReviewBusy(false);

    if (!result.ok) {
      setReviewMessage(result.error.message);
      return;
    }

    setReviewSummary(result.data);
    setReviewRating(result.data.viewerReview?.rating ?? nextRating);
    const refreshedReviews = await fetchNovelReviews(
      novelId,
      reviewList?.page ?? 1,
      reviewList?.pageSize ?? 10,
    );
    if (refreshedReviews.ok) {
      setReviewList(refreshedReviews.data);
    }
    setReviewMessage(copy.reviewSaved);
  }

  async function onSubmitNovelReview() {
    await submitReview(reviewRating, reviewScoreOnly);
  }

  async function onSelectReviewRating(nextRating: number) {
    setReviewRating(nextRating);
    await submitReview(nextRating, true);
  }

  async function onReviewPageChange(nextPage: number) {
    if (nextPage <= 0 || nextPage > (reviewList?.totalPages ?? 1)) {
      return;
    }

    const result = await fetchNovelReviews(
      novelId,
      nextPage,
      reviewList?.pageSize ?? 10,
    );
    if (result.ok) {
      setReviewList(result.data);
    }
  }

  return (
    <main className="reader-shell">
      {loading ? (
        <p className="discovery-state">{copy.loadingNovelDetails}</p>
      ) : null}
      {error ? (
        <p className="discovery-state discovery-state--error">{error}</p>
      ) : null}

      {novel ? (
        <>
          <section className="novel-detail-shell">
            <div className="novel-detail-layout">
              <aside className="novel-detail-cover-panel">
                <div className="novel-detail-cover">
                  <img
                    src={getNovelFeaturedImage(novel)}
                    alt={novel.title}
                    loading="eager"
                    decoding="async"
                    onError={fallbackToDefaultCover}
                  />
                </div>
                <div className="novel-detail-cover-actions">
                  {firstChapterId ? (
                    <Link
                      className="novel-start-reading-action"
                      href={buildChapterHref(firstChapterId, novel.id)}
                    >
                      <BookOpen aria-hidden="true" />
                      {copy.startReading}
                    </Link>
                  ) : (
                    <button
                      className="novel-start-reading-action"
                      type="button"
                      disabled
                    >
                      <BookOpen aria-hidden="true" />
                      {copy.noReadableChapter}
                    </button>
                  )}
                  <button
                    className="novel-detail-primary-action"
                    type="button"
                    disabled={orderedChapters.length === 0}
                    onClick={onOpenComboDialog}
                  >
                    {/* <LockOpen aria-hidden="true" /> */}
                    {comboHasLockedChapters && comboPrice !== null
                      ? `${copy.unlockAllLabel}`
                      : comboLockedChapterCount === 0 && comboPriceKnown
                        ? copy.unlockAllOwnedLabel
                        : copy.unlockAllLabel}
                  </button>
                  <button
                    aria-pressed={isBookmarked}
                    className="novel-follow-action"
                    disabled={bookmarkBusy}
                    onClick={() => void onToggleBookmark()}
                    type="button"
                  >
                    <Bell aria-hidden="true" />
                    {isBookmarked ? copy.bookmarkedNovel : copy.bookmarkNovel}
                    {" "}
                    {/* {formatAppNumber(bookmarkCount, locale)} */}
                  </button>
                  <select
                    className="novel-recommend-select"
                    value={recommendationVotes}
                    disabled={
                      recommendationBusy || remainingRecommendationVotes <= 0
                    }
                    onChange={(event) =>
                      setRecommendationVotes(Number(event.target.value))
                    }
                    aria-label={copy.recommendLabel}
                  >
                    {remainingRecommendationVotes <= 0 ? (
                      <option value={1}>0 {copy.recommendVotesSuffix}</option>
                    ) : (
                      recommendationOptions.map((value) => (
                        <option key={value} value={value}>
                          {value === 1
                            ? copy.recommendOneVote
                            : value + " " + copy.recommendVotesSuffix}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    className="novel-recommend-action"
                    type="button"
                    disabled={
                      recommendationBusy || remainingRecommendationVotes <= 0
                    }
                    onClick={() => void onRecommendNovel()}
                  >
                    {copy.recommendLabel}
                  </button>
                </div>
                {comboPurchaseMessage ? (
                  <p className="novel-detail-inline-message">
                    {comboPurchaseMessage}
                  </p>
                ) : null}
                {bookmarkMessage ? (
                  <p className="novel-detail-inline-message">
                    {bookmarkMessage}
                  </p>
                ) : null}
                {recommendationMessage ? (
                  <p className="novel-detail-inline-message">
                    {recommendationMessage}
                  </p>
                ) : null}
              </aside>

              <article className="novel-detail-info">
                <h1>{novel.title}</h1>
                <div className="novel-detail-score-row">
                  {renderStarRow(
                    averageRating,
                    "novel-detail-stars",
                    copy.ratingSummaryLabel,
                  )}
                  <strong>({formatAppNumber(ratingCount, locale)})</strong>
                  <span>
                    {formatAppNumber(Number(novel.viewCount), locale)}{" "}
                    {copy.viewsLabel}
                  </span>
                </div>

                <dl className="novel-detail-metadata">
                  <div>
                    <dt>{copy.authorLabel}:</dt>
                    <dd>{getAuthorName(novel)}</dd>
                  </div>
                  <div>
                    <dt>{copy.chaptersLabel}:</dt>
                    <dd>
                      {formatAppNumber(Number(novel.chapterCount ?? 0), locale)}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.statusLabel}:</dt>
                    <dd>{getNovelStatus(novel, locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.updatedLabel}:</dt>
                    <dd>{formatShortDate(novel.updatedAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.genreLabel}:</dt>
                    <dd className="novel-detail-tags">
                      {displayTerms.length > 0
                        ? displayTerms.map((term) => (
                            <Link
                              key={term.id}
                              href={
                                term.taxonomy === "the_loai" ||
                                term.taxonomy === "category"
                                  ? "/category/" + term.slug
                                  : "/novels?tag=" + term.slug
                              }
                            >
                              {term.name}
                            </Link>
                          ))
                        : (primaryCategory?.name ?? "Đang cập nhật")}
                    </dd>
                  </div>
                </dl>

                <div className="novel-detail-description">
                  <strong>{copy.introTitle}</strong>
                  <p>
                    {toDisplayText(novel.postContent).slice(0, 620) ||
                      copy.noSummaryAvailableYet}
                  </p>
                </div>
              </article>

              <aside className="novel-detail-related">
                <h2>{copy.sameCategoryTitle}</h2>
                {relatedNovels.length > 0 ? (
                  <ul>
                    {relatedNovels.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        <Link href={"/novels/" + item.id}>
                          <img
                            src={getDiscoveryNovelImage(item)}
                            alt={item.title}
                            loading="lazy"
                            onError={fallbackToDefaultCover}
                          />
                          <span>{item.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{copy.noRelatedNovels}</p>
                )}
              </aside>
            </div>
          </section>

          <section
            className="novel-chapter-section"
            aria-labelledby="novel-chapter-list-title"
          >
            <div className="novel-chapter-section__header">
              <h2 id="novel-chapter-list-title">{copy.chapterListTitle}</h2>
              <span>
                {formatAppNumber(
                  chapters.length || Number(novel.chapterCount ?? 0),
                  locale,
                )}{" "}
                {copy.chapterUnit}
              </span>
            </div>
            {chaptersLoading ? (
              <p className="novel-chapter-empty">{copy.loadingChapterList}</p>
            ) : orderedChapters.length === 0 ? (
              <p className="novel-chapter-empty">{copy.chapterListEmpty}</p>
            ) : (
              <ol className="novel-chapter-list">
                {chapterRows.map(
                  ({
                    chapter,
                    accessMeta,
                    chapterNumber,
                    isVipChapter,
                    titleIncludesChapterNumber,
                  }) => {
                    return (
                      <li key={chapter.id}>
                        <Link
                          data-locked={accessMeta.isLocked ? "true" : "false"}
                          data-vip={isVipChapter ? "true" : "false"}
                          data-title-numbered={
                            titleIncludesChapterNumber ? "true" : "false"
                          }
                          href={buildChapterHref(chapter.id, novel.id)}
                        >
                          {!titleIncludesChapterNumber ? (
                            <span>
                              {locale === "vi" ? "Chương" : "Chapter"}{" "}
                              {formatAppNumber(Number(chapterNumber), locale)}
                            </span>
                          ) : null}
                          <strong>{chapter.title}</strong>
                          <div className="novel-chapter-list__meta">
                            <small>
                              {formatAppNumber(
                                Number(chapter.viewCount ?? 0),
                                locale,
                              )}{" "}
                              {copy.viewsLabel}
                            </small>
                            {isVipChapter ? (
                              <span
                                className="reader-chapter-badge reader-chapter-badge--vip"
                                aria-label={copy.vipChapterAccess}
                              >
                                <span
                                  className="reader-chapter-badge__icon"
                                  aria-hidden="true"
                                />
                                VIP
                              </span>
                            ) : accessMeta.isLocked ? (
                              <span
                                className="reader-chapter-badge reader-chapter-badge--locked"
                                aria-label={copy.lockedChapterAccess}
                              >
                                <span
                                  className="reader-chapter-badge__icon"
                                  aria-hidden="true"
                                />
                                {accessMeta.effectivePrice > 0
                                  ? formatMoney(
                                      accessMeta.effectivePrice,
                                      locale,
                                    )
                                  : copy.lockedChapterAccess}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  },
                )}
              </ol>
            )}
          </section>

          <Dialog open={comboDialogOpen} onOpenChange={setComboDialogOpen}>
            <DialogContent className="max-w-[min(96vw,1200px)] max-h-[85vh] mx-auto my-6 gap-0 overflow-y-auto border border-[#ead7ff] bg-white p-0 text-left sm:max-w-[1200px]">
              <DialogHeader className="border-b border-[#f1e4ff] px-6 py-5">
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  {copy.unlockAllDialogTitle}
                </DialogTitle>
                <DialogDescription className="text-sm leading-6 text-slate-600">
                  {copy.unlockAllDialogBody}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 px-6 py-5 lg:grid-cols-2">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <section className="grid gap-3 rounded-xl border border-[#efe2ff] bg-[#fdfaff] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {copy.unlockAllLockedListTitle}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {formatAppNumber(lockedChapterRows.length, locale)}{" "}
                            {copy.chapterUnit}
                          </p>
                        </div>
                        <span className="reader-chapter-badge reader-chapter-badge--locked">
                          <span
                            className="reader-chapter-badge__icon"
                            aria-hidden="true"
                          />
                          {formatAppNumber(lockedChapterRows.length, locale)}
                        </span>
                      </div>
                      {lockedChapterRows.length > 0 ? (
                        <ul className="flex flex-col max-h-95 gap-2 overflow-y-auto overflow-x-hidden pr-0">
                          {lockedChapterRows.map(
                            ({
                              chapter,
                              chapterNumber,
                              titleIncludesChapterNumber,
                              accessMeta,
                            }) => (
                              <li
                                key={chapter.id}
                                className="grid gap-2 rounded-lg border border-[#f3e8ff] bg-white px-3 py-2 w-full"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    {!titleIncludesChapterNumber ? (
                                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#8c54d6]">
                                        {locale === "vi" ? "Chương" : "Chapter"}{" "}
                                        {formatAppNumber(
                                          Number(chapterNumber),
                                          locale,
                                        )}
                                      </p>
                                    ) : null}
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {chapter.title}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-sm font-semibold text-[#d97706]">
                                    {formatMoney(
                                      accessMeta.effectivePrice,
                                      locale,
                                    )}
                                  </span>
                                </div>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">
                          {copy.unlockAllEmptyLocked}
                        </p>
                      )}
                    </section>

                    <section className="grid gap-3 rounded-xl border border-[#e2eef6] bg-[#f8fcff] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {copy.unlockAllUnlockedListTitle}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {formatAppNumber(
                              unlockedChapterRows.length,
                              locale,
                            )}{" "}
                            {copy.chapterUnit}
                          </p>
                        </div>
                        <span className="reader-chapter-badge reader-chapter-badge--vip">
                          <span
                            className="reader-chapter-badge__icon"
                            aria-hidden="true"
                          />
                          {formatAppNumber(unlockedChapterRows.length, locale)}
                        </span>
                      </div>
                      {unlockedChapterRows.length > 0 ? (
                        <ul className="grid max-h-95   gap-2 overflow-y-auto pr-1">
                          {unlockedChapterRows.map(
                            ({
                              chapter,
                              chapterNumber,
                              titleIncludesChapterNumber,
                              isVipChapter,
                            }) => (
                              <li
                                key={chapter.id}
                                className="grid gap-2 rounded-lg border border-[#dbeafe] bg-white px-3 py-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    {!titleIncludesChapterNumber ? (
                                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-sky-700">
                                        {locale === "vi" ? "Chương" : "Chapter"}{" "}
                                        {formatAppNumber(
                                          Number(chapterNumber),
                                          locale,
                                        )}
                                      </p>
                                    ) : null}
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {chapter.title}
                                    </p>
                                  </div>
                                  <span className="text-xs font-semibold text-sky-700">
                                    {isVipChapter
                                      ? "VIP"
                                      : copy.unlockAllOwnedLabel}
                                  </span>
                                </div>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">
                          {copy.unlockAllEmptyUnlocked}
                        </p>
                      )}
                    </section>
                  </div>
                </div>

                <aside className="grid content-start gap-4 rounded-xl border border-[#eadcf7] bg-[#fffefe] p-4">
                  <div className="grid gap-3 rounded-xl bg-[#fbf7ff] p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#8c54d6]">
                      <LockOpen className="h-4 w-4" aria-hidden="true" />
                      {copy.unlockAllSummaryTitle}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-600">
                        {copy.unlockAllComboPriceLabel}
                      </span>
                      <strong className="text-lg text-slate-900">
                        {comboPrice !== null
                          ? formatMoney(comboPrice, locale)
                          : "--"}
                      </strong>
                    </div>
                    {comboOriginalPrice !== null &&
                    comboPrice !== null &&
                    comboOriginalPrice > comboPrice ? (
                      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                        <span>{copy.unlockAllOriginalPriceLabel}</span>
                        <span className="line-through">
                          {formatMoney(comboOriginalPrice, locale)}
                        </span>
                      </div>
                    ) : null}
                    {comboDiscountPct !== null && comboDiscountPct > 0 ? (
                      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                        <span>{copy.discountSuffix}</span>
                        <span>
                          {formatAppNumber(comboDiscountPct, locale)}%
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {user ? (
                    <div className="grid gap-2 grid-flow-col ">
                      <div className="grid gap-2 rounded-xl border border-[#e5e7eb] bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Wallet className="h-4 w-4" aria-hidden="true" />
                          {copy.kimTeBalanceLabel}
                        </div>
                        <strong className="text-xl text-slate-900">
                          {formatMoney(walletBalance, locale)}
                        </strong>
                      </div>
                      <div className="grid gap-2 rounded-xl border border-[#e5e7eb] bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                          {copy.rewardPointBalanceLabel}
                        </div>
                        <strong className="text-xl text-slate-900">
                          {formatAppNumber(pointBalance ?? 0, locale)}
                        </strong>
                      </div>
                      <div className="grid gap-2 rounded-xl border border-[#d9f99d] bg-[#f7fee7] p-4">
                        <span className="text-sm font-medium text-slate-700">
                          {copy.totalAvailableLabel}
                        </span>
                        <strong className="text-xl text-slate-900">
                          {formatMoney(totalPurchaseBalance, locale)}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#f5d0fe] bg-[#fdf4ff] p-4 text-sm leading-6 text-slate-600">
                      {copy.unlockAllLoginRequired}
                    </div>
                  )}

                  <div className="rounded-xl border border-[#ede9fe] bg-[#faf5ff] p-4 text-sm leading-6 text-slate-600">
                    {copy.unlockAllAutoSpendHint}
                  </div>

                  {user && comboHasLockedChapters && comboPrice !== null ? (
                    <div
                      className={
                        "rounded-xl border p-4 text-sm leading-6 " +
                        (comboAffordable
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700")
                      }
                    >
                      {comboAffordable
                        ? copy.unlockAllAffordHint
                        : copy.unlockAllInsufficientHint}
                    </div>
                  ) : null}

                  {comboPurchaseMessage ? (
                    <div className="rounded-xl border border-[#e9d5ff] bg-[#faf5ff] p-4 text-sm leading-6 text-[#6b21a8]">
                      {comboPurchaseMessage}
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    {user ? (
                      <button
                        className="action-primary"
                        type="button"
                        disabled={
                          comboPurchaseBusy ||
                          !comboHasLockedChapters ||
                          (comboPrice !== null &&
                            comboPrice > 0 &&
                            !comboAffordable)
                        }
                        onClick={() => void onPurchaseNovelCombo()}
                      >
                        {comboPurchaseBusy
                          ? copy.unlockAllProcessing
                          : copy.unlockAllPurchaseAction}
                      </button>
                    ) : (
                      <Link className="action-primary" href="/auth/login">
                        {copy.unlockAllLoginAction}
                      </Link>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Link className="action-secondary" href="/top-up">
                        {copy.topUpWallet}
                      </Link>
                      <Link
                        className="action-secondary"
                        href="/profile/missions"
                      >
                        {copy.unlockAllOpenMissions}
                      </Link>
                    </div>
                  </div>
                </aside>
              </div>
            </DialogContent>
          </Dialog>

          <SponsoredNativeBanner
            placement="novel-detail"
            settings={adSettings}
          />

          <section className="novel-detail-companion">
            <article className="novel-detail-editor">
              <div>
                <span>{getAuthorName(novel).slice(0, 1).toUpperCase()}</span>
                <strong>{getAuthorName(novel)}</strong>
                <small>{copy.authorLabel}</small>
              </div>
            </article>

            <article className="novel-detail-strip">
              <h2>{copy.relatedTitle}</h2>
              {relatedNovels.length > 0 ? (
                <div className="novel-detail-strip__grid">
                  {relatedNovels.map((item) => (
                    <Link key={item.id} href={"/novels/" + item.id}>
                      <img
                        src={getDiscoveryNovelImage(item)}
                        alt={item.title}
                        loading="lazy"
                        onError={fallbackToDefaultCover}
                      />
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>{copy.noRelatedNovels}</p>
              )}
            </article>
          </section>

          {history.length > 0 ? (
            <section className="reader-card">
              <h2>{copy.recentReadingHistory}</h2>
              <ul className="reader-history-list reader-history-list--recent">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      className="reader-history-link"
                      href={buildChapterHref(
                        entry.chapterId ?? 1,
                        entry.novelId,
                      )}
                    >
                      {getHistoryResumeLabel(
                        entry,
                        orderedChapters,
                        locale,
                        copy.resumeChapter,
                      )}
                    </Link>
                    <span>
                      {formatAppNumber(Number(entry.progressPercent), locale)}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="novel-social-panel">
            <h2>{copy.commentsReviewsTitle}</h2>
            <div
              className="novel-social-tabs"
              role="tablist"
              aria-label={copy.commentsReviewsTitle}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeSocialTab === "reviews"}
                className={
                  activeSocialTab === "reviews" ? "is-active" : undefined
                }
                onClick={() => setActiveSocialTab("reviews")}
              >
                <Star aria-hidden="true" />
                {copy.reviewTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeSocialTab === "comments"}
                className={
                  activeSocialTab === "comments" ? "is-active" : undefined
                }
                onClick={() => setActiveSocialTab("comments")}
              >
                {copy.commentTab}
              </button>
            </div>

            {activeSocialTab === "reviews" ? (
              <div className="novel-review-tab" role="tabpanel">
                <div className="novel-review-form">
                  <span>{copy.scoreLabel}</span>
                  <div
                    className="novel-review-stars"
                    role="radiogroup"
                    aria-label={copy.selectRating}
                  >
                    {RATING_STARS.map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-checked={reviewRating === star}
                        aria-label={copy.selectRating + " " + star + "/5"}
                        className={
                          star <= reviewRating ? "is-active" : undefined
                        }
                        disabled={reviewBusy}
                        onClick={() => void onSelectReviewRating(star)}
                        role="radio"
                      >
                        <Star aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <label className="novel-review-score-only">
                    <input
                      type="checkbox"
                      checked={reviewScoreOnly}
                      onChange={(event) =>
                        setReviewScoreOnly(event.target.checked)
                      }
                    />
                    {copy.scoreOnlyLabel}
                  </label>
                  <input
                    value={reviewCharacter}
                    onChange={(event) => setReviewCharacter(event.target.value)}
                    placeholder={copy.characterPlaceholder}
                    disabled={reviewScoreOnly}
                  />
                  <input
                    value={reviewPlot}
                    onChange={(event) => setReviewPlot(event.target.value)}
                    placeholder={copy.plotPlaceholder}
                    disabled={reviewScoreOnly}
                  />
                  <textarea
                    value={reviewContent}
                    onChange={(event) => setReviewContent(event.target.value)}
                    placeholder={
                      user ? copy.minReviewPlaceholder : copy.signInToReview
                    }
                    maxLength={2000}
                    rows={4}
                    disabled={reviewScoreOnly}
                  />
                  <div className="novel-review-form__footer">
                    <span>{reviewContent.trim().length}/2000</span>
                    <button
                      type="button"
                      disabled={reviewBusy}
                      onClick={() => void onSubmitNovelReview()}
                    >
                      {reviewBusy ? copy.updatingReview : copy.submitReview}
                    </button>
                  </div>
                  {reviewMessage ? (
                    <p className="novel-detail-inline-message">
                      {reviewMessage}
                    </p>
                  ) : null}
                </div>

                <div className="novel-review-list">
                  <h3>
                    {copy.reviewListTitle} (
                    {formatAppNumber(reviewList?.total ?? ratingCount, locale)})
                  </h3>
                  {reviewItems.length === 0 ? (
                    <p className="reader-muted">{copy.noReviewList}</p>
                  ) : (
                    reviewItems.map((item) => (
                      <article className="novel-review-item" key={item.id}>
                        <div className="novel-review-item__avatar">
                          {item.user.avatar ? (
                            <img
                              src={
                                resolveImageUrl(item.user.avatar) ??
                                item.user.avatar
                              }
                              alt={item.user.nickname ?? "Reader"}
                              onError={fallbackToDefaultCover}
                            />
                          ) : (
                            <span>
                              {(item.user.nickname ?? "R")
                                .slice(0, 1)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <strong>
                            {item.user.nickname ?? "Reader #" + item.user.id}
                          </strong>
                          <small>
                            {formatRelativeTime(item.createdAt, locale)}
                          </small>
                          {renderStarRow(
                            item.rating,
                            "novel-review-item__stars",
                          )}
                          {item.content ? (
                            <p>
                              {item.content.split("\n").map((line, index) => (
                                <span key={index}>{line}</span>
                              ))}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    ))
                  )}
                  {reviewList && reviewList.totalPages > 1 ? (
                    <div className="novel-review-pagination">
                      <button
                        type="button"
                        disabled={reviewList.page <= 1}
                        onClick={() =>
                          void onReviewPageChange(reviewList.page - 1)
                        }
                      >
                        Trước
                      </button>
                      <span>
                        {reviewList.page}/{reviewList.totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={reviewList.page >= reviewList.totalPages}
                        onClick={() =>
                          void onReviewPageChange(reviewList.page + 1)
                        }
                      >
                        Tiếp
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <SocialThread
                title={copy.discussionTitle}
                scope={{ novelId }}
                emptyHint={copy.discussionEmpty}
                variant="embedded"
                hideHeader
              />
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}

export function ChapterReaderView({ chapterId }: { chapterId: number }) {
  const { locale, user } = useContext(AppContext);
  const router = useRouter();
  const copy = getChapterCopy(locale);
  const [chapter, setChapter] = useState<ReaderChapter | null>(null);
  const [chapterContext, setChapterContext] =
    useState<ReaderChapterContext | null>(null);
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(chapterId === 1);
  const [requiresPurchase, setRequiresPurchase] = useState(chapterId > 1);
  const [chapterPrice, setChapterPrice] = useState<number | null>(null);
  const [comboPrice, setComboPrice] = useState<number | null>(null);
  const [comboDiscountPct, setComboDiscountPct] = useState<number | null>(null);
  const [comboOriginalPrice, setComboOriginalPrice] = useState<number | null>(
    null,
  );
  const [comboLockedChapterCount, setComboLockedChapterCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [chapterPricingMeta, setChapterPricingMeta] = useState<
    Record<
      number,
      { isLocked: boolean; effectivePrice: number; priceSource: string }
    >
  >({});
  const [vipAccessMode, setVipAccessMode] = useState(false);
  const [fontSize, setFontSize] = useState<ReaderFontSizeOption>(
    READER_TYPOGRAPHY_DEFAULTS.fontSize,
  );
  const [themeMode, setThemeMode] = useState<ReaderThemeMode>(
    READER_TYPOGRAPHY_DEFAULTS.themeMode,
  );
  const [fontFamily, setFontFamily] = useState<ReaderFontFamilyOption>(
    READER_TYPOGRAPHY_DEFAULTS.fontFamily,
  );
  const [lineHeight, setLineHeight] = useState<ReaderLineHeightOption>(
    READER_TYPOGRAPHY_DEFAULTS.lineHeight,
  );
  const [contentWidth, setContentWidth] = useState<ReaderContentWidthOption>(
    READER_TYPOGRAPHY_DEFAULTS.contentWidth,
  );
  const [fabOpen, setFabOpen] = useState(false);
  const [fontModalOpen, setFontModalOpen] = useState(false);
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [readerToolMessage, setReaderToolMessage] = useState<string | null>(
    null,
  );
  const [chapterLiked, setChapterLiked] = useState(false);
  const [chapterLikeCount, setChapterLikeCount] = useState(0);
  const [chapterLikeBusy, setChapterLikeBusy] = useState(false);
  const [chapterLikeMessage, setChapterLikeMessage] = useState<string | null>(
    null,
  );
  const [readingContentProgress, setReadingContentProgress] = useState(0);
  const [adSettings, setAdSettings] = useState<PublicAdSettings>(
    DEFAULT_PUBLIC_AD_SETTINGS,
  );
  const [chapterAdGate, setChapterAdGate] = useState<{
    nextHref: string;
    opened: boolean;
    secondsRemaining: number;
  } | null>(null);
  const chapterContentRef = useRef<HTMLElement | null>(null);
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastAutoSyncedProgressRef = useRef<number | null>(null);
  const latestReadableChapterRef = useRef<ReaderChapter | null>(null);
  const latestReadingProgressRef = useRef(0);
  const latestCanPersistProgressRef = useRef(false);
  const syncedChapterKeysRef = useRef(new Set<string>());

  function applyChapterPricing(
    pricing: NovelPricingResponse,
    activeChapterId: number,
  ) {
    const nextPricingMeta: Record<
      number,
      { isLocked: boolean; effectivePrice: number; priceSource: string }
    > = {};
    pricing.chapters.forEach((item) => {
      nextPricingMeta[item.id] = {
        isLocked: item.isLocked,
        effectivePrice: item.effectivePrice,
        priceSource: item.priceSource,
      };
    });

    setChapterPricingMeta(nextPricingMeta);

    const isVip =
      pricing.chapters.length > 0 &&
      pricing.chapters.every((item) => item.priceSource === "vip_subscription");
    setVipAccessMode(isVip);
    if (isVip) {
      setIsUnlocked(true);
      setRequiresPurchase(false);
    }

    const activeChapterPricing = nextPricingMeta[activeChapterId];
    if (activeChapterPricing) {
      setRequiresPurchase(activeChapterPricing.isLocked);
      setChapterPrice(activeChapterPricing.effectivePrice);
      if (!activeChapterPricing.isLocked) {
        setIsUnlocked(true);
      }
    } else {
      setRequiresPurchase(false);
      setIsUnlocked(true);
      setChapterPrice(0);
    }

    setComboPrice(pricing.combo.discountedTotalPrice);
    setComboDiscountPct(pricing.settings.comboDiscountPct);
    setComboOriginalPrice(pricing.combo.originalTotalPrice ?? null);
    setComboLockedChapterCount(pricing.combo.lockedChapterCount);
    setWalletBalance(pricing.buyer?.depositedBalance ?? null);
    setPointBalance(pricing.buyer?.pointBalance ?? null);
  }

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
    const controller = new AbortController();

    void (async () => {
      const result = await fetchPublicAdSettings(controller.signal);
      if (controller.signal.aborted || !result.ok) {
        return;
      }

      setAdSettings(result.data);
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const token = getSessionToken() ?? undefined;

    setLoading(true);
    setError(null);
    setPurchaseMessage(null);
    setChapterContext(null);
    setIsUnlocked(chapterId === 1);
    setRequiresPurchase(chapterId > 1);
    setChapterPrice(null);
    setComboPrice(null);
    setComboDiscountPct(null);
    setComboLockedChapterCount(0);
    setChapterPricingMeta({});
    setVipAccessMode(false);
    setComboOriginalPrice(null);
    setWalletBalance(null);
    setPointBalance(null);
    setFabOpen(false);
    setFontModalOpen(false);
    setChapterMenuOpen(false);
    setReaderToolMessage(null);
    setChapterLiked(false);
    setChapterLikeCount(0);
    setChapterLikeBusy(false);
    setChapterLikeMessage(null);
    setReadingContentProgress(0);
    setChapterAdGate(null);
    lastAutoSyncedProgressRef.current = null;
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }

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
        const likeStatusResult = await fetchChapterLikeStatus(chapterId, token);
        if (likeStatusResult.ok) {
          setChapterLiked(likeStatusResult.data.liked);
          setChapterLikeCount(likeStatusResult.data.totalLikes);
        }

        const pricingResult = await fetchReaderNovelPricing(
          chapterResult.data.novelId,
          token,
        );
        if (pricingResult.ok) {
          applyChapterPricing(pricingResult.data, chapterId);
        }

        const historyResult = await fetchReadingHistory(
          token,
          chapterResult.data.novelId,
        );
        const localHistoryEntry = historyResult.ok
          ? historyResult.data.find((item) => item.chapterId === chapterId)
          : undefined;

        if (historyResult.ok) {
          setHistory(historyResult.data);
          if (localHistoryEntry) {
            lastAutoSyncedProgressRef.current = Number(
              localHistoryEntry.progressPercent,
            );
            setIsUnlocked(true);
          }
        }

        const syncKey =
          String(chapterResult.data.novelId) + ":" + String(chapterId);
        if (!syncedChapterKeysRef.current.has(syncKey)) {
          syncedChapterKeysRef.current.add(syncKey);
          const syncResult = await syncReaderChapterOpen(
            {
              novelId: chapterResult.data.novelId,
              chapterId,
              progressPercent: localHistoryEntry?.progressPercent ?? 0,
              clientUpdatedAt:
                localHistoryEntry?.lastReadAt ?? new Date().toISOString(),
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

  useEffect(() => {
    if (!chapter || (requiresPurchase && !isUnlocked)) {
      setReadingContentProgress(0);
      return;
    }

    let frameId = 0;

    function updateReadingProgress() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const contentElement = chapterContentRef.current;
        if (!contentElement) {
          setReadingContentProgress(0);
          return;
        }

        const scrollY = window.scrollY;
        const rect = contentElement.getBoundingClientRect();
        const contentStart = rect.top + scrollY;
        const contentEnd =
          contentStart + contentElement.scrollHeight - window.innerHeight;
        const rawProgress =
          contentEnd <= contentStart
            ? scrollY >= contentStart
              ? 100
              : 0
            : ((scrollY - contentStart) / (contentEnd - contentStart)) * 100;

        setReadingContentProgress(
          Math.round(Math.max(0, Math.min(100, rawProgress))),
        );
      });
    }

    updateReadingProgress();
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("resize", updateReadingProgress);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateReadingProgress);
      window.removeEventListener("resize", updateReadingProgress);
    };
  }, [
    chapter,
    contentWidth,
    fontFamily,
    fontSize,
    isUnlocked,
    lineHeight,
    requiresPurchase,
    themeMode,
  ]);

  useEffect(() => {
    const token = getSessionToken() ?? undefined;
    if (!token || !chapter || (requiresPurchase && !isUnlocked)) {
      return;
    }

    const nextProgress = Math.max(0, Math.min(100, readingContentProgress));
    const previousProgress = lastAutoSyncedProgressRef.current;
    const shouldSync =
      previousProgress === null || nextProgress !== previousProgress;

    if (!shouldSync) {
      return;
    }

    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current);
    }

    const optimisticLastReadAt = new Date().toISOString();
    setHistory((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.novelId === chapter.novelId && item.chapterId === chapter.id,
      );
      if (existingIndex === -1) {
        return current;
      }

      const next = [...current];
      const previousEntry = next[existingIndex];
      if (!previousEntry) {
        return current;
      }

      const updated = {
        ...previousEntry,
        progressPercent: nextProgress,
        lastReadAt: optimisticLastReadAt,
        chapter: previousEntry.chapter ?? {
          id: chapter.id,
          title: chapter.title,
          chapterNumber: chapter.chapterNumber ?? null,
        },
      };
      next.splice(existingIndex, 1);
      return [updated, ...next];
    });

    progressSaveTimerRef.current = setTimeout(() => {
      void (async () => {
        const result = await upsertReadingHistory(
          {
            novelId: chapter.novelId,
            chapterId: chapter.id,
            progressPercent: nextProgress,
          },
          token,
        );

        if (result.ok) {
          lastAutoSyncedProgressRef.current = nextProgress;
          setHistory((current) => {
            const existingIndex = current.findIndex(
              (item) =>
                item.id === result.data.id ||
                (item.novelId === result.data.novelId &&
                  item.chapterId === result.data.chapterId),
            );
            const historyEntry = {
              ...result.data,
              chapter: result.data.chapter ?? {
                id: chapter.id,
                title: chapter.title,
                chapterNumber: chapter.chapterNumber ?? null,
              },
            };
            if (existingIndex === -1) {
              return [historyEntry, ...current];
            }

            const next = [...current];
            const previousEntry = next[existingIndex];
            if (!previousEntry) {
              return current;
            }

            next.splice(existingIndex, 1);
            return [
              {
                ...previousEntry,
                ...historyEntry,
                chapter: historyEntry.chapter ?? previousEntry?.chapter,
              },
              ...next,
            ];
          });
        }
      })();
    }, 500);

    return () => {
      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current);
        progressSaveTimerRef.current = null;
      }
    };
  }, [chapter, isUnlocked, readingContentProgress, requiresPurchase]);

  useEffect(() => {
    latestReadableChapterRef.current = chapter;
    latestReadingProgressRef.current = Math.max(
      0,
      Math.min(100, readingContentProgress),
    );
    latestCanPersistProgressRef.current = Boolean(
      chapter && !(requiresPurchase && !isUnlocked),
    );
  }, [chapter, isUnlocked, readingContentProgress, requiresPurchase]);

  useEffect(() => {
    return () => {
      const token = getSessionToken() ?? undefined;
      const chapterToSave = latestReadableChapterRef.current;
      if (!token || !chapterToSave || !latestCanPersistProgressRef.current) {
        return;
      }

      void upsertReadingHistory(
        {
          novelId: chapterToSave.novelId,
          chapterId: chapterToSave.id,
          progressPercent: latestReadingProgressRef.current,
        },
        token,
      );
    };
  }, [chapterId]);

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
      copy.confirmComboPurchase +
        chapter.novelId +
        " at " +
        formatMoney(comboPrice, locale) +
        "?",
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
      setPurchaseMessage(
        copy.insufficientDepositedBalance + " " + copy.topUpWalletAndTryAgain,
      );
      return;
    }

    setIsUnlocked(true);
    setRequiresPurchase(false);
    const refreshedPricing = await fetchReaderNovelPricing(
      chapter.novelId,
      token,
    );
    if (refreshedPricing.ok) {
      applyChapterPricing(refreshedPricing.data, chapter.id);
    }
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
      copy.confirmChapterPurchase +
        chapter.id +
        " at " +
        formatMoney(chapterPrice, locale) +
        "?",
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
      setPurchaseMessage(
        copy.insufficientDepositedBalance + " " + copy.topUpWalletAndTryAgain,
      );
      return;
    }

    setIsUnlocked(true);
    setRequiresPurchase(false);
    const refreshedPricing = await fetchReaderNovelPricing(
      chapter.novelId,
      token,
    );
    if (refreshedPricing.ok) {
      applyChapterPricing(refreshedPricing.data, chapter.id);
    }
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

  async function onLikeChapter() {
    const token = getSessionToken() ?? undefined;
    if (!token) {
      setChapterLikeMessage(copy.signInToLikeChapter);
      return;
    }

    setChapterLikeBusy(true);
    setChapterLikeMessage(null);

    const result = await likeReaderChapter(chapterId, token);
    setChapterLikeBusy(false);

    if (!result.ok) {
      setChapterLikeMessage(result.error.message);
      return;
    }

    setChapterLiked(result.data.liked);
    setChapterLikeCount(result.data.totalLikes);
    setChapterLikeMessage(
      result.data.alreadyLiked
        ? copy.chapterAlreadyLiked
        : result.data.pointsAwarded > 0
          ? copy.chapterLikeRewarded
          : copy.chapterLikeSaved,
    );
  }

  useEffect(() => {
    if (!chapterAdGate?.opened || chapterAdGate.secondsRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setChapterAdGate((current) => {
        if (!current?.opened) {
          return current;
        }

        return {
          ...current,
          secondsRemaining: Math.max(0, current.secondsRemaining - 1),
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [chapterAdGate?.opened, chapterAdGate?.secondsRemaining]);

  function navigateToChapter(href: string) {
    setChapterAdGate(null);
    router.push(href);
  }

  function onRequestNextChapter(nextHref: string) {
    if (!chapter) {
      navigateToChapter(nextHref);
      return;
    }

    if (!adSettings.chapterGateEnabled) {
      navigateToChapter(nextHref);
      return;
    }

    const shouldGate = advanceChapterAdCounter(
      chapter.novelId,
      adSettings.chapterGateEveryChapters,
      user?.id,
    );
    if (!shouldGate) {
      navigateToChapter(nextHref);
      return;
    }

    setChapterAdGate({
      nextHref,
      opened: false,
      secondsRemaining: adSettings.chapterGateWaitSeconds,
    });
  }

  function onOpenChapterAdGate() {
    if (!chapterAdGate) {
      return;
    }

    const chapterGateUrl = getNextChapterGateUrl(adSettings, user?.id);
    if (!chapterGateUrl) {
      navigateToChapter(chapterAdGate.nextHref);
      return;
    }

    window.open(chapterGateUrl, "_blank", "noopener,noreferrer");
    setChapterAdGate((current) =>
      current
        ? {
            ...current,
            opened: true,
            secondsRemaining: adSettings.chapterGateWaitSeconds,
          }
        : current,
    );
  }

  const previousChapterHref = chapterContext?.previousChapterId
    ? buildChapterHref(chapterContext.previousChapterId, chapterContext.novelId)
    : null;
  const nextChapterHref = chapterContext?.nextChapterId
    ? buildChapterHref(chapterContext.nextChapterId, chapterContext.novelId)
    : null;

  const totalPurchaseBalance = (walletBalance ?? 0) + (pointBalance ?? 0);
  const balanceInsufficientForChapter =
    chapterPrice !== null &&
    chapterPrice > 0 &&
    totalPurchaseBalance < chapterPrice;
  const balanceInsufficientForCombo =
    comboPrice !== null && comboPrice > 0 && totalPurchaseBalance < comboPrice;
  const chapterContentClassName =
    "reader-content " +
    "reader-content--font-" +
    fontSize +
    " " +
    "reader-content--theme-" +
    themeMode +
    " " +
    "reader-content--font-family-" +
    fontFamily +
    " " +
    "reader-content--line-height-" +
    lineHeight +
    " " +
    "reader-content--width-" +
    contentWidth;

  const fontSizeOptions: Array<{ value: ReaderFontSizeOption; label: string }> =
    [
      { value: "sm", label: copy.compact },
      { value: "md", label: copy.comfort },
      { value: "lg", label: copy.large },
    ];
  const themeOptions: Array<{
    value: ReaderThemeMode;
    label: string;
    icon: typeof Sun;
  }> = [
    { value: "light", label: copy.light, icon: Sun },
    { value: "dark", label: copy.dark, icon: Moon },
  ];
  const fontFamilyOptions: Array<{
    value: ReaderFontFamilyOption;
    label: string;
  }> = [
    { value: "serif", label: copy.serif },
    { value: "sans", label: copy.sans },
    { value: "mono", label: copy.monospace },
  ];
  const lineHeightOptions: Array<{
    value: ReaderLineHeightOption;
    label: string;
  }> = [
    { value: "compact", label: copy.compact },
    { value: "comfortable", label: copy.comfort },
    { value: "airy", label: copy.large },
  ];
  const contentWidthOptions: Array<{
    value: ReaderContentWidthOption;
    label: string;
  }> = [
    { value: "narrow", label: copy.compact },
    { value: "standard", label: copy.comfort },
    { value: "wide", label: copy.large },
  ];

  function renderChapterMenu(className = "") {
    return (
      <aside
        className={"reader-chapter-menu " + className}
        aria-label={copy.tableOfContents}
      >
        <div className="reader-chapter-menu__header">
          <h2>{copy.tableOfContents}</h2>
          {chapterContext ? (
            <span>
              {formatAppNumber(chapterContext.chapters.length, locale)}{" "}
              {copy.chapterLabel.toLowerCase()}
            </span>
          ) : null}
        </div>
        {chapterContext?.chapters.length ? (
          <ul className="reader-chapter-menu__list">
            {chapterContext.chapters.map((item) => (
              <li key={item.id}>
                <Link
                  className="reader-history-link"
                  data-active={item.id === chapter?.id ? "true" : "false"}
                  href={buildChapterHref(item.id, chapterContext.novelId)}
                  onClick={() => setChapterMenuOpen(false)}
                >
                  <span>{item.title}</span>
                  {item.id === chapter?.id ? (
                    <small>{copy.activeChapter}</small>
                  ) : null}
                  {vipAccessMode ? (
                    <span
                      className="reader-chapter-badge reader-chapter-badge--vip"
                      aria-label={copy.comboLabel + " VIP"}
                    >
                      <span
                        className="reader-chapter-badge__icon"
                        aria-hidden="true"
                      />
                      VIP
                    </span>
                  ) : chapterPricingMeta[item.id]?.isLocked ? (
                    <span
                      className="reader-chapter-badge reader-chapter-badge--locked"
                      aria-label={copy.chapterLockedTitle}
                    >
                      <span
                        className="reader-chapter-badge__icon"
                        aria-hidden="true"
                      />
                      {formatMoney(
                        chapterPricingMeta[item.id]?.effectivePrice ?? 0,
                        locale,
                      )}
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
    );
  }

  return (
    <main
      className={
        "reader-shell reader-shell--chapter reader-shell--chapter-theme-" +
        themeMode
      }
    >
      <div className="reader-scroll-progress" aria-hidden="true">
        <span
          style={{ transform: `scaleX(${readingContentProgress / 100})` }}
        />
      </div>
      {loading ? (
        <p className="discovery-state">{copy.loadingChapter}</p>
      ) : null}
      {error ? (
        <p className="discovery-state discovery-state--error">{error}</p>
      ) : null}

      {chapter ? (
        <>
          <section className="reader-chapter-page">
            <div className="reader-chapter-topbar">
              {previousChapterHref ? (
                <Link
                  className="reader-chapter-nav-button"
                  href={previousChapterHref}
                  aria-label={copy.previousChapter}
                >
                  <ChevronLeft aria-hidden="true" />
                  <span>{copy.previousChapter}</span>
                </Link>
              ) : (
                <button
                  className="reader-chapter-nav-button"
                  type="button"
                  disabled
                >
                  <ChevronLeft aria-hidden="true" />
                  <span>{copy.firstChapter}</span>
                </button>
              )}

              <Link
                className="reader-chapter-back-link"
                href={buildNovelHref(chapter.novelId)}
              >
                <BookOpen aria-hidden="true" />
                <span>{copy.backToNovel}</span>
              </Link>

              {requiresPurchase && !isUnlocked ? (
                <button
                  className="reader-chapter-nav-button"
                  type="button"
                  disabled
                >
                  <span>{copy.nextChapterLocked}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ) : nextChapterHref ? (
                <button
                  className="reader-chapter-nav-button"
                  type="button"
                  aria-label={copy.nextChapter}
                  onClick={() => onRequestNextChapter(nextChapterHref)}
                >
                  <span>{copy.nextChapter}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="reader-chapter-nav-button"
                  type="button"
                  disabled
                >
                  <span>{copy.lastChapter}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </div>

            <header className="reader-chapter-heading">
              <p>{copy.currentChapter}</p>
              <h1>{chapter.title}</h1>
              <div>
                {/* <span>
                  {copy.chapterLabel} #
                  {formatAppNumber(Number(chapter.id), locale)}
                </span>
                <span>
                  {copy.novelLabel} #
                  {formatAppNumber(Number(chapter.novelId), locale)}
                </span> */}
                <span>
                  {formatAppNumber(Number(chapter.viewCount), locale)}{" "}
                  {copy.viewsLabel}
                </span>
                <button
                  className="reader-chapter-like-button"
                  data-liked={chapterLiked ? "true" : "false"}
                  disabled={chapterLikeBusy}
                  onClick={() => void onLikeChapter()}
                  type="button"
                >
                  <Heart aria-hidden="true" />
                  <span>
                    {chapterLiked ? copy.likedChapter : copy.likeChapter}
                  </span>
                  <small>{formatAppNumber(chapterLikeCount, locale)}</small>
                </button>
              </div>
              {chapterLikeMessage ? (
                <p className="reader-chapter-like-message">
                  {chapterLikeMessage}
                </p>
              ) : null}
            </header>

            <div className="reader-chapter-stage">
              {requiresPurchase && !isUnlocked ? (
                <article className="reader-locked-box reader-locked-box--chapter">
                  <h2>{copy.chapterLockedTitle}</h2>
                  <p>{copy.chapterLockedBody}</p>

                  {walletBalance !== null ? (
                    <p className="reader-muted">
                      {copy.walletBalanceLabel}:{" "}
                      {formatMoney(walletBalance, locale)}
                    </p>
                  ) : null}
                  {pointBalance !== null ? (
                    <p className="reader-muted">
                      {copy.rewardPointBalanceLabel}:{" "}
                      {formatAppNumber(pointBalance, locale)}
                    </p>
                  ) : null}
                  {walletBalance !== null || pointBalance !== null ? (
                    <p className="reader-muted">
                      {copy.totalAvailableLabel}:{" "}
                      {formatMoney(totalPurchaseBalance, locale)}
                    </p>
                  ) : null}

                  <p className="reader-muted">
                    {copy.priceLabel}: {formatMoney(chapterPrice, locale)}
                  </p>
                  {comboPrice !== null && comboLockedChapterCount > 0 ? (
                    <p className="reader-muted">
                      {copy.comboLabel}:{" "}
                      {comboOriginalPrice !== null &&
                      comboOriginalPrice > comboPrice ? (
                        <>
                          <s>{formatMoney(comboOriginalPrice, locale)}</s>{" "}
                        </>
                      ) : null}
                      {formatMoney(comboPrice, locale)}
                      {comboDiscountPct !== null
                        ? " (" +
                          formatAppNumber(comboDiscountPct, locale) +
                          "% " +
                          copy.discountSuffix +
                          ")"
                        : ""}
                    </p>
                  ) : null}
                  <p className="reader-muted">{copy.purchaseBalanceHint}</p>

                  <div className="reader-actions">
                    <button
                      className="action-primary"
                      type="button"
                      disabled={purchaseBusy || balanceInsufficientForChapter}
                      onClick={purchaseChapterAccess}
                    >
                      {purchaseBusy ? copy.processing : copy.purchaseChapter}
                    </button>
                    {comboPrice !== null && comboLockedChapterCount > 0 ? (
                      <button
                        className="action-secondary"
                        type="button"
                        disabled={purchaseBusy || balanceInsufficientForCombo}
                        onClick={purchaseComboAccess}
                      >
                        {copy.purchaseCombo}
                      </button>
                    ) : null}
                    <Link
                      className={
                        balanceInsufficientForChapter ||
                        balanceInsufficientForCombo
                          ? "action-primary"
                          : "action-secondary"
                      }
                      href="/top-up"
                    >
                      {copy.topUpWallet}
                    </Link>
                    <Link className="action-secondary" href="/profile/missions">
                      {locale === "vi" ? "Nhiệm vụ" : "Missions"}
                    </Link>
                  </div>

                  {purchaseMessage ? (
                    <p className="reader-muted">{purchaseMessage}</p>
                  ) : null}
                </article>
              ) : (
                <article
                  className={chapterContentClassName}
                  ref={chapterContentRef}
                >
                  {toDisplayText(chapter.postContent) || copy.noChapterContent}
                </article>
              )}
            </div>

            <div className="reader-chapter-bottom-nav">
              {previousChapterHref ? (
                <Link
                  className="reader-chapter-nav-button"
                  href={previousChapterHref}
                >
                  <ChevronLeft aria-hidden="true" />
                  <span>{copy.previousChapter}</span>
                </Link>
              ) : (
                <button
                  className="reader-chapter-nav-button"
                  type="button"
                  disabled
                >
                  <ChevronLeft aria-hidden="true" />
                  <span>{copy.firstChapter}</span>
                </button>
              )}

              <button
                className="reader-chapter-nav-button"
                type="button"
                onClick={() => setChapterMenuOpen(true)}
              >
                <List aria-hidden="true" />
                <span>{copy.tableOfContents}</span>
              </button>

              {requiresPurchase && !isUnlocked ? (
                <button
                  className="reader-chapter-nav-button"
                  type="button"
                  disabled
                >
                  <span>{copy.nextChapterLocked}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ) : nextChapterHref ? (
                <button
                  className="reader-chapter-nav-button"
                  type="button"
                  onClick={() => onRequestNextChapter(nextChapterHref)}
                >
                  <span>{copy.nextChapter}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="reader-chapter-nav-button"
                  type="button"
                  disabled
                >
                  <span>{copy.lastChapter}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </div>
          </section>

          {chapterAdGate ? (
            <div
              className="reader-ad-gate-overlay"
              role="dialog"
              aria-modal="true"
            >
              <section
                className="reader-ad-gate-modal"
                aria-labelledby="reader-ad-gate-title"
              >
                <button
                  aria-label={copy.close}
                  className="reader-ad-gate-close"
                  type="button"
                  onClick={() => setChapterAdGate(null)}
                >
                  <X aria-hidden="true" />
                </button>
                <h2 id="reader-ad-gate-title">{copy.sponsoredGateTitle}</h2>
                <p>{copy.sponsoredGateBody}</p>
                {!chapterAdGate.opened ? (
                  <button
                    className="action-primary"
                    type="button"
                    onClick={onOpenChapterAdGate}
                  >
                    {copy.sponsoredGateOpen}
                  </button>
                ) : chapterAdGate.secondsRemaining > 0 ? (
                  <button className="action-secondary" type="button" disabled>
                    {copy.sponsoredGateWait} {chapterAdGate.secondsRemaining}s
                  </button>
                ) : (
                  <button
                    className="action-primary"
                    type="button"
                    onClick={() => navigateToChapter(chapterAdGate.nextHref)}
                  >
                    {copy.sponsoredGateContinue}
                  </button>
                )}
              </section>
            </div>
          ) : null}

          <SponsoredNativeBanner
            placement="chapter-detail"
            settings={adSettings}
          />

          <SocialThread
            title={copy.noRepliesTitle}
            scope={{ chapterId }}
            emptyHint={copy.noRepliesHint}
          />

          <div
            className="reader-floating-tools"
            data-open={fabOpen ? "true" : "false"}
          >
            <div
              className="reader-floating-tools__actions"
              aria-hidden={!fabOpen}
            >
              <button
                type="button"
                className="reader-floating-tools__button"
                aria-label={copy.openTypographySettings}
                onClick={() => {
                  setFontModalOpen(true);
                  setFabOpen(false);
                  setReaderToolMessage(null);
                }}
              >
                <Type aria-hidden="true" />
              </button>
              <button
                type="button"
                className="reader-floating-tools__button"
                aria-label={copy.readAloud}
                onClick={() => {
                  setReaderToolMessage(copy.readAloudSoon);
                  setFabOpen(false);
                }}
              >
                <Mic2 aria-hidden="true" />
              </button>
              <button
                type="button"
                className="reader-floating-tools__button"
                aria-label={copy.openChapterMenu}
                onClick={() => {
                  setChapterMenuOpen(true);
                  setFabOpen(false);
                  setReaderToolMessage(null);
                }}
              >
                <List aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="reader-floating-tools__main"
              aria-label={
                fabOpen ? copy.closeReadingTools : copy.openReadingTools
              }
              aria-expanded={fabOpen}
              onClick={() => setFabOpen((open) => !open)}
            >
              <Settings aria-hidden="true" />
            </button>
          </div>

          {readerToolMessage ? (
            <div className="reader-tool-toast" role="status">
              <span>{readerToolMessage}</span>
              <button
                type="button"
                aria-label={copy.close}
                onClick={() => setReaderToolMessage(null)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {fontModalOpen ? (
            <div
              className="reader-modal-overlay"
              role="presentation"
              onClick={() => setFontModalOpen(false)}
            >
              <section
                className="reader-settings-modal"
                role="dialog"
                aria-modal="true"
                aria-label={copy.typographySettings}
                onClick={(event) => event.stopPropagation()}
              >
                <header className="reader-modal-header">
                  <div>
                    <span>{copy.tools}</span>
                    <h2>{copy.typographySettings}</h2>
                  </div>
                  <button
                    type="button"
                    aria-label={copy.close}
                    onClick={() => setFontModalOpen(false)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </header>

                <div className="reader-settings-modal__grid">
                  <div className="reader-setting-group">
                    <span>{copy.fontSize}</span>
                    <div className="reader-setting-segment">
                      {fontSizeOptions.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          data-active={
                            fontSize === option.value ? "true" : "false"
                          }
                          onClick={() => {
                            setFontSize(option.value);
                            saveTypography({ fontSize: option.value });
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="reader-setting-group">
                    <span>{copy.theme}</span>
                    <div className="reader-setting-segment">
                      {themeOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            type="button"
                            key={option.value}
                            data-active={
                              themeMode === option.value ? "true" : "false"
                            }
                            onClick={() => {
                              setThemeMode(option.value);
                              saveTypography({ themeMode: option.value });
                            }}
                          >
                            <Icon aria-hidden="true" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="reader-setting-group">
                    <span>{copy.fontFamily}</span>
                    <div className="reader-setting-segment">
                      {fontFamilyOptions.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          data-active={
                            fontFamily === option.value ? "true" : "false"
                          }
                          onClick={() => {
                            setFontFamily(option.value);
                            saveTypography({ fontFamily: option.value });
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="reader-setting-group">
                    <span>{copy.lineHeight}</span>
                    <div className="reader-setting-segment">
                      {lineHeightOptions.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          data-active={
                            lineHeight === option.value ? "true" : "false"
                          }
                          onClick={() => {
                            setLineHeight(option.value);
                            saveTypography({ lineHeight: option.value });
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="reader-setting-group">
                    <span>{copy.contentWidth}</span>
                    <div className="reader-setting-segment">
                      {contentWidthOptions.map((option) => (
                        <button
                          type="button"
                          key={option.value}
                          data-active={
                            contentWidth === option.value ? "true" : "false"
                          }
                          onClick={() => {
                            setContentWidth(option.value);
                            saveTypography({ contentWidth: option.value });
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {chapterMenuOpen ? (
            <div
              className="reader-modal-overlay reader-modal-overlay--drawer"
              role="presentation"
              onClick={() => setChapterMenuOpen(false)}
            >
              <section
                className="reader-chapter-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={copy.tableOfContents}
                onClick={(event) => event.stopPropagation()}
              >
                <header className="reader-modal-header">
                  <div>
                    <span>
                      {copy.novelLabel} #
                      {formatAppNumber(Number(chapter.novelId), locale)}
                    </span>
                    <h2>{copy.tableOfContents}</h2>
                  </div>
                  <button
                    type="button"
                    aria-label={copy.close}
                    onClick={() => setChapterMenuOpen(false)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </header>
                {renderChapterMenu("reader-chapter-menu--drawer")}
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
