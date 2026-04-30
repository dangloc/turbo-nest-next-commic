import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { AdminAccessGate } from "./admin-access-gate";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * AdminLayout — async server component.
 *
 * Reads the sidebar_state cookie to hydrate the initial open/collapsed state
 * without a layout shift. The ShadCN SidebarProvider writes back to this cookie
 * on every toggle, so state persists across page loads.
 *
 * Wraps everything in .admin-shell for CSS variable scoping (see globals.css).
 * The .admin-shell class gates all --sidebar-* and ShadCN --background/--foreground
 * variables, preventing them from leaking onto public-site pages.
 */
export async function AdminLayout({ children }: AdminLayoutProps) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <div className="admin-shell min-h-screen bg-background text-foreground">
      <SidebarProvider defaultOpen={defaultOpen}>
        <AdminAccessGate>
          <AdminSidebar />
          <SidebarInset className="admin-main">
            <AdminHeader />
            <div className="admin-main__content flex flex-1 flex-col gap-4 p-4 md:p-6">
              {children}
            </div>
          </SidebarInset>
        </AdminAccessGate>
      </SidebarProvider>
    </div>
  );
}
