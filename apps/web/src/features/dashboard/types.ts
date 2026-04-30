import type { SessionUser } from "../../lib/api/types";

export type DashboardSectionId = "wallet" | "purchases" | "profile" | "notifications";

export interface DashboardSection {
  id: DashboardSectionId;
  title: string;
  description: string;
  href: string;
  phaseLabel: string;
}

export interface DashboardSummaryCard {
  id: DashboardSectionId;
  title: string;
  value: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  phaseLabel: string;
}

export interface DashboardSnapshot {
  user: SessionUser;
  sections: DashboardSection[];
  cards: DashboardSummaryCard[];
}

export type DashboardBootstrapResult =
  | {
      kind: "ready";
      snapshot: DashboardSnapshot;
    }
  | {
      kind: "redirect";
      to: string;
      reason: "missing_token" | "invalid_session";
    };

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    id: "wallet",
    title: "Wallet",
    description: "Top-up status, balance overview, and transaction timeline.",
    href: "/dashboard?section=wallet",
    phaseLabel: "Phase 25",
  },
  {
    id: "purchases",
    title: "Purchases",
    description: "Track chapter unlocks and pending purchase actions.",
    href: "/dashboard?section=purchases",
    phaseLabel: "Phase 25",
  },
  {
    id: "profile",
    title: "Profile",
    description: "Manage nickname, account details, and personal settings.",
    href: "/dashboard?section=profile",
    phaseLabel: "Phase 26",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Unread activity feed and preference controls.",
    href: "/dashboard?section=notifications",
    phaseLabel: "Phase 27",
  },
];
