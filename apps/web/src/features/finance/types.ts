export type PaymentProvider = "VNPAY" | "MOMO";

export interface InitiateTopUpInput {
  amount: number;
  provider: PaymentProvider;
  reference: string;
  returnUrl?: string;
  callbackUrl?: string;
}

export interface VerifyTopUpInput {
  provider: PaymentProvider;
  reference: string;
  providerTransactionId: string;
  amount: number;
  success: boolean;
}

export interface InitiateTopUpResponse {
  status: "pending";
  provider: PaymentProvider;
  reference: string;
  amount: number;
  redirectUrl: string;
  returnUrl: string | null;
  callbackUrl: string | null;
  expiresAt: string;
}

export interface VerifyTopUpResponse {
  status: "success" | "already_processed" | "failed";
  reference: string;
  transactionId?: number;
  amountIn?: number;
  accumulated?: number;
  depositedBalance?: number;
  totalDeposited?: number;
  appliedVipLevelId?: number | null;
}

export interface WalletSummaryItem {
  id: number;
  type: string;
  label: string;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  content: string | null;
  transactionDate: string;
}

export interface WalletVipTier {
  id: number;
  name: string;
  vndValue: number;
  colorCode: string | null;
  iconUrl: string | null;
}

export interface WalletSummaryResponse {
  balances: {
    depositedBalance: number;
    earnedBalance: number;
    totalDeposited: number;
  };
  purchaseSummary: {
    recentActions: number;
    recentSpent: number;
  };
  vipTier: WalletVipTier | null;
  transactions: WalletSummaryItem[];
}

export interface PurchaseHistoryItem {
  purchasedChapterId: number;
  chapterId: number;
  chapterTitle: string;
  novelId: number;
  novelTitle: string;
  authorId: number;
  authorDisplayName: string;
  purchasedAt: string;
  pricePaid: number;
  unlockStatus: "UNLOCKED" | "UNAVAILABLE";
}

export interface PurchaseHistoryResponse {
  items: PurchaseHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PurchaseChapterInput {
  chapterId: number;
  novelId: number;
}

export interface PurchaseChapterResponse {
  status: "purchased" | "already_owned" | "free_chapter";
  chapterId: number;
  novelId: number;
  purchasedChapterId: number | null;
  transactionId?: number;
  depositedBalance?: number;
  effectivePrice?: number;
}

export interface PurchaseChapterResult {
  status: "purchased" | "already_owned" | "free_chapter" | "insufficient_balance";
  chapterId: number;
  novelId: number;
  purchasedChapterId: number | null;
  transactionId?: number;
  depositedBalance?: number;
  effectivePrice?: number;
}

export interface NovelPricingResponse {
  novelId: number;
  uploaderId: number;
  settings: {
    defaultChapterPrice: number;
    freeChapterCount: number;
    comboDiscountPct: number;
  };
  combo: {
    lockedChapterCount: number;
    originalTotalPrice: number;
    discountedTotalPrice: number;
  };
  chapters: Array<{
    id: number;
    title: string;
    chapterNumber: number;
    isLocked: boolean;
    effectivePrice: number;
    priceSource: "chapter_override" | "novel_default" | "vip_subscription";
  }>;
}

export interface ComboPurchaseResult {
  status: "purchased" | "already_owned" | "no_locked_chapters" | "insufficient_balance";
  novelId: number;
  purchasedChapterCount: number;
  chargedAmount: number;
  discountPct?: number;
  transactionId?: number;
  depositedBalance?: number;
}

export interface ComboPurchaseHistoryItem {
  transactionId: number;
  novelId: number;
  novelTitle: string;
  purchasedChapterCount: number;
  chargedAmount: number;
  purchasedAt: string;
}

export interface ComboPurchaseHistoryResponse {
  items: ComboPurchaseHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
