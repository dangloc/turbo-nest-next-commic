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
  const { user, loaded, setUser } = useContext(AppContext);
  const [status, setStatus] = useState("Checking session...");

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const token = getSessionToken();
    if (!token) {
      setStatus("Signed out");
      return;
    }

    void (async () => {
      const session = await fetchSession(token);
      if (!session.ok || !session.data.user) {
        clearSessionStorage();
        setUser(null);
        setStatus("Signed out");
        return;
      }

      persistSessionToStorage(session.data.user);
      setUser(session.data.user);
      setStatus("Signed in");
    })();
  }, [loaded, setUser]);

  async function onLogout() {
    await logoutSession();
    clearSessionStorage();
    setUser(null);
    setStatus("Signed out");
  }

  return (
    <main className="discovery-page">
      <section className="home-shell home-shell--compact">
        <div className="home-card home-card--wide">
          <span className="home-kicker">Commic Storefront Foundation</span>
          <h1>Browse the storefront</h1>
          <p>
            Session status: <strong>{user ? "Signed in as " + user.email : status}</strong>
          </p>
          <div className="home-actions">
            {!user ? (
              <Link className="action-primary" href="/auth/login">
                Sign in or register
              </Link>
            ) : (
              <>
                <Link className="action-primary" href="/dashboard">
                  Open dashboard
                </Link>
                <button className="action-secondary" onClick={onLogout} type="button">
                  Sign out
                </button>
              </>
            )}
            <a className="action-secondary" href="http://localhost:8000/auth/google">
              Open backend auth route
            </a>
          </div>
        </div>
      </section>

      <DiscoveryFeed
        title="Discover novels"
        eyebrow="Novel Discovery"
        intro="Explore the latest storefront catalog, then drill into categories through a shareable URL."
      />
    </main>
  );
}
