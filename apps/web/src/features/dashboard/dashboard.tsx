"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { bootstrapDashboardSession, resolveDashboardSection } from "./api";
import type { DashboardSnapshot } from "./types";
import { AppContext } from "../../providers/app-provider";

type ViewState =
  | { status: "loading" }
  | { status: "ready"; snapshot: DashboardSnapshot }
  | { status: "error"; message: string };

export function DashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loaded, setUser } = useContext(AppContext);
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    if (!loaded) {
      return;
    }

    let canceled = false;

    void (async () => {
      const result = await bootstrapDashboardSession(user);
      if (canceled) {
        return;
      }

      if (result.kind === "redirect") {
        router.replace(result.to);
        return;
      }

      setUser(result.snapshot.user);
      setViewState({
        status: "ready",
        snapshot: result.snapshot,
      });
    })().catch(() => {
      if (!canceled) {
        setViewState({
          status: "error",
          message: "Unable to load dashboard session. Please try again.",
        });
      }
    });

    return () => {
      canceled = true;
    };
  }, [loaded, router, setUser, user]);

  const activeSection = useMemo(
    () => resolveDashboardSection(searchParams.toString()),
    [searchParams],
  );

  if (viewState.status === "loading") {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Loading dashboard...</h1>
          <p>Checking your session and preparing account modules.</p>
        </section>
      </main>
    );
  }

  if (viewState.status === "error") {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Dashboard unavailable</h1>
          <p>{viewState.message}</p>
          <Link className="action-secondary" href="/auth/login">
            Return to sign in
          </Link>
        </section>
      </main>
    );
  }

  const { snapshot } = viewState;
  const highlighted = snapshot.sections.find((section) => section.id === activeSection);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <div className="dashboard-heading-row">
          <div>
            <span className="home-kicker">Reader Dashboard</span>
            <h1>Welcome, {snapshot.user.nickname || snapshot.user.email}</h1>
            <p>Your account hub centralizes wallet, purchases, profile, and notifications.</p>
          </div>
          <Link className="action-secondary" href="/">
            Back to storefront
          </Link>
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard sections">
          {snapshot.sections.map((section) => (
            <Link
              className={
                section.id === activeSection
                  ? "dashboard-nav-link dashboard-nav-link--active"
                  : "dashboard-nav-link"
              }
              href={section.href}
              key={section.id}
            >
              <span>{section.title}</span>
              <small>{section.phaseLabel}</small>
            </Link>
          ))}
        </nav>

        <div className="dashboard-highlight" role="status">
          <strong>{highlighted?.title ?? "Wallet"} focus:</strong>{" "}
          {highlighted?.description ?? "Dashboard section summary"}
        </div>

        <div className="dashboard-grid">
          {snapshot.cards.map((card) => (
            <article className="dashboard-module-card" key={card.id}>
              <header>
                <h2>{card.title}</h2>
                <span>{card.phaseLabel}</span>
              </header>
              <p className="dashboard-module-value">{card.value}</p>
              <p>{card.subtitle}</p>
              <Link className="action-secondary" href={card.href}>
                {card.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
