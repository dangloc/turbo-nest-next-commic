"use client";

import Image from "next/image";
import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppContext } from "../providers/app-provider";
import { logoutSession } from "../lib/auth/api";
import { canAccessDashboardPath, getDashboardLandingHref } from "../lib/dashboard-access";
import { clearSessionStorage } from "../lib/auth/session-store";
import { resolveImageUrl } from "../lib/image";
import { Avatar } from "./ui/avatar";

export function Header() {
  const { user, locale, setUser } = useContext(AppContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const copy =
    locale === "vi"
      ? {
          home: "Trang Chủ",
          find: "Tìm truyện",
          recommended: "Bạn đọc đề cử",
          library: "Tủ Truyện",
          profile: "Trang cá nhân",
          dashboard: "Bảng điều khiển",
          vip_package: "Gói VIP",
          authorStudio: "Kênh tác giả",
          logout: "Đăng xuất",
          login: "Đăng nhập",
        }
      : {
          home: "Home",
          find: "Find novels",
          recommended: "Reader picks",
          library: "Library",
          profile: "Profile",
          dashboard: "Dashboard",
          vip_package: "VIP Package",
          authorStudio: "Author Studio",
          logout: "Logout",
          login: "Sign in",
        };

  const displayName = useMemo(() => {
    return user?.displayName || user?.nickname || user?.email?.split("@")[0] || "User";
  }, [user?.displayName, user?.email, user?.nickname]);
  const dashboardHref = getDashboardLandingHref(user);
  const canAccessAuthorStudio = canAccessDashboardPath(user, "/dashboard/author");

  const initials = useMemo(() => {
    return displayName.trim().slice(0, 1).toUpperCase() || "U";
  }, [displayName]);
  const avatarUrl = useMemo(() => resolveImageUrl(user?.avatar), [user?.avatar]);

  const readerPicksActive =
    pathname === "/novels" && searchParams.get("sortBy") === "recommendationVotes";

  const navItems = [
    { href: "/", label: copy.home, exact: true },
    { href: "/novels", label: copy.find, active: pathname === "/novels" && !readerPicksActive },
    {
      href: "/novels?sortBy=recommendationVotes&sortDir=desc",
      label: copy.recommended,
      active: readerPicksActive,
    },
    { href: "/bookmarks", label: copy.library },
  ];

  useEffect(() => {
    function onWindowClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onWindowKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("click", onWindowClick);
    window.addEventListener("keydown", onWindowKeydown);

    return () => {
      window.removeEventListener("click", onWindowClick);
      window.removeEventListener("keydown", onWindowKeydown);
    };
  }, []);

  async function onLogout() {
    await logoutSession();
    clearSessionStorage();
    setUser(null);
    setMenuOpen(false);
    router.push("/auth/login");
  }

  return (
    <header className="tsh3-header">
      <div className="tsh3-shell">
        <Link href="/" className="tsh3-logo" aria-label="Tusachiep home">
          <Image
            src="/tusachiep/logo.svg"
            alt="Tủ Sách Hiệp"
            width={118}
            height={36}
            priority
          />
        </Link>

        <nav className="tsh3-nav" aria-label="Main">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : "active" in item
                ? item.active
                : pathname.startsWith(item.href);

            return (
              <Link
                href={item.href}
                key={item.href}
                className={active ? "tsh3-nav__link tsh3-nav__link--active" : "tsh3-nav__link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user ? (
          <div className="tsh3-account" ref={menuRef}>
            <button
              type="button"
              className="tsh3-account__trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              <Avatar
                fallback={initials}
                src={avatarUrl}
                alt={displayName}
                className="tsh3-account__avatar"
              />
              <span>{displayName}</span>
            </button>

            {menuOpen ? (
              <div className="tsh3-account__menu" role="menu">
                {dashboardHref ? (
                  <Link href={dashboardHref} onClick={() => setMenuOpen(false)}>
                    {copy.dashboard}
                  </Link>
                ) : null}
                <Link href="/profile" onClick={() => setMenuOpen(false)}>
                  {copy.profile}
                </Link>
                <Link href="/vip" onClick={() => setMenuOpen(false)}>
                  {copy.vip_package}
                </Link>
                {canAccessAuthorStudio ? (
                  <Link href="/dashboard/author" onClick={() => setMenuOpen(false)}>
                    {copy.authorStudio}
                  </Link>
                ) : null}
                <button type="button" className="tsh3-account__logout" onClick={() => void onLogout()}>
                  {copy.logout}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/auth/login" className="tsh3-login">
            {copy.login}
          </Link>
        )}
      </div>
    </header>
  );
}
