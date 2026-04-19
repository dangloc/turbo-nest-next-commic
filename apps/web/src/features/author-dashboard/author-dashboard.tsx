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
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading author dashboard...</p>
      </div>
    );
  }

  if (guardState.status === "error") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm font-medium text-destructive">{guardState.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Kênh tác giả</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý truyện và chương với quyền truy cập tác giả / quản trị.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NovelManager
          selectedNovelId={selectedNovel?.id ?? null}
          currentUserId={user?.id ?? null}
          onSelectNovel={handleSelectNovel}
        />
        <ChapterManager selectedNovel={selectedNovel} />
      </div>
    </div>
  );
}
