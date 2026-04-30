"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionToken, clearSessionStorage } from "@/lib/auth/session-store";
import { logoutSession } from "@/lib/auth/api";
import { resolveImageUrl } from "@/lib/image";
import { AppContext } from "@/providers/app-provider";
import { fetchProfile, type ProfileResponse } from "../profile/api";

export type ProfileSection =
  | "profile"
  | "author"
  | "bookmarks"
  | "missions"
  | "purchases"
  | "transactions"
  | "donate";

const PROFILE_NAV_ITEMS: Array<{
  id: ProfileSection;
  href: string;
  label: string;
}> = [
  { id: "profile", href: "/profile", label: "Thông tin tài khoản" },
  { id: "author", href: "/profile/author", label: "Đăng ký tác giả" },
  { id: "bookmarks", href: "/bookmarks", label: "Tủ truyện" },
  { id: "missions", href: "/profile/missions", label: "Nhiệm vụ" },
  { id: "purchases", href: "/profile/purchases", label: "Truyện đã mua" },
  {
    id: "transactions",
    href: "/profile/transactions",
    label: "Lịch sử giao dịch",
  },
  { id: "donate", href: "/profile/donate", label: "Quản lý Donate" },
];

function initials(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "U";
}

function profileAvatar(profile: ProfileResponse["profile"] | null) {
  return profile?.avatar?.trim() || null;
}

export function ProfileShell({
  active,
  children,
}: {
  active: ProfileSection;
  children: ReactNode;
}) {
  const { loaded, user, setUser } = useContext(AppContext);
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: ProfileResponse }
    | { status: "unauthenticated" }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      setState({ status: "unauthenticated" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    void (async () => {
      const result = await fetchProfile(token, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        if (result.error.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }

        setState({
          status: "error",
          message: result.error.message || "Không thể tải thông tin tài khoản.",
        });
        return;
      }

      setState({ status: "ready", data: result.data });
    })();

    return () => controller.abort();
  }, [loaded]);

  const profile = state.status === "ready" ? state.data.profile : null;
  const displayName =
    user?.displayName ||
    user?.nickname ||
    profile?.nickname ||
    profile?.email?.split("@")[0] ||
    "DANGLOC";
  const avatar = resolveImageUrl(user?.avatar ?? profileAvatar(profile));
  const accountInitials = useMemo(() => initials(displayName), [displayName]);

  async function onLogout() {
    await logoutSession();
    clearSessionStorage();
    setUser(null);
    router.push("/auth/login");
  }

  if (state.status === "unauthenticated") {
    return (
      <main className="profile-portal">
        <section className="profile-auth-card">
          <h1>Trang cá nhân</h1>
          <p>Bạn cần đăng nhập để xem khu vực tài khoản.</p>
          <Link href="/auth/login">Đăng nhập</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-portal">
      <div className="profile-portal__shell">
        <aside className="profile-sidebar" aria-label="Tài khoản">
          <div className="profile-sidebar__identity">
            <div className="profile-sidebar__avatar">
              {avatar ? (
                <img src={avatar} alt={displayName} />
              ) : (
                <span>{accountInitials}</span>
              )}
            </div>
            <div className="profile-sidebar__account">
              <strong>{displayName}</strong>
              <span>{profile?.email ?? "Đang tải..."}</span>
            </div>
          </div>

          <Link
            className="profile-sidebar__edit"
            href="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
          >
            <Edit3 aria-hidden="true" />
            Cập nhật
          </Link>

          <nav className="profile-sidebar__nav">
            {PROFILE_NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={
                  item.id === active
                    ? "profile-sidebar__link profile-sidebar__link--active"
                    : "profile-sidebar__link"
                }
              >
                {item.label}
              </Link>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="profile-sidebar__logout"
              onClick={() => void onLogout()}
            >
              Thoát
            </Button>
          </nav>
        </aside>

        <section className="profile-portal__content">
          {state.status === "error" ? (
            <p className="profile-inline-error">{state.message}</p>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}

export function ProfilePanel({
  title,
  icon,
  children,
  actions,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="profile-panel">
      <header className="profile-panel__header">
        <div>
          <h1>
            {icon ? <span aria-hidden="true">{icon}</span> : null}
            {title}
          </h1>
          <span className="profile-panel__underline" aria-hidden="true" />
        </div>
        {actions ? (
          <div className="profile-panel__actions">{actions}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
