"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { DiscoveryFeed } from "../src/features/discovery/discovery";
import { fetchSession, logoutSession } from "../src/lib/auth/api";
import {
  clearSessionStorage,
  getSessionToken,
  persistSessionToStorage,
} from "../src/lib/auth/session-store";
import { AppContext } from "../src/providers/app-provider";

export default function Home() {
  const { user, loaded, locale, setUser } = useContext(AppContext);
  const copy =
    locale === "vi"
      ? {
          kicker: "Nền tảng Commic",
          title: "Khám phá cửa hàng",
          session: "Trạng thái phiên",
          signedIn: "Đã đăng nhập",
          signedOut: "Đã đăng xuất",
          signIn: "Đăng nhập hoặc đăng ký",
          dashboard: "Mở bảng điều khiển",
          signOut: "Đăng xuất",
          backend: "Mở tuyến auth backend",
          discoveryTitle: "Khám phá truyện",
          discoveryEyebrow: "Khám phá truyện",
          discoveryIntro: "Xem danh mục mới nhất trước khi mở chi tiết theo liên kết chia sẻ.",
        }
      : {
          kicker: "Commic Storefront Foundation",
          title: "Browse the storefront",
          session: "Session status",
          signedIn: "Signed in",
          signedOut: "Signed out",
          signIn: "Sign in or register",
          dashboard: "Open dashboard",
          signOut: "Sign out",
          backend: "Open backend auth route",
          discoveryTitle: "Discover novels",
          discoveryEyebrow: "Novel Discovery",
          discoveryIntro: "Explore the latest storefront catalog, then drill into categories through a shareable URL.",
        };
  const [status, setStatus] = useState(copy.signedOut);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const token = getSessionToken();
    if (!token) {
      setStatus(copy.signedOut);
      return;
    }

    void (async () => {
      const session = await fetchSession(token);
      if (!session.ok || !session.data.user) {
        clearSessionStorage();
        setUser(null);
        setStatus(copy.signedOut);
        return;
      }

      persistSessionToStorage(session.data.user);
      setUser(session.data.user);
      setStatus(copy.signedIn);
    })();
  }, [copy.signedIn, copy.signedOut, loaded, setUser]);

  async function onLogout() {
    await logoutSession();
    clearSessionStorage();
    setUser(null);
    setStatus(copy.signedOut);
  }

  return (
    <main className="discovery-page">
      <section className="home-shell home-shell--compact">
        <div className="home-card home-card--wide">
          <span className="home-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>
            {copy.session}: <strong>{user ? copy.signedIn + " as " + user.email : status}</strong>
          </p>
          <div className="home-actions">
            {!user ? (
              <Link className="action-primary" href="/auth/login">
                {copy.signIn}
              </Link>
            ) : (
              <>
                <Link className="action-primary" href="/dashboard">
                  {copy.dashboard}
                </Link>
                <button className="action-secondary" onClick={onLogout} type="button">
                  {copy.signOut}
                </button>
              </>
            )}
            <a className="action-secondary" href="http://localhost:8000/auth/google">
              {copy.backend}
            </a>
          </div>
        </div>
      </section>

      <DiscoveryFeed
        title={copy.discoveryTitle}
        eyebrow={copy.discoveryEyebrow}
        intro={copy.discoveryIntro}
      />
    </main>
  );
}