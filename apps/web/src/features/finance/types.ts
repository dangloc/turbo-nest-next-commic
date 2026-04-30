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

export interface UserWalletHistorySummary {
  balance: number;
  kimTe: number;
  vipLevelId: number | null;
  vipLevelName: string | null;
}

export interface UserWalletTransactionRow {
  transactionId: number;
  transactionDate: string | Date;
  amountIn: number;
  amountOut: number;
  amount: number;
  direction: "CREDIT" | "DEBIT";
  type: string;
  status: "COMPLETED";
  description: string | null;
  sepayCode: string | null;
  referenceCode: string | null;
  gateway: string;
  balanceAfter: number;
}

export interface UserWalletTransactionsResponse {
  summary: UserWalletHistorySummary;
  items: UserWalletTransactionRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
  pointsSpent?: number;
  pointBalance?: number;
}

export interface PurchaseChapterResult {
  status: "purchased" | "already_owned" | "free_chapter" | "insufficient_balance";
  chapterId: number;
  novelId: number;
  purchasedChapterId: number | null;
  transactionId?: number;
  depositedBalance?: number;
  effectivePrice?: number;
  pointsSpent?: number;
  pointBalance?: number;
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
  buyer?: {
    depositedBalance: number;
    pointBalance: number;
    combinedBalance: number;
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
  pointsSpent?: number;
  pointBalance?: number;
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

export type VipPackageType =
  | "vip_2_months"
  | "vip_3_months"
  | "vip_permanent";

export interface VipPackageOption {
  packageType: VipPackageType;
  title: string;
  price: number;
  durationDays: number | null;
  displayDays: number | null;
  isPermanent: boolean;
  isActive: boolean;
}

export interface VipSubscriptionSummary {
  packageType: string;
  vipLevelId: number;
  isActive: boolean;
  purchaseDate: string;
  expiresAt: string | null;
  isPermanent: boolean;
}

export interface VipPackagesResponse {
  balance: number;
  packages: VipPackageOption[];
  subscription: VipSubscriptionSummary | null;
}

export interface PurchaseVipPackageResponse {
  status: "purchased" | "already_active";
  packageType: VipPackageType;
  transactionId?: number;
  balance: number;
  subscription: VipSubscriptionSummary;
}


export interface InitSePayCheckoutInput {
  orderInvoiceNumber: string;
  orderAmount: number;
  orderDescription?: string;
  currency?: 'VND';
  paymentMethod?: 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER';
  successUrl?: string;
  errorUrl?: string;
  cancelUrl?: string;
}

export interface InitSePayCheckoutResponse {
  checkoutUrl: string;
  checkoutFormFields: Record<string, string | number>;
}
