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

export interface WalletSummaryResponse {
  balances: {
    depositedBalance: number;
    earnedBalance: number;
    totalDeposited: number;
  };
  transactions: WalletSummaryItem[];
}

export interface PurchaseChapterInput {
  chapterId: number;
  novelId: number;
  price: number;
}

export interface PurchaseChapterResponse {
  status: "purchased" | "already_owned";
  chapterId: number;
  novelId: number;
  purchasedChapterId: number | null;
  transactionId?: number;
  depositedBalance?: number;
}

export interface PurchaseChapterResult {
  status: "purchased" | "already_owned" | "insufficient_balance";
  chapterId: number;
  novelId: number;
  purchasedChapterId: number | null;
  transactionId?: number;
  depositedBalance?: number;
}
