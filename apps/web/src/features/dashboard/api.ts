import type { SessionUser } from "../../lib/api/types";
import { fetchSession } from "../../lib/auth/api";
import {
  getSessionToken,
  loadSessionFromStorage,
  persistSessionToStorage,
} from "../../lib/auth/session-store";
import {
  DASHBOARD_SECTIONS,
  type DashboardBootstrapResult,
  type DashboardSection,
  type DashboardSummaryCard,
  type DashboardSnapshot,
} from "./types";

function toCards(sections: DashboardSection[]): DashboardSummaryCard[] {
  return sections.map((section) => {
    if (section.id === "wallet") {
      return {
        id: section.id,
        title: section.title,
        value: "Balance sync ready",
        subtitle: "Top-up, verify, and review your latest wallet transactions.",
        href: section.href,
        ctaLabel: "Open wallet",
        phaseLabel: `${section.phaseLabel} delivery`,
      };
    }

    if (section.id === "purchases") {
      return {
        id: section.id,
        title: section.title,
        value: "Purchase unlocks in wave 2",
        subtitle: section.description,
        href: section.href,
        ctaLabel: "Open section",
        phaseLabel: `${section.phaseLabel} delivery`,
      };
    }

    if (section.id === "profile") {
      return {
        id: section.id,
        title: section.title,
        value: "Profile editing ready",
        subtitle: "Update nickname/avatar metadata and review account identity details.",
        href: section.href,
        ctaLabel: "Open profile",
        phaseLabel: `${section.phaseLabel} delivery`,
      };
    }

    return {
      id: section.id,
      title: section.title,
      value: "Not configured yet",
      subtitle: section.description,
      href: section.href,
      ctaLabel: "Open section",
      phaseLabel: `${section.phaseLabel} delivery`,
    };
  });
}

export function buildDashboardSnapshot(user: SessionUser): DashboardSnapshot {
  return {
    user,
    sections: DASHBOARD_SECTIONS,
    cards: toCards(DASHBOARD_SECTIONS),
  };
}

export function resolveDashboardSection(search: string): DashboardSection["id"] {
  const value = new URLSearchParams(search).get("section");
  if (value === "wallet" || value === "purchases" || value === "profile" || value === "notifications") {
    return value;
  }

  return "wallet";
}

export async function bootstrapDashboardSession(
  currentUser: SessionUser | null,
): Promise<DashboardBootstrapResult> {
  if (currentUser) {
    return {
      kind: "ready",
      snapshot: buildDashboardSnapshot(currentUser),
    };
  }

  const stored = loadSessionFromStorage();
  if (stored.user) {
    return {
      kind: "ready",
      snapshot: buildDashboardSnapshot(stored.user),
    };
  }

  const token = stored.token ?? getSessionToken();
  if (!token) {
    return {
      kind: "redirect",
      to: "/auth/login",
      reason: "missing_token",
    };
  }

  const session = await fetchSession(token);
  if (!session.ok || !session.data.user) {
    return {
      kind: "redirect",
      to: "/auth/login",
      reason: "invalid_session",
    };
  }

  persistSessionToStorage(session.data.user);
  return {
    kind: "ready",
    snapshot: buildDashboardSnapshot(session.data.user),
  };
}
