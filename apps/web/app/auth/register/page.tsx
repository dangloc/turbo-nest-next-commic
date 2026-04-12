"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useMemo, useState } from "react";
import { registerLocal, extractAuthErrorMessage } from "../../../src/features/auth/api";
import { validateRegisterInput } from "../../../src/features/auth/validation";
import type { FieldErrors } from "../../../src/features/auth/types";
import { persistSessionToStorage, persistSessionToken } from "../../../src/lib/auth/session-store";
import { AppContext } from "../../../src/providers/app-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useContext(AppContext);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const passwordHint = useMemo(
    () => "Password must be 8+ characters and include at least one letter and one number.",
    [],
  );

  function onChange(name: "username" | "email" | "password", value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateRegisterInput(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    const result = await registerLocal(form);
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

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card--form">
        <h1>Create account</h1>
        <p>Register with username, email, and password to unlock your reading dashboard.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            Username
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => onChange("username", event.target.value)}
              placeholder="reader_name"
              value={form.username}
            />
            {errors.username ? <span className="auth-error">{errors.username}</span> : null}
          </label>

          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="reader@example.com"
              type="email"
              value={form.email}
            />
            {errors.email ? <span className="auth-error">{errors.email}</span> : null}
          </label>

          <label>
            Password
            <input
              autoComplete="new-password"
              name="password"
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="Create a strong password"
              type="password"
              value={form.password}
            />
            <span className="auth-note">{passwordHint}</span>
            {errors.password ? <span className="auth-error">{errors.password}</span> : null}
          </label>

          {errors.form ? <p className="auth-error auth-error--block">{errors.form}</p> : null}

          <button className="auth-local-submit" disabled={submitting} type="submit">
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-links">
          <Link className="auth-home-link" href="/auth/login">
            Already have an account? Sign in
          </Link>
          <Link className="auth-home-link" href="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
