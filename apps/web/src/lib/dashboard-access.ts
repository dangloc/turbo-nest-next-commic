import type { SessionUser } from "./api/types";

export const ADMIN_DASHBOARD_MODULES = [
  "overview",
  "users",
  "author",
  "novels",
  "terms",
  "wallets",
  "settings",
] as const;

export const AUTHOR_DASHBOARD_MODULES = [
  "author",
  "novels",
  "terms",
  "earnings",
] as const;

export type AdminDashboardModule = (typeof ADMIN_DASHBOARD_MODULES)[number];
export type AuthorDashboardModule = (typeof AUTHOR_DASHBOARD_MODULES)[number];
export type DashboardModule = AdminDashboardModule | AuthorDashboardModule;

export interface DashboardModuleOption<T extends DashboardModule> {
  value: T;
  label: string;
  description: string;
  href: string;
}

export const ADMIN_DASHBOARD_MODULE_OPTIONS: DashboardModuleOption<AdminDashboardModule>[] = [
  {
    value: "overview",
    label: "Tổng quan",
    description: "Trang chủ dashboard với số liệu vận hành.",
    href: "/dashboard",
  },
  {
    value: "users",
    label: "Users",
    description: "Quản lý danh sách user, role và quyền dashboard.",
    href: "/dashboard/users",
  },
  {
    value: "author",
    label: "Author Studio",
    description: "Màn hình kênh tác giả trong dashboard.",
    href: "/dashboard/author",
  },
  {
    value: "novels",
    label: "Novels",
    description: "Quản lý truyện, chương và upload ảnh truyện.",
    href: "/dashboard/novels",
  },
  {
    value: "terms",
    label: "Terms",
    description: "Quản lý taxonomy, tags và phân loại nội dung.",
    href: "/dashboard/terms",
  },
  {
    value: "wallets",
    label: "Wallets",
    description: "Theo dõi ví, nạp tiền và giao dịch tài chính.",
    href: "/dashboard/wallets",
  },
  {
    value: "settings",
    label: "Settings",
    description: "Cấu hình quảng cáo và thông số hệ thống liên quan.",
    href: "/dashboard/settings",
  },
];

export const AUTHOR_DASHBOARD_MODULE_OPTIONS: DashboardModuleOption<AuthorDashboardModule>[] = [
  {
    value: "author",
    label: "Kênh tác giả",
    description: "Trang đầu mối cho nhóm chức năng của tác giả.",
    href: "/dashboard/author",
  },
  {
    value: "novels",
    label: "Quản lý truyện",
    description: "Tạo, sửa, xóa truyện và chương của tác giả.",
    href: "/dashboard/novels",
  },
  {
    value: "terms",
    label: "Danh mục",
    description: "Quản lý taxonomy và phân loại dùng cho truyện.",
    href: "/dashboard/terms",
  },
  {
    value: "earnings",
    label: "Doanh thu",
    description: "Theo dõi doanh thu tác giả và lịch sử rút tiền.",
    href: "/dashboard/earnings",
  },
];

function uniqueStrings<T extends string>(
  values: readonly unknown[],
  allowed: readonly T[],
) {
  const allowedSet = new Set<string>(allowed);
  const normalized: T[] = [];

  for (const value of values) {
    if (typeof value !== "string" || !allowedSet.has(value)) {
      continue;
    }

    if (!normalized.includes(value as T)) {
      normalized.push(value as T);
    }
  }

  return normalized;
}

function normalizeConfiguredModules<T extends string>(
  value: readonly unknown[] | null | undefined,
  allowed: readonly T[],
) {
  if (value === null || value === undefined) {
    return [...allowed];
  }

  if (!Array.isArray(value)) {
    return [] as T[];
  }

  return uniqueStrings(value, allowed);
}

export function isSuperAdmin(user: SessionUser | null | undefined) {
  return user?.id === 1 || user?.isSuperAdmin === true;
}

export function getConfiguredAdminDashboardModules(
  user: Pick<SessionUser, "adminDashboardModules"> | null | undefined,
) {
  return normalizeConfiguredModules(
    user?.adminDashboardModules,
    ADMIN_DASHBOARD_MODULES,
  );
}

export function getConfiguredAuthorDashboardModules(
  user: Pick<SessionUser, "authorDashboardModules"> | null | undefined,
) {
  return normalizeConfiguredModules(
    user?.authorDashboardModules,
    AUTHOR_DASHBOARD_MODULES,
  );
}

export function getAdminDashboardModules(user: SessionUser | null | undefined) {
  if (!user) {
    return [] as AdminDashboardModule[];
  }

  if (isSuperAdmin(user)) {
    return [...ADMIN_DASHBOARD_MODULES];
  }

  if (user.role !== "ADMIN") {
    return [] as AdminDashboardModule[];
  }

  return getConfiguredAdminDashboardModules(user);
}

export function getAuthorDashboardModules(
  user: SessionUser | null | undefined,
) {
  if (!user) {
    return [] as AuthorDashboardModule[];
  }

  if (isSuperAdmin(user)) {
    return [...AUTHOR_DASHBOARD_MODULES];
  }

  if (user.role !== "AUTHOR") {
    return [] as AuthorDashboardModule[];
  }

  return getConfiguredAuthorDashboardModules(user);
}

export function hasAnyDashboardAccess(user: SessionUser | null | undefined) {
  return (
    getAdminDashboardModules(user).length > 0 ||
    getAuthorDashboardModules(user).length > 0
  );
}

function getDashboardModuleForPath(pathname: string): DashboardModule | null {
  if (pathname === "/dashboard") {
    return "overview";
  }

  if (pathname.startsWith("/dashboard/users")) {
    return "users";
  }

  if (pathname.startsWith("/dashboard/author")) {
    return "author";
  }

  if (pathname.startsWith("/dashboard/novels")) {
    return "novels";
  }

  if (pathname.startsWith("/dashboard/terms")) {
    return "terms";
  }

  if (pathname.startsWith("/dashboard/wallets")) {
    return "wallets";
  }

  if (pathname.startsWith("/dashboard/earnings")) {
    return "earnings";
  }

  if (pathname.startsWith("/dashboard/settings")) {
    return "settings";
  }

  return null;
}

export function getDashboardLandingHref(
  user: SessionUser | null | undefined,
) {
  if (!hasAnyDashboardAccess(user)) {
    return null;
  }

  for (const module of getAdminDashboardModules(user)) {
    const option = ADMIN_DASHBOARD_MODULE_OPTIONS.find(
      (item) => item.value === module,
    );
    if (option) {
      return option.href;
    }
  }

  for (const module of getAuthorDashboardModules(user)) {
    const option = AUTHOR_DASHBOARD_MODULE_OPTIONS.find(
      (item) => item.value === module,
    );
    if (option) {
      return option.href;
    }
  }

  return null;
}

export function canAccessDashboardPath(
  user: SessionUser | null | undefined,
  pathname: string,
) {
  const module = getDashboardModuleForPath(pathname);
  if (!module) {
    return false;
  }

  return (
    getAdminDashboardModules(user).includes(
      module as AdminDashboardModule,
    ) ||
    getAuthorDashboardModules(user).includes(
      module as AuthorDashboardModule,
    )
  );
}
