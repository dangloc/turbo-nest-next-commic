import { LayoutDashboard, BookOpen, Wallet, Library, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

export const navItems: NavItem[] = [
  {
    title: "Tổng quan",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (p) => p === "/dashboard",
  },
  {
    title: "Kênh tác giả",
    href: "/dashboard/author",
    icon: BookOpen,
    isActive: (p) =>
      p === "/dashboard/author" || p.startsWith("/dashboard/author/"),
  },
  {
    title: "Quản lý truyện",
    href: "/dashboard/novels",
    icon: Library,
    isActive: (p) =>
      p === "/dashboard/novels" || p.startsWith("/dashboard/novels/"),
  },
  {
    title: "Phân loại",
    href: "/dashboard/terms",
    icon: Tags,
    isActive: (p) => p === "/dashboard/terms",
  },
  {
    title: "Ví tiền",
    href: "/dashboard",
    icon: Wallet,
    isActive: () => false,
  },
];
