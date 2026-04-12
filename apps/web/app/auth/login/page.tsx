"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { extractAuthErrorMessage, loginLocal } from "../../../src/features/auth/api";
import { validateLoginInput } from "../../../src/features/auth/validation";
import type { FieldErrors } from "../../../src/features/auth/types";
import { fetchSession, getGoogleLoginUrl } from "../../../src/lib/auth/api";
import { persistSessionToStorage, persistSessionToken } from "../../../src/lib/auth/session-store";
import { AppContext } from "../../../src/providers/app-provider";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useContext(AppContext);
  const [message, setMessage] = useState("Sign in to continue to your reader dashboard.");
  const [form, setForm] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const loginUrl = useMemo(() => getGoogleLoginUrl(), []);

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setMessage("Sign in failed. Please try again.");
      return;
    }

    if (!token) {
      return;
    }

    persistSessionToken(token);

    void (async () => {
      const session = await fetchSession(token);
      if (!session.ok || !session.data.user) {
        setMessage("Session setup failed. Please sign in again.");
        return;
      }

      persistSessionToStorage(session.data.user);
      setUser(session.data.user);
      setMessage("Sign in complete. Redirecting to dashboard...");
      router.push("/dashboard");
    })();
  }, [searchParams, setUser, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateLoginInput(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    const result = await loginLocal(form);
    if (!result.ok) {
      setErrors({ form: extractAuthErrorMessage(result.error) });
      setSubmitting(false);
      return;
    }

    persistSessionToken(result.data.token);
    persistSessionToStorage(result.data.user);
    setUser(result.data.user);
    router.push("/dashboard");
  }

  function onFieldChange(name: "username" | "password", value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--form">
        <h1>Welcome back</h1>
        <p>{message}</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Username or email
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => onFieldChange("username", event.target.value)}
              placeholder="username or email"
              value={form.username}
            />
            {errors.username ? <span className="auth-error">{errors.username}</span> : null}
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => onFieldChange("password", event.target.value)}
              placeholder="password"
              type="password"
              value={form.password}
            />
            {errors.password ? <span className="auth-error">{errors.password}</span> : null}
          </label>

          <label className="auth-remember">
            <input
              checked={form.rememberMe}
              name="rememberMe"
              onChange={(event) => setForm((current) => ({ ...current, rememberMe: event.target.checked }))}
              type="checkbox"
            />
            Keep me signed in for 30 days
          </label>

          {errors.form ? <p className="auth-error auth-error--block">{errors.form}</p> : null}

          <button className="auth-local-submit" disabled={submitting} type="submit">
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <a className="auth-google" href={loginUrl}>
          Continue with Google
        </a>

        <div className="auth-links">
          <Link className="auth-home-link" href="/auth/register">
            Create a local account
          </Link>
          <Link className="auth-home-link" href="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
