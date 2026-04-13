"use client";

import { useContext } from "react";
import { AppContext } from "../providers/app-provider";
import { Button } from "@repo/ui/button";
import { Select } from "@repo/ui/select";
import type { AppLocale } from "../lib/i18n";
import type { AppTheme } from "../lib/theme";

export function Header() {
  const { locale, setLocale, theme, setTheme } = useContext(AppContext);

  const copy =
    locale === "vi"
      ? {
          language: "Ngôn ngữ",
          darkMode: "Chế độ tối",
          lightMode: "Chế độ sáng",
          vietnamese: "Tiếng Việt",
          english: "English",
        }
      : {
          language: "Language",
          darkMode: "Dark mode",
          lightMode: "Light mode",
          vietnamese: "Tiếng Việt",
          english: "English",
        };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        borderBottom: "1px solid var(--line, #d7c9b2)",
        backgroundColor: "var(--panel, #fffaf2)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "0 1rem",
          height: "4rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Brand/Logo area */}
        <div
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            color: "var(--ink, #1f1c1a)",
          }}
        >
          Commic
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          {/* Language Selector */}
          <Select
            value={locale}
            onValueChange={(value) => setLocale(value as AppLocale)}
            options={[
              { value: "vi", label: copy.vietnamese },
              { value: "en", label: copy.english },
            ]}
            aria-label={copy.language}
            style={{ minWidth: "140px" }}
          />

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? copy.darkMode : copy.lightMode}
            title={theme === "light" ? copy.darkMode : copy.lightMode}
          >
            {theme === "light" ? (
              // Sun icon (for light mode)
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--ink, #1f1c1a)" }}
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              // Moon icon (for dark mode)
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: "var(--accent, #b85c2f)" }}
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
