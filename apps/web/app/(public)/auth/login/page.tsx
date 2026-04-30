"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useContext, useEffect, useMemo, useState } from "react";
import { Input } from "@repo/ui/input";
import { extractAuthErrorMessage, loginLocal } from "../../../../src/features/auth/api";
import { validateLoginInput } from "../../../../src/features/auth/validation";
import type { FieldErrors } from "../../../../src/features/auth/types";
import { fetchSession, getGoogleLoginUrl } from "../../../../src/lib/auth/api";
import { getDashboardLandingHref } from "../../../../src/lib/dashboard-access";
import { persistSessionToStorage, persistSessionToken } from "../../../../src/lib/auth/session-store";
import { AppContext } from "../../../../src/providers/app-provider";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useContext(AppContext);
  const [message, setMessage] = useState("Dang nhap de tiep tuc.");
  const [showPassword, setShowPassword] = useState(false);
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
      setMessage("Dang nhap that bai. Vui long thu lai.");
      return;
    }

    if (!token) {
      return;
    }

    persistSessionToken(token);

    void (async () => {
      const session = await fetchSession(token);
      if (!session.ok || !session.data.user) {
        setMessage("Khong the tao phien dang nhap. Vui long thu lai.");
        return;
      }

      persistSessionToStorage(session.data.user);
      setUser(session.data.user);
      setMessage("Dang nhap thanh cong. Dang chuyen huong...");
      router.push(getDashboardLandingHref(session.data.user) ?? "/profile");
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
    router.push(getDashboardLandingHref(result.data.user) ?? "/profile");
  }

  function onFieldChange(name: "username" | "password", value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }));
  }

  return (
    <main className="auth-modal-shell">
      <section className="auth-modal-card">
        <Link className="auth-close" href="/" aria-label="Close">
          x
        </Link>

        <h1 className="auth-title">Dang nhap</h1>

        <form className="auth-modal-form" onSubmit={onSubmit}>
          <label>
            <Input
              autoComplete="username"
              name="username"
              onChange={(event) => onFieldChange("username", event.target.value)}
              placeholder="So dien thoai, ten dang nhap, email"
              value={form.username}
            />
            {errors.username ? <span className="auth-error">{errors.username}</span> : null}
          </label>

          <label className="auth-password-row">
            <Input
              autoComplete="current-password"
              name="password"
              onChange={(event) => onFieldChange("password", event.target.value)}
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
            {submitting ? "Dang dang nhap..." : "Dang nhap"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-social-row">
          <a className="auth-social auth-social--google" href={loginUrl}>
            Google
          </a>
          <button className="auth-social auth-social--facebook" type="button">
            Facebook
          </button>
        </div>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer-links">
          <p>
            Ban da co tai khoan? <Link href="/auth/register">Dang ky</Link>
          </p>
          <p>
            Ban da quen mat khau? <a href="#">Lay lai ngay</a>
          </p>
        </div>

        <p className="auth-inline-status">{message}</p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
