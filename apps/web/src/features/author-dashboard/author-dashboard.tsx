"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../../providers/app-provider";
import { bootstrapAuthorDashboardSession } from "./api";

type GuardState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

export function AuthorDashboardView() {
  const router = useRouter();
  const { user, loaded, setUser } = useContext(AppContext);
  const [guardState, setGuardState] = useState<GuardState>({ status: "loading" });

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
          Trang này đã chuyển sang{" "}
          <a href="/dashboard/novels" className="underline text-primary">
            Quản lý truyện
          </a>
          .
        </p>
      </div>
    </div>
  );
}
