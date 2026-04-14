"use client";

import { useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon, LogOut } from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar } from "../ui/avatar";
import { AppContext } from "../../providers/app-provider";
import { logoutSession } from "../../lib/auth/api";
import { clearSessionStorage } from "../../lib/auth/session-store";

/** Map pathnames to Vietnamese page titles shown in the header breadcrumb */
function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Tổng quan";
  if (pathname.startsWith("/dashboard/author")) return "Kênh tác giả";
  return "Dashboard";
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, theme, setTheme, setUser } = useContext(AppContext);

  const pageTitle = getPageTitle(pathname);

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

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[--sidebar-border] bg-[--sidebar] px-4">
      {/* Left: sidebar trigger + separator + page title */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <span className="font-medium text-sm text-[--sidebar-foreground]">
        {pageTitle}
      </span>

      {/* Right: theme toggle + user dropdown */}
      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-md p-1.5 text-[--sidebar-foreground]/70 hover:bg-[--sidebar-accent] hover:text-[--sidebar-accent-foreground] transition-colors"
        >
          {theme === "light" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[--sidebar-accent] transition-colors"
              />
            }
          >
            <Avatar
              fallback={userInitial}
              className="size-7 rounded-full"
            />
            <span className="hidden text-sm font-medium text-[--sidebar-foreground] sm:inline-block">
              {userDisplayName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="admin-shell w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-none">
                  {userDisplayName}
                </span>
                <span className="text-xs leading-none text-muted-foreground">
                  {user?.email ?? ""}
                </span>
              </div>
            </DropdownMenuLabel>
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
