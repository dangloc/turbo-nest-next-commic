"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext } from "react";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../ui/sidebar";
import { Avatar } from "../ui/avatar";
import { navItems } from "./nav-items";
import { AppContext } from "../../providers/app-provider";
import { logoutSession } from "../../lib/auth/api";
import { clearSessionStorage } from "../../lib/auth/session-store";
import { cn } from "../../lib/cn";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useContext(AppContext);

  async function handleLogout() {
    await logoutSession();
    clearSessionStorage();
    setUser(null);
    router.push("/auth/login");
  }

  const userDisplayName = user?.nickname ?? user?.email ?? "User";
  const userInitial = (userDisplayName[0] ?? "U").toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[--sidebar-primary] text-[--sidebar-primary-foreground] text-sm font-bold">
                    C
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-[--sidebar-foreground]">
                      Commic
                    </span>
                    <span className="text-xs text-[--sidebar-foreground]/60">
                      Dashboard
                    </span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const active = item.isActive(pathname);
            return (
              <SidebarMenuItem key={item.href + item.title}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.title}
                  render={
                    <Link href={item.href}>
                      <item.icon
                        className={cn(
                          "size-4",
                          active
                            ? "text-[--sidebar-primary]"
                            : "text-[--sidebar-foreground]/60",
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2"
                  type="button"
                >
                  <Avatar fallback={userInitial} className="size-8 rounded-full" />
                  <div className="flex flex-col gap-0.5 leading-none text-left min-w-0">
                    <span className="truncate text-sm font-medium text-[--sidebar-foreground]">
                      {userDisplayName}
                    </span>
                    <span className="truncate text-xs text-[--sidebar-foreground]/60">
                      {user?.email ?? ""}
                    </span>
                  </div>
                  <LogOut className="ml-auto size-4 shrink-0 text-[--sidebar-foreground]/60" />
                </button>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
