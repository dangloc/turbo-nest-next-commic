"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../providers/app-provider";
import type { AppLocale } from "../lib/i18n";
import { logoutSession } from "../lib/auth/api";
import { clearSessionStorage } from "../lib/auth/session-store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Avatar } from "./ui/avatar";

export function Header() {
  const { user, locale, setLocale, theme, setTheme, setUser } = useContext(AppContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const copy =
    locale === "vi"
      ? {
          search: "Nhập từ khóa để tìm truyện...",
          home: "Home",
          novels: "Truyện",
          bookmark: "Bookmark",
          vip: "Đăng ký VIP",
          topup: "Nạp tiền",
          language: "Ngôn ngữ",
          category: "Thể loại truyện",
          profile: "Trang cá nhân",
          dashboard: "Bảng điều khiển",
          wallet: "Ví",
          authorStudio: "Kênh tác giả",
          logout: "Đăng xuất",
        }
      : {
          search: "Type keywords to search...",
          home: "Home",
          novels: "Novels",
          bookmark: "Bookmark",
          vip: "Join VIP",
          topup: "Top up",
          language: "Language",
          category: "Categories",
          profile: "Profile",
          dashboard: "Dashboard",
          wallet: "Wallet",
          authorStudio: "Author Studio",
          logout: "Logout",
        };

  const initials = useMemo(() => {
    const seed = user?.displayName || user?.email || "";
    return seed.trim().slice(0, 1).toUpperCase();
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    function onWindowClick(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
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
    <header className="tsh2-header">
      <div className="tsh2-header__row tsh2-header__row--top">
        <Link href="/" className="tsh2-logo" aria-label="Tusachiep home">
          <img src="/tusachiep/logo.svg" alt="TSH" />
        </Link>

        <form className="tsh2-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <Input className="tsh2-search__input" type="search" placeholder={copy.search} />
          <Button className="tsh2-search__submit" variant="pill" size="sm" aria-label="Search">
            Go
          </Button>
        </form>

        <div className="tsh2-topActions">
          <Link href="/auth/register" className="tsh2-linkBtn tsh2-vipBtn">{copy.vip}</Link>
          <Button variant="ghost" size="icon" className="tsh2-circleBtn" aria-label="Wishlist">♡</Button>
        </div>
      </div>

      <div className="tsh2-header__row tsh2-header__row--bottom">
        <div className="tsh2-leftCluster">
          <Button variant="pill" size="sm" className="tsh2-categoryBtn">{copy.category}</Button>
          <nav className="tsh2-nav" aria-label="Main">
            <Link href="/">{copy.home}</Link>
            <Link href="/">{copy.novels}</Link>
            <Link href="/">{copy.bookmark}</Link>
          </nav>
        </div>

        <div className="tsh2-rightCluster">
          <Link href="/dashboard/wallet" className="tsh2-linkBtn tsh2-topupBtn">{copy.topup}</Link>
          <Select
            value={locale}
            onValueChange={(value) => setLocale(value as AppLocale)}
            options={[
              { value: "vi", label: "VI" },
              { value: "en", label: "EN" },
            ]}
            aria-label={copy.language}
            className="tsh2-langSelect"
          />
          <Button
            type="button"
            className="tsh2-circleBtn"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
            variant="ghost"
            size="icon"
          >
            {theme === "light" ? "☀" : "☾"}
          </Button>

          <div className="tsh2-account" ref={menuRef}>
            <button
              type="button"
              className="tsh2-account__trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Avatar fallback={initials} />
            </button>

            {menuOpen ? (
              <div className="tsh2-account__menu" role="menu">
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                  {copy.dashboard}
                </Link>
                <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)}>
                  {copy.profile}
                </Link>
                <Link href="/dashboard/wallet" onClick={() => setMenuOpen(false)}>
                  {copy.wallet}
                </Link>
                {user?.role === "AUTHOR" || user?.role === "ADMIN" ? (
                  <Link href="/dashboard/author" onClick={() => setMenuOpen(false)}>
                    {copy.authorStudio}
                  </Link>
                ) : null}
                <button type="button" className="tsh2-account__logout" onClick={() => void onLogout()}>
                  {copy.logout}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
