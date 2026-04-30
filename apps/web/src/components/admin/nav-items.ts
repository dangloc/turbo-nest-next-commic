import {
  BookOpen,
  HelpCircle,
  LayoutDashboard,
  Library,
  LineChart,
  Settings,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SessionUser } from "@/lib/api/types";
import {
  canAccessDashboardPath,
  getDashboardLandingHref,
  type DashboardModule,
} from "@/lib/dashboard-access";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  module?: DashboardModule;
  disabled?: boolean;
  badge?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "General",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        module: "overview",
        isActive: (p) => p === "/dashboard",
      },
      {
        title: "Users",
        href: "/dashboard/users",
        icon: Users,
        module: "users",
        isActive: (p) => p.startsWith("/dashboard/users"),
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        title: "Author Studio",
        href: "/dashboard/author",
        icon: BookOpen,
        module: "author",
        isActive: (p) =>
          p === "/dashboard/author" || p.startsWith("/dashboard/author/"),
      },
      {
        title: "Novels",
        href: "/dashboard/novels",
        icon: Library,
        module: "novels",
        isActive: (p) =>
          p === "/dashboard/novels" || p.startsWith("/dashboard/novels/"),
      },
      {
        title: "Terms",
        href: "/dashboard/terms",
        icon: Tags,
        module: "terms",
        isActive: (p) => p.startsWith("/dashboard/terms"),
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        title: "Earnings",
        href: "/dashboard/earnings",
        icon: LineChart,
        module: "earnings",
        isActive: (p) => p.startsWith("/dashboard/earnings"),
      },
      {
        title: "Wallets",
        href: "/dashboard/wallets",
        icon: Wallet,
        module: "wallets",
        isActive: (p) => p.startsWith("/dashboard/wallets"),
        badge: "Live",
      },
    ],
  },
  {
    title: "Other",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        module: "settings",
        isActive: (p) => p.startsWith("/dashboard/settings"),
      },
      {
        title: "Help Center",
        href: "/dashboard",
        icon: HelpCircle,
        isActive: () => false,
        disabled: true,
      },
    ],
  },
];

export const topNavItems = [
  {
    title: "Overview",
    href: "/dashboard",
    module: "overview" as const,
    isActive: (p: string) => p === "/dashboard",
  },
  {
    title: "Users",
    href: "/dashboard/users",
    module: "users" as const,
    isActive: (p: string) => p.startsWith("/dashboard/users"),
  },
  {
    title: "Novels",
    href: "/dashboard/novels",
    module: "novels" as const,
    isActive: (p: string) => p.startsWith("/dashboard/novels"),
  },
  {
    title: "Wallets",
    href: "/dashboard/wallets",
    module: "wallets" as const,
    isActive: (p: string) => p.startsWith("/dashboard/wallets"),
  },
  {
    title: "Earnings",
    href: "/dashboard/earnings",
    module: "earnings" as const,
    isActive: (p: string) => p.startsWith("/dashboard/earnings"),
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    module: "settings" as const,
    isActive: (p: string) => p.startsWith("/dashboard/settings"),
  },
];

export function getVisibleNavGroups(user: SessionUser | null) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.module ? canAccessDashboardPath(user, item.href) : true,
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function getVisibleTopNavItems(user: SessionUser | null) {
  return topNavItems.filter((item) =>
    item.module ? canAccessDashboardPath(user, item.href) : true,
  );
}

export function getDashboardHomeHref(user: SessionUser | null) {
  return getDashboardLandingHref(user) ?? "/profile";
}
