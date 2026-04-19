import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const bootstrapAuthorDashboardSessionMock = vi.fn();
vi.mock("../api", async () => {
  const actual = await vi.importActual("../api");
  return {
    ...actual,
    bootstrapAuthorDashboardSession: (...args) => bootstrapAuthorDashboardSessionMock(...args),
  };
});

vi.mock("../components/chapter-manager", () => ({
  ChapterManager: () => React.createElement("div", null, "Chapter manager"),
}));

import { AuthorDashboardView } from "../author-dashboard";
import { AppContext } from "../../../providers/app-provider";
import { createNovel } from "../api";

function renderWithContext(user, loaded = true) {
  return render(
    <AppContext.Provider
      value={{
        user,
        loaded,
        locale: "vi",
        setLocale: vi.fn(),
        setUser: vi.fn(),
        theme: "light",
        setTheme: vi.fn(),
      }}
    >
      <AuthorDashboardView />
    </AppContext.Provider>,
  );
}

describe("Author dashboard route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("allows AUTHOR and renders migration notice", async () => {
    bootstrapAuthorDashboardSessionMock.mockResolvedValue({
      kind: "ready",
      user: { id: 1, email: "a@x.com", role: "AUTHOR" },
    });

    renderWithContext({ id: 1, email: "a@x.com", role: "AUTHOR" });

    await screen.findByText("Kênh tác giả");
    expect(screen.getByRole("link", { name: "Quản lý truyện" })).toBeTruthy();
  });

  it("redirects unauthorized user", async () => {
    bootstrapAuthorDashboardSessionMock.mockResolvedValue({
      kind: "redirect",
      to: "/dashboard",
      reason: "forbidden_role",
    });

    renderWithContext({ id: 2, email: "u@x.com", role: "USER" });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
