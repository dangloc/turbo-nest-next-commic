"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../../providers/app-provider";
import { bootstrapAuthorDashboardSession } from "./api";
import { ChapterManager } from "./components/chapter-manager";
import { NovelManager } from "./components/novel-manager";
import type { NovelRecord } from "./types";

type GuardState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

export function AuthorDashboardView() {
  const router = useRouter();
  const { user, loaded, setUser } = useContext(AppContext);
  const [guardState, setGuardState] = useState<GuardState>({ status: "loading" });
  const [selectedNovel, setSelectedNovel] = useState<NovelRecord | null>(null);
  const handleSelectNovel = useCallback((novel: NovelRecord | null) => {
    setSelectedNovel(novel);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const session = await bootstrapAuthorDashboardSession(user);
      if (cancelled) {
        return;
      }

      if (session.kind === "redirect") {
        router.replace(session.to);
        return;
      }

      setUser(session.user);
      setGuardState({ status: "ready" });
    })().catch(() => {
      if (!cancelled) {
        setGuardState({
          status: "error",
          message: "Unable to load author dashboard. Please retry.",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loaded, router, setUser, user]);

  if (!loaded || guardState.status === "loading") {
    return (
      <main className="mx-auto w-[min(1200px,calc(100%-32px))] py-8">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <p className="text-sm text-[var(--muted)]">Loading author dashboard...</p>
        </div>
      </main>
    );
  }

  if (guardState.status === "error") {
    return (
      <main className="mx-auto w-[min(1200px,calc(100%-32px))] py-8">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <p className="text-sm font-medium text-red-600">{guardState.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-[min(1200px,calc(100%-32px))] gap-4 py-8">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-sm">
        <p className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent-strong)]">
          Author Studio
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Content Management Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage novels and chapter pipelines with secured author/admin access.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <NovelManager
          selectedNovelId={selectedNovel?.id ?? null}
          currentUserId={user?.id ?? null}
          onSelectNovel={handleSelectNovel}
        />
        <ChapterManager selectedNovel={selectedNovel} />
      </div>
    </main>
  );
}
