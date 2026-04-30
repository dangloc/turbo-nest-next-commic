import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
}));

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ toString: () => "section=profile" }),
}));

const bootstrapDashboardSessionMock = vi.fn();
const resolveDashboardSectionMock = vi.fn();
vi.mock("../api", () => ({
  bootstrapDashboardSession: (...args) => bootstrapDashboardSessionMock(...args),
  resolveDashboardSection: (...args) => resolveDashboardSectionMock(...args),
}));

const fetchProfileMock = vi.fn();
const updateProfileMock = vi.fn();
const changePasswordMock = vi.fn();
vi.mock("../../profile/api", () => ({
  fetchProfile: (...args) => fetchProfileMock(...args),
  updateProfile: (...args) => updateProfileMock(...args),
  changePassword: (...args) => changePasswordMock(...args),
}));

vi.mock("../../finance/api", () => ({
  fetchWalletSummary: vi.fn(),
  fetchNovelPricing: vi.fn(),
  purchaseNovelCombo: vi.fn(),
  initiateTopUp: vi.fn(),
  verifyTopUp: vi.fn(),
}));

const persistSessionToStorageMock = vi.fn();
vi.mock("../../lib/auth/session-store", () => ({
  getSessionToken: () => undefined,
  persistSessionToStorage: (...args) => persistSessionToStorageMock(...args),
}));

vi.mock("../notifications/notifications", () => ({
  default: () => React.createElement("div", null, "Notifications"),
}));

import { DashboardView } from "../dashboard";
import { AppContext } from "../../../providers/app-provider";

const setUserMock = vi.fn();

function renderDashboard() {
  return render(
    React.createElement(
      AppContext.Provider,
      {
        value: {
          loaded: true,
          user: {
            id: 1,
            email: "reader@example.com",
            nickname: "Reader",
            role: "USER",
          },
          setUser: setUserMock,
        },
      },
      React.createElement(DashboardView),
    ),
  );
}

describe("Dashboard profile security DOM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveDashboardSectionMock.mockReturnValue("profile");
    bootstrapDashboardSessionMock.mockResolvedValue({
      kind: "ready",
      snapshot: {
        user: {
          id: 1,
          email: "reader@example.com",
          nickname: "Reader",
          role: "USER",
        },
        sections: [
          {
            id: "profile",
            title: "Profile",
            description: "Account profile",
            href: "/dashboard?section=profile",
            phaseLabel: "Phase 36",
          },
        ],
        cards: [],
      },
    });

    fetchProfileMock.mockResolvedValue({
      ok: true,
      data: {
        profile: {
          id: 1,
          email: "reader@example.com",
          role: "USER",
          nickname: "Reader",
          avatar: null,
          updatedAt: "2026-04-12T10:00:00.000Z",
        },
        session: {
          tokenSource: "bearer",
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads profile values and submits identity update", async () => {
    updateProfileMock.mockResolvedValue({
      ok: true,
      data: {
        profile: {
          id: 1,
          email: "reader+new@example.com",
          role: "USER",
          nickname: "Reader Prime",
          avatar: null,
          updatedAt: "2026-04-12T10:05:00.000Z",
        },
        session: {
          tokenSource: "bearer",
        },
      },
    });

    const view = renderDashboard();
    const ui = within(view.container);

    await ui.findByDisplayValue("Reader");
    fireEvent.change(ui.getByPlaceholderText("Enter display name"), {
      target: { value: "Reader Prime" },
    });
    fireEvent.change(ui.getByPlaceholderText("reader@example.com"), {
      target: { value: "reader+new@example.com" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith(
        {
          displayName: "Reader Prime",
          email: "reader+new@example.com",
          avatar: "",
        },
        undefined,
      );
      expect(setUserMock).toHaveBeenCalled();
    });
  });

  it("blocks password submit when confirmation does not match", async () => {
    const view = renderDashboard();
    const ui = within(view.container);

    await ui.findByText("Password security");
    fireEvent.change(ui.getByPlaceholderText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(ui.getByPlaceholderText("New password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(ui.getByPlaceholderText("Confirm new password"), {
      target: { value: "different123" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Change password" }));

    expect(changePasswordMock).not.toHaveBeenCalled();
    expect(ui.getByText("New password and confirmation do not match.")).toBeTruthy();
  });

  it("shows password API error then success and clears fields", async () => {
    changePasswordMock
      .mockResolvedValueOnce({
        ok: false,
        error: {
          status: 401,
          message: "Invalid current password",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { success: true },
      });

    const view = renderDashboard();
    const ui = within(view.container);

    await ui.findByText("Password security");
    fireEvent.change(ui.getByPlaceholderText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(ui.getByPlaceholderText("New password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(ui.getByPlaceholderText("Confirm new password"), {
      target: { value: "newpass123" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Change password" }));

    await ui.findByText("Invalid current password");

    fireEvent.change(ui.getByPlaceholderText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(ui.getByPlaceholderText("New password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(ui.getByPlaceholderText("Confirm new password"), {
      target: { value: "newpass123" },
    });
    fireEvent.click(ui.getByRole("button", { name: "Change password" }));

    await ui.findByText("Password updated successfully.");

    expect(ui.getByPlaceholderText("Current password").value).toBe("");
    expect(ui.getByPlaceholderText("New password").value).toBe("");
    expect(ui.getByPlaceholderText("Confirm new password").value).toBe("");
  });
});
