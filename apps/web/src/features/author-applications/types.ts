import type { ApiResult } from "@/lib/api/types";

export type AuthorApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AuthorApplicationRecord {
  userId: number;
  email: string;
  username: string | null;
  nickname: string | null;
  avatar: string | null;
  role: "USER" | "AUTHOR" | "ADMIN";
  penName: string;
  bio: string | null;
  facebookUrl: string | null;
  telegramUrl: string | null;
  otherPlatformName: string | null;
  otherPlatformUrl: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankBranch: string | null;
  approvalStatus: AuthorApplicationStatus;
  approvedAt: string | Date | null;
  rejectedReason: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MyAuthorApplicationResponse {
  application: AuthorApplicationRecord | null;
}

export interface AuthorApplicationsSummary {
  pending: number;
  approved: number;
  rejected: number;
  totalApplications: number;
}

export interface AuthorApplicationsListResponse {
  items: AuthorApplicationRecord[];
  summary: AuthorApplicationsSummary;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UpsertAuthorApplicationInput {
  penName: string;
  bio?: string;
  facebookUrl: string;
  telegramUrl?: string;
  otherPlatformName?: string;
  otherPlatformUrl?: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranch?: string;
}

export interface AdminAuthorApplicationsQuery {
  status?: AuthorApplicationStatus | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
}

export type AuthorApplicationsApiResult<T> = ApiResult<T>;
