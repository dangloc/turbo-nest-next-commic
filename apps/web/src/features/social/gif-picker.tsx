"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPublicGifs } from "../admin-settings/gif/api";
import type { GifAsset } from "../admin-settings/gif/types";
import type { CommentAttachment } from "./types";

interface GifPickerProps {
  onSelect: (attachment: CommentAttachment) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<GifAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchGifs = useCallback(async (kw: string, cat: string) => {
    setLoading(true);
    setError(null);

    const result = await fetchPublicGifs({
      keyword: kw.trim() || undefined,
      category: cat || undefined,
    });

    setLoading(false);

    if (!result.ok) {
      setError("Could not load GIFs.");
      setResults([]);
      return;
    }

    setResults(result.data);
  }, []);

  useEffect(() => {
    void fetchGifs("", "");
    inputRef.current?.focus();
  }, [fetchGifs]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchGifs(query, category), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, category, fetchGifs]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSelect(gif: GifAsset) {
    onSelect({
      type: "gif",
      url: gif.url,
      preview: gif.previewUrl,
      width: gif.width,
      height: gif.height,
      alt: gif.keyword,
    });
    onClose();
  }

  return (
    <div className="flex h-80 w-72 flex-col border border-border bg-background shadow-lg sm:w-80">
      {/* Search bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Category filter */}
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
        {["", "reactions", "greetings", "celebratory", "animals", "memes"].map(
          (cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={
                category === cat
                  ? "shrink-0 border border-violet-300 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700"
                  : "shrink-0 border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              }
            >
              {cat === "" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ),
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        )}

        {!loading && error && (
          <p className="mt-4 text-center text-xs text-destructive">{error}</p>
        )}

        {!loading && !error && results.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No GIFs found
          </p>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-3 gap-1">
            {results.map((gif) => {
              const ratio = Math.min((gif.height / gif.width) * 100, 120);
              return (
                <button
                  key={gif.id}
                  type="button"
                  className="relative overflow-hidden border border-border bg-muted transition-colors hover:border-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  style={{ paddingBottom: `${ratio}%` }}
                  onClick={() => handleSelect(gif)}
                  title={gif.keyword}
                >
                  <img
                    src={gif.previewUrl}
                    alt={gif.keyword}
                    loading="lazy"
                    decoding="async"
                    width={gif.width}
                    height={gif.height}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
