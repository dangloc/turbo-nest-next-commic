import { NextRequest, NextResponse } from "next/server";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

export async function GET(request: NextRequest) {
  if (!GIPHY_API_KEY) {
    return NextResponse.json(
      { error: "Giphy API not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const query = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 50);
  const offset = Number(searchParams.get("offset") || "0");

  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(limit),
    offset: String(offset),
    rating: "pg-13",
    lang: "en",
  });

  const isSearch = action === "search" && query.trim();
  if (isSearch) params.set("q", query.trim());

  const giphyUrl = `${GIPHY_BASE}/${isSearch ? "search" : "trending"}?${params.toString()}`;

  try {
    const res = await fetch(giphyUrl, {
      next: { revalidate: isSearch ? 30 : 120 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Giphy request failed" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch GIFs" },
      { status: 500 },
    );
  }
}
