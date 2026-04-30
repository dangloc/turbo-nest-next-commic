export type PaymentProvider = 'VNPAY' | 'MOMO';

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

export interface WalletSummaryItem {
  id: number;
  type: string;
  label: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  content: string | null;
  transactionDate: Date;
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

export interface UserWalletTransactionsQuery {
  page?: number;
  pageSize?: number;
}

export interface UserWalletHistorySummary {
  balance: number;
  kimTe: number;
  vipLevelId: number | null;
  vipLevelName: string | null;
}

export interface UserWalletTransactionRow {
  transactionId: number;
  transactionDate: Date;
  amountIn: number;
  amountOut: number;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  type: string;
  status: 'COMPLETED';
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

export interface ChapterPurchaseInput {
  chapterId: number;
  novelId: number;
  price: number;
}

export interface ComboPurchaseInput {
  novelId: number;
}

export type VipPackageType = 'vip_2_months' | 'vip_3_months' | 'vip_permanent';

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
  purchaseDate: Date;
  expiresAt: Date | null;
  isPermanent: boolean;
}

export interface VipPackagesResponse {
  balance: number;
  packages: VipPackageOption[];
  subscription: VipSubscriptionSummary | null;
}

export interface PurchaseVipPackageResponse {
  status: 'purchased' | 'already_active';
  packageType: VipPackageType;
  transactionId?: number;
  balance: number;
  subscription: VipSubscriptionSummary;
}

export interface PurchaseHistoryQuery {
  page?: number;
  pageSize?: number;
}

export interface PurchaseHistoryItem {
  purchasedChapterId: number;
  chapterId: number;
  chapterTitle: string;
  novelId: number;
  novelTitle: string;
  authorId: number;
  authorDisplayName: string;
  purchasedAt: Date;
  pricePaid: number;
  unlockStatus: 'UNLOCKED' | 'UNAVAILABLE';
}

export interface PurchaseHistoryResponse {
  items: PurchaseHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ComboPurchaseHistoryItem {
  transactionId: number;
  novelId: number;
  novelTitle: string;
  purchasedChapterCount: number;
  chargedAmount: number;
  purchasedAt: Date;
}

export interface ComboPurchaseHistoryResponse {
  items: ComboPurchaseHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateWithdrawalRequestInput {
  amount: number;
  note?: string;
}

export interface ListWithdrawalRequestsQuery {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELED';
  authorProfileId?: number;
  page?: number;
  pageSize?: number;
}

export type WithdrawalDecision = 'approve' | 'reject';

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

export type AdminWalletTransactionsSortBy =
  | 'transactionDate'
  | 'amountIn'
  | 'username'
  | 'currentBalance';

export interface AdminWalletTransactionsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: AdminWalletTransactionsSortBy;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface AdminWalletTransactionRow {
  transactionId: number;
  transactionDate: Date;
  username: string;
  amountIn: number;
  type: 'DEPOSIT' | 'PURCHASE_CHAPTER' | 'PURCHASE_VIP' | 'COMBO_PURCHASE';
  sepayCode: string | null;
  referenceCode: string | null;
  gateway: string;
  currentBalance: number;
  vipLevelName: string | null;
}

export interface AdminWalletTransactionsSummary {
  totalRevenue: number;
  totalUsersWithBalance: number;
  totalTransactions: number;
}

export interface AdminWalletTransactionsResponse {
  items: AdminWalletTransactionRow[];
  summary: AdminWalletTransactionsSummary;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuthorEarningsSummary {
  availableBalance: number;
  pendingWithdrawalAmount: number;
  lifetimeRevenue: number;
  chapterSalesCount: number;
  comboSalesCount: number;
  totalSalesCount: number;
}

export interface AuthorEarningsSaleItem {
  transactionId: number;
  transactionDate: Date;
  type: 'CHAPTER' | 'COMBO';
  amount: number;
  novelId: number | null;
  novelTitle: string | null;
  chapterId: number | null;
  chapterTitle: string | null;
  buyerId: number | null;
  buyerDisplayName: string | null;
}

export interface AuthorEarningsWithdrawalItem {
  id: number;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELED';
  note: string | null;
  requestedAt: Date;
  processedAt: Date | null;
}

export interface AuthorEarningsResponse {
  authorProfile: {
    id: number;
    penName: string | null;
    approvalStatus: string;
    rejectedReason: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankName: string | null;
    bankBranch: string | null;
  } | null;
  summary: AuthorEarningsSummary;
  recentSales: AuthorEarningsSaleItem[];
  withdrawalRequests: AuthorEarningsWithdrawalItem[];
}
