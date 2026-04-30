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
  transactionDate: string | Date;
  type: "CHAPTER" | "COMBO";
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
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID" | "CANCELED";
  note: string | null;
  requestedAt: string | Date;
  processedAt: string | Date | null;
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
