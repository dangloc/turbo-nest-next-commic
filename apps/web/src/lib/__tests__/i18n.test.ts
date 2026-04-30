import { describe, expect, it, vi } from "vitest";
import {
  detectAppLocale,
  detectBrowserLocale,
  formatAppCurrency,
  formatAppDate,
  formatAppDateTime,
  formatAppNumber,
} from "../i18n";

describe("app locale helpers", () => {
  it("maps Vietnam time zone to Vietnamese and other zones to English", () => {
    expect(detectAppLocale("Asia/Ho_Chi_Minh")).toBe("vi");
    expect(detectAppLocale("America/New_York")).toBe("en");
    expect(detectAppLocale(null)).toBe("vi");
  });

  it("detects the browser locale from the resolved time zone", () => {
    vi.stubGlobal("window", {});
    const dateTimeFormatSpy = vi.spyOn(Intl, "DateTimeFormat").mockReturnValue({
      resolvedOptions: () => ({
        timeZone: "America/New_York",
      }),
    } as Intl.DateTimeFormat);

    expect(detectBrowserLocale()).toBe("en");

    dateTimeFormatSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("formats dates, numbers, and currency for the active locale", () => {
    expect(formatAppDate("2024-03-14T00:00:00Z", "vi")).toContain("14");
    expect(formatAppDateTime("2024-03-14T00:00:00Z", "en")).toContain("2024");
    expect(formatAppNumber(12345, "vi")).toContain("12");
    expect(formatAppCurrency(50000, "en")).toContain("50,000");
  });
});
