export type AdminWalletTransactionsSortBy =
  | "transactionDate"
  | "amountIn"
  | "username"
  | "currentBalance";

export interface AdminWalletTransactionsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: AdminWalletTransactionsSortBy;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface AdminWalletTransactionRow {
  transactionId: number;
  transactionDate: string | Date;
  username: string;
  amountIn: number;
  type: "DEPOSIT" | "PURCHASE_CHAPTER" | "PURCHASE_VIP" | "COMBO_PURCHASE";
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
