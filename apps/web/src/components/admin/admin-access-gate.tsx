"use client";

import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";

import { fetchSession } from "@/lib/auth/api";
import {
  canAccessDashboardPath,
  getDashboardLandingHref,
} from "@/lib/dashboard-access";
import { AppContext } from "@/providers/app-provider";

interface AdminAccessGateProps {
  children: React.ReactNode;
}

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { loaded, setUser, user } = useContext(AppContext);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    if (!loaded) {
      return;
    }

    let cancelled = false;
    setStatus("loading");

    void (async () => {
      const session = await fetchSession();
      if (cancelled) {
        return;
      }

      const resolvedUser =
        session.ok && session.data.user !== null
          ? session.data.user
          : session.ok
            ? null
            : user;

      if (session.ok) {
        setUser(session.data.user);
      }

      if (!resolvedUser) {
        router.replace("/auth/login");
        return;
      }

      const landingHref = getDashboardLandingHref(resolvedUser);
      if (!landingHref) {
        router.replace("/profile");
        return;
      }

      if (!canAccessDashboardPath(resolvedUser, pathname)) {
        router.replace(landingHref);
        return;
      }

      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [loaded, pathname, router, setUser]);

  if (!loaded || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium">Đang kiểm tra quyền dashboard...</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Hệ thống đang đồng bộ phiên đăng nhập và module được cấp.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
