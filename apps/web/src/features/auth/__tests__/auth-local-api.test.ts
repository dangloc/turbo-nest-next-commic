import { describe, expect, it, vi } from "vitest";
import { buildLoginPayload, buildRegisterPayload, extractAuthErrorMessage } from "../api";
import { validateRegisterInput } from "../validation";

vi.mock("../../../lib/api/http", () => ({
  apiRequest: vi.fn(),
}));

describe("local auth helpers", () => {
  it("builds login payload with normalized identifier and remember me", () => {
    const payload = buildLoginPayload({
      username: "  User.Name ",
      password: "password123",
      rememberMe: true,
    });

    expect(payload).toEqual({
      username: "user.name",
      password: "password123",
      rememberMe: true,
    });
  });

  it("validates register input against backend-compatible constraints", () => {
    const invalid = validateRegisterInput({
      username: "ab",
      email: "bad-email",
      password: "short",
    });

    expect(invalid.username).toBeTruthy();
    expect(invalid.email).toBeTruthy();
    expect(invalid.password).toBeTruthy();

    const valid = validateRegisterInput({
      username: "reader_user",
      email: "reader@example.com",
      password: "password123",
    });

    expect(valid).toEqual({});
  });

  it("maps common auth API errors into actionable UI text", () => {
    expect(
      extractAuthErrorMessage({
        status: 409,
        message: "username already exists",
      }),
    ).toBe("This username is already in use.");

    expect(
      extractAuthErrorMessage({
        status: 409,
        message: "email already exists",
      }),
    ).toBe("This email is already in use.");

    expect(
      extractAuthErrorMessage({
        status: 401,
        message: "Invalid username or password",
      }),
    ).toBe("Username/email or password is incorrect.");

    expect(
      extractAuthErrorMessage({
        status: 0,
        message: "Network error",
      }),
    ).toBe("Network error. Please check your connection and try again.");
  });

  it("builds register payload with normalized username/email", () => {
    const payload = buildRegisterPayload({
      username: " Reader_User ",
      email: " USER@EXAMPLE.COM ",
      password: "password123",
    });

    expect(payload).toEqual({
      username: "reader_user",
      email: "user@example.com",
      password: "password123",
    });
  });
});
