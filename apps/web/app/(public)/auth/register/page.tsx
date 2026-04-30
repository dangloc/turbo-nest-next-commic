"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";
import { Input } from "@repo/ui/input";
import { extractAuthErrorMessage, registerLocal } from "../../../../src/features/auth/api";
import type { FieldErrors } from "../../../../src/features/auth/types";
import { validateRegisterInput } from "../../../../src/features/auth/validation";
import { getDashboardLandingHref } from "../../../../src/lib/dashboard-access";
import { persistSessionToStorage, persistSessionToken } from "../../../../src/lib/auth/session-store";
import { AppContext } from "../../../../src/providers/app-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useContext(AppContext);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

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
    router.push(getDashboardLandingHref(result.data.user) ?? "/profile");
  }

  return (
    <main className="auth-modal-shell">
      <section className="auth-modal-card">
        <Link className="auth-close" href="/" aria-label="Close">
          x
        </Link>

        <h1 className="auth-title">Dang ky</h1>

        <form className="auth-modal-form" onSubmit={onSubmit}>
          <label>
            <Input
              name="fullName"
              onChange={(event) => onChange("username", event.target.value)}
              placeholder="Ten day du"
              value={form.username}
            />
            {errors.username ? <span className="auth-error">{errors.username}</span> : null}
          </label>

          <label>
            <Input
              autoComplete="email"
              name="email"
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="Email"
              type="email"
              value={form.email}
            />
            {errors.email ? <span className="auth-error">{errors.email}</span> : null}
          </label>

          <label>
            <Input
              autoComplete="username"
              name="username"
              onChange={(event) => onChange("username", event.target.value)}
              placeholder="So dien thoai, ten dang nhap"
              value={form.username}
            />
          </label>

          <label className="auth-password-row">
            <Input
              autoComplete="new-password"
              name="password"
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="Mat khau"
              type={showPassword ? "text" : "password"}
              value={form.password}
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
            {errors.password ? <span className="auth-error">{errors.password}</span> : null}
          </label>

          {errors.form ? <p className="auth-error auth-error--block">{errors.form}</p> : null}

          <button className="auth-gradient-submit" disabled={submitting} type="submit">
            {submitting ? "Dang tao tai khoan..." : "Dang ky"}
          </button>
        </form>

        <div className="auth-footer-links auth-footer-links--single">
          <p>
            Tro ve <Link href="/auth/login">Dang nhap</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
