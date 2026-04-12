import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const setUserMock = vi.fn();
const loginLocalMock = vi.fn();
const registerLocalMock = vi.fn();
const getGoogleLoginUrlMock = vi.fn(() => "http://localhost:8000/auth/google");

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("../api", () => ({
  loginLocal: (...args) => loginLocalMock(...args),
  registerLocal: (...args) => registerLocalMock(...args),
  extractAuthErrorMessage: (error) => error.message,
}));

vi.mock("../../../lib/auth/api", () => ({
  fetchSession: vi.fn(),
  getGoogleLoginUrl: (...args) => getGoogleLoginUrlMock(...args),
}));

vi.mock("../../../lib/auth/session-store", () => ({
  persistSessionToken: vi.fn(),
  persistSessionToStorage: vi.fn(),
}));

import LoginPage from "../../../../app/auth/login/page";
import RegisterPage from "../../../../app/auth/register/page";
import { AppContext } from "../../../providers/app-provider";

function wrap(node) {
  return React.createElement(
    AppContext.Provider,
    {
      value: {
        user: null,
        loaded: true,
        setUser: setUserMock,
      },
    },
    node,
  );
}

describe("local auth forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("blocks invalid login submit and shows validation message", () => {
    render(wrap(React.createElement(LoginPage)));

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Username or email is required.")).toBeTruthy();
    expect(loginLocalMock).not.toHaveBeenCalled();
  });

  it("submits valid login and redirects on success", async () => {
    loginLocalMock.mockResolvedValue({
      ok: true,
      data: {
        token: "token-1",
        user: { id: 1, email: "user@example.com", role: "USER" },
      },
    });

    render(wrap(React.createElement(LoginPage)));

    fireEvent.change(screen.getByPlaceholderText("username or email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(loginLocalMock).toHaveBeenCalled();
      expect(setUserMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows duplicate identity error for registration failure", async () => {
    registerLocalMock.mockResolvedValue({
      ok: false,
      error: { status: 409, message: "This email is already in use." },
    });

    render(wrap(React.createElement(RegisterPage)));

    fireEvent.change(screen.getByPlaceholderText("reader_name"), {
      target: { value: "reader_user" },
    });
    fireEvent.change(screen.getByPlaceholderText("reader@example.com"), {
      target: { value: "reader@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("This email is already in use.")).toBeTruthy();
    });
  });

  it("keeps Google fallback CTA visible on login screen", () => {
    render(wrap(React.createElement(LoginPage)));
    expect(screen.getByRole("link", { name: "Continue with Google" })).toBeTruthy();
  });
});
