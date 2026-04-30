"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext } from "react";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../ui/sidebar";
import { Avatar } from "../ui/avatar";
import { getDashboardHomeHref, getVisibleNavGroups } from "./nav-items";
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
  const navGroups = getVisibleNavGroups(user);
  const dashboardHomeHref = getDashboardHomeHref(user);

  return (
    <Sidebar collapsible="icon" className="admin-sidebar">
      <SidebarHeader className="admin-sidebar__header">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href={dashboardHomeHref}>
                  <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">
                    TS
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-[--sidebar-foreground]">
                      Tủ Sách Admin
                    </span>
                    <span className="text-xs text-[--sidebar-foreground]/60">
                      Next + Shadcn UI
                    </span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = item.isActive(pathname);
                const itemContent = (
                  <>
                    <item.icon
                      className={cn(
                        "size-4",
                        active
                          ? "text-[--sidebar-accent-foreground]"
                          : "text-[--sidebar-foreground]/70",
                      )}
                    />
                    <span>{item.title}</span>
                  </>
                );

                return (
                  <SidebarMenuItem key={item.href + item.title}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      disabled={item.disabled}
                      render={
                        item.disabled ? (
                          <button type="button" className="w-full">
                            {itemContent}
                          </button>
                        ) : (
                          <Link href={item.href}>{itemContent}</Link>
                        )
                      }
                    />
                    {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
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
