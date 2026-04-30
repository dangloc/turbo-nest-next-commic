import type {
  AdminDashboardModule,
  AuthorDashboardModule,
} from "@/lib/dashboard-access";

export type AdminUserRole = "USER" | "AUTHOR" | "ADMIN";
export type AdminUserRoleFilter = "ALL" | AdminUserRole;
export type AdminUserStatus = "ACTIVE";

export interface AdminUsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: AdminUserRoleFilter;
}

export interface AdminUserRow {
  id: number;
  username: string | null;
  name: string;
  email: string;
  avatar: string | null;
  role: AdminUserRole;
  isSuperAdmin: boolean;
  status: AdminUserStatus;
  balance: number;
  kimTe: number;
  vipLevelId: number | null;
  vipLevelName: string | null;
  totalDeposited: number;
  earnedBalance: number;
  providerNames: string[];
  transactionCount: number;
  purchasedChapterCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminUserDetail {
  id: number;
  username: string | null;
  name: string;
  nickname: string | null;
  email: string;
  avatar: string | null;
  role: AdminUserRole;
  isSuperAdmin: boolean;
  balance: number;
  kimTe: number;
  vipLevelId: number | null;
  vipLevelName: string | null;
  totalDeposited: number;
  earnedBalance: number;
  adminDashboardModules: AdminDashboardModule[];
  authorDashboardModules: AuthorDashboardModule[];
  adminDashboardModulesOverride: AdminDashboardModule[] | null;
  authorDashboardModulesOverride: AuthorDashboardModule[] | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminUsersSummary {
  totalUsers: number;
  adminUsers: number;
  authorUsers: number;
  readerUsers: number;
  usersWithBalance: number;
}

export interface AdminUsersResponse {
  items: AdminUserRow[];
  summary: AdminUsersSummary;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UpdateAdminUserRoleInput {
  role: AdminUserRole;
}

export interface UpdateAdminUserInput {
  email?: string;
  username?: string | null;
  nickname?: string | null;
  avatar?: string | null;
}

export interface UpdateAdminUserDashboardAccessInput {
  adminDashboardModules?: AdminDashboardModule[] | null;
  authorDashboardModules?: AuthorDashboardModule[] | null;
}
