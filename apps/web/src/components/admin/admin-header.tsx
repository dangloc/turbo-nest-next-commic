"use client";

import { useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Command, Home, LogOut, Moon, Search, Settings, Sun } from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar } from "../ui/avatar";
import { AppContext } from "../../providers/app-provider";
import { logoutSession } from "../../lib/auth/api";
import { canAccessDashboardPath } from "../../lib/dashboard-access";
import { clearSessionStorage } from "../../lib/auth/session-store";
import { getDashboardHomeHref, getVisibleTopNavItems } from "./nav-items";
import { cn } from "../../lib/cn";

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, theme, setTheme, setUser } = useContext(AppContext);

  async function handleLogout() {
    await logoutSession();
    clearSessionStorage();
    setUser(null);
    router.push("/auth/login");
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  const userDisplayName = user?.nickname ?? user?.email ?? "User";
  const userInitial = (userDisplayName[0] ?? "U").toUpperCase();
  const topNavItems = getVisibleTopNavItems(user);
  const dashboardHomeHref = getDashboardHomeHref(user);
  const settingsHref = canAccessDashboardPath(user, "/dashboard/settings")
    ? "/dashboard/settings"
    : dashboardHomeHref;
  const siteHomeHref = "/";

  return (
    <header className="admin-header sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="admin-header__trigger -ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <nav className="admin-top-nav hidden items-center gap-1 lg:flex" aria-label="Admin top navigation">
        {topNavItems.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("admin-top-nav__link", active && "admin-top-nav__link--active")}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {/* <label className="admin-search hidden min-w-[260px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground md:flex">
          <Search className="size-4" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search"
            className="min-w-0 flex-1 border-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="inline-flex items-center gap-1 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Command className="size-3" /> K
          </kbd>
        </label> */}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="admin-icon-button"
        >
          {theme === "light" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </button>

        <Link
          href={settingsHref}
          className="admin-icon-button"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </Link>

        <Link
          href={siteHomeHref}
          className="admin-icon-button"
          aria-label="Về trang chủ"
          title="Về trang chủ"
        >
          <Home className="size-4" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors hover:bg-accent"
              aria-label="Mở menu tài khoản admin"
            >
              <Avatar
                fallback={userInitial}
                className="size-7 rounded-full"
              />
              <span className="hidden text-sm font-medium text-[--sidebar-foreground] sm:inline-block">
                {userDisplayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="admin-shell w-48">
            <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-none">
                  {userDisplayName}
                </span>
                <span className="text-xs leading-none text-muted-foreground">
                  {user?.email ?? ""}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push(siteHomeHref)}
              className="cursor-pointer"
            >
              <Home className="mr-2 size-4" />
              Về trang chủ
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(dashboardHomeHref)}
              className="cursor-pointer"
            >
              <Settings className="mr-2 size-4" />
              Về dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 size-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
