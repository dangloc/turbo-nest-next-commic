import { describe, expect, it } from "vitest";
import { env } from "../env";
import { resolveImageUrl } from "../image";

describe("resolveImageUrl", () => {
  it("returns null for null", () => {
    expect(resolveImageUrl(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(resolveImageUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(resolveImageUrl("")).toBeNull();
  });

  it("returns absolute http:// URLs unchanged", () => {
    expect(resolveImageUrl("http://example.com/a.jpg")).toBe("http://example.com/a.jpg");
  });

  it("returns absolute https:// URLs unchanged", () => {
    expect(resolveImageUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });

  it("prepends apiBaseUrl to relative paths starting with /", () => {
    expect(resolveImageUrl("/uploads/x.jpg")).toBe(`${env.assetBaseUrl}/uploads/x.jpg`);
  });

  it("prepends apiBaseUrl to bare relative paths without leading /", () => {
    expect(resolveImageUrl("uploads/x.jpg")).toBe(`${env.assetBaseUrl}/uploads/x.jpg`);
  });

  it("collapses inner double-slashes but preserves :// protocol separator", () => {
    const result = resolveImageUrl("//uploads///x.jpg");
    expect(result).toBe(`${env.assetBaseUrl}/uploads/x.jpg`);
    expect(result).not.toMatch(/([^:])\/\//);
  });
});
