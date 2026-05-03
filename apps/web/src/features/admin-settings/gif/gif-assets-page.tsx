"use client";

import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  createGifAsset,
  deleteGifAsset,
  fetchAdminGifs,
  toggleGifAsset,
} from "./api";
import {
  GIF_CATEGORIES,
  type CreateGifAssetInput,
  type GifAsset,
} from "./types";

const EMPTY_FORM: CreateGifAssetInput = {
  url: "",
  previewUrl: "",
  keyword: "",
  category: "reactions",
  width: 200,
  height: 200,
};

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isActive
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-gray-50 text-gray-500 border border-gray-200",
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function ImagePreview({ src, alt }: { src: string; alt?: string }) {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  useEffect(() => {
    if (!src) { setStatus("idle"); return; }
    setStatus("idle");
    const img = new Image();
    img.onload = () => setStatus("ok");
    img.onerror = () => setStatus("err");
    img.src = src;
  }, [src]);

  if (!src) return null;

  return (
    <div className="mt-2 h-24 w-24 overflow-hidden border border-border bg-muted flex items-center justify-center">
      {status === "ok" && (
        <img src={src} alt={alt ?? "preview"} className="h-full w-full object-contain" />
      )}
      {status === "idle" && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {status === "err" && (
        <span className="text-[10px] text-destructive text-center px-1">
          Failed to load
        </span>
      )}
    </div>
  );
}

function AddGifForm({
  onCreated,
  onClose,
}: {
  onCreated: (gif: GifAsset) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateGifAssetInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof CreateGifAssetInput>(
    key: K,
    value: CreateGifAssetInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createGifAsset({
      ...form,
      width: Number(form.width),
      height: Number(form.height),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    onCreated(result.data);
    setForm(EMPTY_FORM);
  }

  const inputCls =
    "w-full border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-violet-300 placeholder:text-muted-foreground";
  const labelCls = "mb-1 block text-xs font-medium text-foreground";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="border border-border bg-muted/10 p-4"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Add New GIF</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* URL */}
        <div>
          <label className={labelCls}>GIF URL (animated) *</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setField("url", e.target.value)}
            placeholder="https://example.com/file.gif"
            className={inputCls}
            required
          />
          <ImagePreview src={form.url} alt="GIF preview" />
        </div>

        {/* Preview URL */}
        <div>
          <label className={labelCls}>Preview URL (small/static) *</label>
          <input
            type="url"
            value={form.previewUrl}
            onChange={(e) => setField("previewUrl", e.target.value)}
            placeholder="https://example.com/preview.webp"
            className={inputCls}
            required
          />
          <ImagePreview src={form.previewUrl} alt="Preview" />
        </div>

        {/* Keyword */}
        <div>
          <label className={labelCls}>Keyword *</label>
          <input
            type="text"
            value={form.keyword}
            onChange={(e) => setField("keyword", e.target.value)}
            placeholder="e.g. haha, crying, clap"
            className={inputCls}
            maxLength={100}
            required
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Used for search. Use simple descriptive words.
          </p>
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>Category *</label>
          <select
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
            className={inputCls}
          >
            {GIF_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Dimensions */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>Width (px) *</label>
            <input
              type="number"
              value={form.width}
              onChange={(e) => setField("width", Number(e.target.value))}
              min={1}
              max={4096}
              className={inputCls}
              required
            />
          </div>
          <div className="flex-1">
            <label className={labelCls}>Height (px) *</label>
            <input
              type="number"
              value={form.height}
              onChange={(e) => setField("height", Number(e.target.value))}
              min={1}
              max={4096}
              className={inputCls}
              required
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs font-medium text-destructive">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-8 items-center gap-2 border border-foreground bg-foreground px-4 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{loading ? "Saving…" : "Add GIF"}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function GifCard({
  gif,
  onDelete,
  onToggle,
}: {
  gif: GifAsset;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this GIF? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deleteGifAsset(gif.id);
    if (result.ok) {
      onDelete(gif.id);
    } else {
      setDeleting(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    const result = await toggleGifAsset(gif.id);
    if (result.ok) {
      onToggle(gif.id);
    }
    setToggling(false);
  }

  return (
    <div
      className={cn(
        "border border-border bg-background transition-opacity",
        !gif.isActive && "opacity-60",
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={gif.previewUrl}
          alt={gif.keyword}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute left-1 top-1">
          <StatusBadge isActive={gif.isActive} />
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1 p-2">
        <p className="truncate text-xs font-medium text-foreground">
          {gif.keyword}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {gif.category} · {gif.width}×{gif.height}
        </p>
      </div>

      {/* Actions */}
      <div className="flex border-t border-border">
        <button
          type="button"
          title={gif.isActive ? "Deactivate" : "Activate"}
          disabled={toggling}
          onClick={() => void handleToggle()}
          className="flex flex-1 items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed"
        >
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : gif.isActive ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          <span>{gif.isActive ? "Hide" : "Show"}</span>
        </button>

        <button
          type="button"
          title="Delete"
          disabled={deleting}
          onClick={() => void handleDelete()}
          className="flex flex-1 items-center justify-center gap-1 border-l border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

export function GifAssetsPage() {
  const [gifs, setGifs] = useState<GifAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 24;

  const load = useCallback(
    async (kw: string, cat: string, pg: number) => {
      setLoading(true);
      setError(null);

      const result = await fetchAdminGifs({
        keyword: kw || undefined,
        category: cat || undefined,
        page: pg,
        pageSize: PAGE_SIZE,
      });

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setGifs(result.data.items);
      setTotal(result.data.total);
    },
    [],
  );

  useEffect(() => {
    void load(keyword, category, page);
  }, [load, page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      void load(keyword, category, 1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keyword, category, load]);

  function handleCreated(gif: GifAsset) {
    setGifs((prev) => [gif, ...prev]);
    setTotal((t) => t + 1);
    setShowForm(false);
  }

  function handleDeleted(id: number) {
    setGifs((prev) => prev.filter((g) => g.id !== id));
    setTotal((t) => t - 1);
  }

  function handleToggled(id: number) {
    setGifs((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isActive: !g.isActive } : g)),
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">GIF Library</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage GIFs available to readers in comments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex h-8 items-center gap-2 border border-foreground bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add GIF</span>
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <AddGifForm
          onCreated={handleCreated}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by keyword…"
            className="w-full border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none transition-colors focus:border-violet-300 placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-violet-300"
        >
          <option value="">All categories</option>
          {GIF_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <p className="text-xs text-muted-foreground">
        {total} GIF{total !== 1 ? "s" : ""} total
      </p>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Grid */}
      {loading && gifs.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : gifs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No GIFs found. Add your first one above.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {gifs.map((gif) => (
            <GifCard
              key={gif.id}
              gif={gif}
              onDelete={handleDeleted}
              onToggle={handleToggled}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex h-8 items-center border border-border px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40 hover:bg-muted"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex h-8 items-center border border-border px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40 hover:bg-muted"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
