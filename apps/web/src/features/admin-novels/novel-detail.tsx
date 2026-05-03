"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "../../providers/app-provider";
import { bootstrapAuthorDashboardSession } from "../author-dashboard/api";
import { ArrowLeft, FileUp, MoreHorizontal, Pencil, Trash2, Upload, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { resolveImageUrl } from "@/lib/image";
import {
  createChapter,
  deleteAllChapters,
  deleteChapter,
  deleteNovel,
  getNovel,
  importChapters,
  listChaptersByNovel,
  listTerms,
  updateChapter,
  updateNovel,
  uploadNovelImage,
} from "../author-dashboard/api";
import type {
  ChapterFormInput,
  ChapterRecord,
  NovelFormInput,
  NovelRecord,
  TermRecord,
} from "../author-dashboard/types";
import { ConfirmDialog } from "../author-dashboard/components/confirm-dialog";
import {
  TermSelector,
  TAXONOMIES,
} from "../author-dashboard/components/term-selector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NovelDetailProps {
  novelId: number;
  /** Where the back-arrow navigates. Defaults to /dashboard/novels */
  backPath?: string;
}

type GuardState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

const EMPTY_CHAPTER_FORM: ChapterFormInput = {
  title: "",
  postContent: "",
  chapterNumber: undefined,
  priceOverride: undefined,
};

function sortChapters(chapters: ChapterRecord[]) {
  return [...chapters].sort((a, b) => {
    const an = a.chapterNumber ?? Number.MAX_SAFE_INTEGER;
    const bn = b.chapterNumber ?? Number.MAX_SAFE_INTEGER;
    return an - bn;
  });
}

function toNumber(v: string): number | undefined {
  const n = Number(v);
  return v.trim() === "" || Number.isNaN(n) ? undefined : n;
}

// ---------------------------------------------------------------------------
// Image upload field
// ---------------------------------------------------------------------------

interface ImageUploadProps {
  label: string;
  value: string | null;
  type: "featured" | "banner";
  onChange: (url: string) => void;
}

function ImageUploadField({ label, value, type, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const res = await uploadNovelImage(file, type);
    setUploading(false);
    if (!res.ok) {
      setUploadError(res.error.message);
      return;
    }
    onChange(res.data.url);
  }

  const previewSrc = resolveImageUrl(value);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-start gap-3">
        {previewSrc && (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt={label}
              className={cn(
                "rounded-md border border-border object-cover",
                type === "featured" ? "h-28 w-20" : "h-20 w-36",
              )}
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
              aria-label="Xóa ảnh"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Upload className="size-4" />
          {uploading ? "Đang tải..." : previewSrc ? "Đổi ảnh" : "Tải ảnh lên"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      {value && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL ảnh"
          className="text-xs"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chapter edit modal
// ---------------------------------------------------------------------------

interface ChapterModalProps {
  chapter: ChapterRecord | null; // null = create new
  novelId: number;
  onClose: () => void;
  onSaved: (chapter: ChapterRecord) => void;
}

function ChapterModal({ chapter, novelId, onClose, onSaved }: ChapterModalProps) {
  const [form, setForm] = useState<ChapterFormInput>(
    chapter
      ? {
          title: chapter.title,
          postContent: chapter.postContent,
          chapterNumber: chapter.chapterNumber ?? undefined,
          priceOverride: chapter.priceOverride ?? undefined,
        }
      : EMPTY_CHAPTER_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Tiêu đề không được để trống.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: ChapterFormInput = {
      title: form.title.trim(),
      postContent: form.postContent,
      chapterNumber: form.chapterNumber,
      priceOverride: form.priceOverride,
    };
    const res = chapter
      ? await updateChapter(chapter.id, payload)
      : await createChapter(novelId, payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onSaved(res.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-base">
            {chapter ? "Chỉnh sửa chương" : "Thêm chương mới"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1 flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="ch-title">Tiêu đề</label>
              <Input
                id="ch-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Tiêu đề chương"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="ch-num">Số thứ tự</label>
              <Input
                id="ch-num"
                type="number"
                value={form.chapterNumber ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, chapterNumber: toNumber(e.target.value) }))}
                placeholder="Số chương"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="ch-price">Giá (xu)</label>
              <Input
                id="ch-price"
                type="number"
                value={form.priceOverride ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, priceOverride: toNumber(e.target.value) }))}
                placeholder="Miễn phí"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="ch-content">Nội dung</label>
            <textarea
              id="ch-content"
              className="shd-textarea min-h-60 w-full text-sm"
              value={form.postContent}
              onChange={(e) => setForm((p) => ({ ...p, postContent: e.target.value }))}
              placeholder="Nội dung chương..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="button" disabled={saving} onClick={(e) => {
            e.preventDefault();
            void (async () => {
              if (!form.title.trim()) { return; }
              setSaving(true);
              const payload: ChapterFormInput = {
                title: form.title.trim(),
                postContent: form.postContent,
                chapterNumber: form.chapterNumber,
                priceOverride: form.priceOverride,
              };
              const res = chapter
                ? await updateChapter(chapter.id, payload)
                : await createChapter(novelId, payload);
              setSaving(false);
              if (!res.ok) { return; }
              onSaved(res.data);
            })();
          }}>
            {saving ? "Đang lưu..." : chapter ? "Cập nhật" : "Thêm chương"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NovelDetail({ novelId, backPath = "/dashboard/novels" }: NovelDetailProps) {
  const router = useRouter();
  const { user, loaded, setUser } = useContext(AppContext);
  const [guardState, setGuardState] = useState<GuardState>({ status: "loading" });

  // Novel
  const [novel, setNovel] = useState<NovelRecord | null>(null);
  const [novelLoading, setNovelLoading] = useState(true);
  const [novelForm, setNovelForm] = useState<NovelFormInput>({ title: "", postContent: "" });
  const [novelSaving, setNovelSaving] = useState(false);
  const [novelMessage, setNovelMessage] = useState<string | null>(null);
  const [novelError, setNovelError] = useState<string | null>(null);
  const [deleteNovelTarget, setDeleteNovelTarget] = useState(false);
  const [deletingNovel, setDeletingNovel] = useState(false);

  // Terms
  const [allTerms, setAllTerms] = useState<TermRecord[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<number[]>([]);

  // Chapters
  const [chapters, setChapters] = useState<ChapterRecord[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chapterModal, setChapterModal] = useState<{ open: boolean; chapter: ChapterRecord | null }>({
    open: false,
    chapter: null,
  });
  const [deleteChapterTarget, setDeleteChapterTarget] = useState<ChapterRecord | null>(null);
  const [deletingChapter, setDeletingChapter] = useState(false);
  const [chapterMessage, setChapterMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const orderedChapters = useMemo(() => sortChapters(chapters), [chapters]);

  // Auth guard: AUTHOR/ADMIN only
  useEffect(() => {
    if (!loaded) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const session = await bootstrapAuthorDashboardSession(user);
      if (cancelled) {
        return;
      }

      if (session.kind === "redirect") {
        router.replace(session.to);
        return;
      }

      setUser(session.user);
      setGuardState({ status: "ready" });
    })().catch(() => {
      if (!cancelled) {
        setGuardState({
          status: "error",
          message: "Unable to load novel detail. Please retry.",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loaded, router, setUser, user]);

  // Load novel + terms
  useEffect(() => {
    if (guardState.status !== "ready") return;
    let cancelled = false;
    setNovelLoading(true);
    void Promise.all([getNovel(novelId), listTerms()]).then(([novelRes, termsRes]) => {
      if (cancelled) return;
      setNovelLoading(false);
      if (novelRes.ok) {
        const n = novelRes.data;
        setNovel(n);
        setNovelForm({
          title: n.title,
          postContent: n.postContent,
          defaultChapterPrice: Number(n.defaultChapterPrice) || 0,
          freeChapterCount: n.freeChapterCount,
          comboDiscountPct: n.comboDiscountPct,
          featuredImage: n.featuredImage ?? undefined,
        });
        setSelectedTermIds(n.terms.map((t) => t.id));
      } else {
        setNovelError(novelRes.error.message);
      }
      if (termsRes.ok) setAllTerms(termsRes.data);
    });
    return () => { cancelled = true; };
  }, [novelId, guardState.status]);

  // Load chapters
  useEffect(() => {
    if (guardState.status !== "ready") return;
    if (!novel) return;
    let cancelled = false;
    setChaptersLoading(true);
    void listChaptersByNovel(novel.id).then((res) => {
      if (cancelled) return;
      setChaptersLoading(false);
      if (res.ok) setChapters(res.data);
    });
    return () => { cancelled = true; };
  }, [novel?.id, guardState.status]);

  // Save novel
  async function handleNovelSave(e: React.FormEvent) {
    e.preventDefault();
    if (!novel || !novelForm.title.trim()) {
      setNovelError("Tiêu đề không được để trống.");
      return;
    }
    setNovelSaving(true);
    setNovelError(null);
    setNovelMessage(null);
    const res = await updateNovel(novel.id, {
      ...novelForm,
      title: novelForm.title.trim(),
      postContent: novelForm.postContent.trim(),
      termIds: selectedTermIds,
    });
    setNovelSaving(false);
    if (!res.ok) { setNovelError(res.error.message); return; }
    setNovel(res.data);
    setNovelMessage("Đã lưu thay đổi.");
  }

  // Delete novel
  async function handleNovelDelete() {
    if (!novel) return;
    setDeletingNovel(true);
    const res = await deleteNovel(novel.id);
    setDeletingNovel(false);
    if (!res.ok) { setNovelError(res.error.message); setDeleteNovelTarget(false); return; }
    router.push(backPath);
  }

  // Chapter saved from modal
  function handleChapterSaved(chapter: ChapterRecord) {
    setChapters((prev) => {
      const existing = prev.find((c) => c.id === chapter.id);
      return existing
        ? prev.map((c) => (c.id === chapter.id ? chapter : c))
        : [...prev, chapter];
    });
    setChapterModal({ open: false, chapter: null });
    setChapterMessage(chapterModal.chapter ? "Đã cập nhật chương." : "Đã thêm chương mới.");
  }

  // Delete chapter
  async function handleChapterDelete() {
    if (!deleteChapterTarget) return;
    setDeletingChapter(true);
    const res = await deleteChapter(deleteChapterTarget.id);
    setDeletingChapter(false);
    if (!res.ok) { setDeleteChapterTarget(null); return; }
    setChapters((prev) => prev.filter((c) => c.id !== deleteChapterTarget.id));
    setDeleteChapterTarget(null);
    setChapterMessage("Đã xóa chương.");
  }

  // Delete all chapters
  async function handleDeleteAll() {
    if (!novel) return;
    setDeletingAll(true);
    const res = await deleteAllChapters(novel.id);
    setDeletingAll(false);
    setDeleteAllConfirm(false);
    if (!res.ok) { setChapterMessage(`Lỗi: ${res.error.message}`); return; }
    setChapters([]);
    setChapterMessage(`Đã xóa ${res.data.deleted} chương.`);
  }

  // Import chapters from file
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !novel) return;
    e.target.value = "";
    setImporting(true);
    setChapterMessage(null);
    const res = await importChapters(novel.id, file);
    setImporting(false);
    if (!res.ok) {
      setChapterMessage(`Lỗi nhập chương: ${res.error.message}`);
      return;
    }
    const { chaptersCreated, warnings } = res.data;
    // Refresh chapter list
    const listRes = await listChaptersByNovel(novel.id);
    if (listRes.ok) setChapters(listRes.data);
    const createdCount = Array.isArray(chaptersCreated) ? chaptersCreated.length : chaptersCreated;
    const note = warnings.length ? ` (${warnings[0]})` : "";
    setChapterMessage(`Đã nhập ${createdCount} chương.${note}`);
  }

  // ----------------------------------------------------------
  if (!loaded || guardState.status === "loading") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (guardState.status === "error") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm font-medium text-destructive">{guardState.message}</p>
      </div>
    );
  }

  if (novelLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Đang tải truyện...
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="flex flex-col gap-4 py-16 items-center">
        <p className="text-muted-foreground">{novelError ?? "Không tìm thấy truyện."}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/novels")}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-w-none flex-col gap-5 xl:h-[calc(100vh-120px)]">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push(backPath)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách truyện
      </button>

      <div className="grid min-h-0 gap-5 xl:grid-cols-2">
        <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card xl:overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold">{novel.title}</h1>
              <p className="text-sm text-muted-foreground">
                ID #{novel.id} · Uploader #{novel.uploaderId}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
                  aria-label="Tùy chọn"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteNovelTarget(true)}>
                  <Trash2 className="size-4" />
                  Xóa truyện này
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <form onSubmit={handleNovelSave} className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="novel-title">Tiêu đề</label>
                <Input
                  id="novel-title"
                  value={novelForm.title}
                  onChange={(e) => setNovelForm((p) => ({ ...p, title: e.target.value }))}
                  maxLength={255}
                  placeholder="Tiêu đề truyện"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="novel-content">Mô tả / Nội dung</label>
                <textarea
                  id="novel-content"
                  className="shd-textarea min-h-36 w-full resize-y"
                  value={novelForm.postContent}
                  onChange={(e) => setNovelForm((p) => ({ ...p, postContent: e.target.value }))}
                  placeholder="Mô tả nội dung truyện"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="novel-price">Giá chương mặc định (xu)</label>
                  <Input
                    id="novel-price"
                    type="number"
                    min={0}
                    value={novelForm.defaultChapterPrice ?? ""}
                    onChange={(e) => setNovelForm((p) => ({ ...p, defaultChapterPrice: toNumber(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="novel-free">Số chương miễn phí</label>
                  <Input
                    id="novel-free"
                    type="number"
                    min={0}
                    value={novelForm.freeChapterCount ?? ""}
                    onChange={(e) => setNovelForm((p) => ({ ...p, freeChapterCount: toNumber(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="novel-discount">Giảm giá combo (%)</label>
                  <Input
                    id="novel-discount"
                    type="number"
                    min={0}
                    max={100}
                    value={novelForm.comboDiscountPct ?? ""}
                    onChange={(e) => setNovelForm((p) => ({ ...p, comboDiscountPct: toNumber(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <ImageUploadField
                label="Ảnh bìa (featured)"
                value={novelForm.featuredImage ?? null}
                type="featured"
                onChange={(url) => setNovelForm((p) => ({ ...p, featuredImage: url }))}
              />

              {allTerms.length > 0 && (
                <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Phân loại
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Dùng dropdown để tìm nhanh và chọn nhiều mục cho từng taxonomy.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {TAXONOMIES.map((tax) => (
                      <TermSelector
                        key={tax}
                        taxonomy={tax}
                        all={allTerms}
                        selected={selectedTermIds}
                        onChange={setSelectedTermIds}
                      />
                    ))}
                  </div>
                </div>
              )}

              {novelError && <p className="text-sm text-destructive">{novelError}</p>}
              {novelMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{novelMessage}</p>}
            </div>

            <div className="border-t border-border px-6 py-4">
              <Button type="submit" disabled={novelSaving}>
                {novelSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card xl:overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4 flex-wrap">
            <div>
              <h2 className="font-semibold">Danh sách chương</h2>
              <p className="text-sm text-muted-foreground">{chapters.length} chương</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {chapters.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={deletingAll}
                  onClick={() => setDeleteAllConfirm(true)}
                  className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  Xóa tất cả
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={importing}
                onClick={() => importInputRef.current?.click()}
                className="gap-1.5"
              >
                <FileUp className="size-4" />
                {importing ? "Đang nhập..." : "Nhập từ file"}
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".txt,.doc,.docx"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                type="button"
                onClick={() => setChapterModal({ open: true, chapter: null })}
              >
                + Thêm chương
              </Button>
            </div>
          </div>

          {chapterMessage && (
            <p className="border-b border-border px-6 py-2 text-sm text-emerald-600 dark:text-emerald-400">
              {chapterMessage}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-12 px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tiêu đề</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Số chương</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Giá (xu)</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {chaptersLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Đang tải...
                    </td>
                  </tr>
                )}
                {!chaptersLoading && orderedChapters.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Chưa có chương nào.
                    </td>
                  </tr>
                )}
                {!chaptersLoading &&
                  orderedChapters.map((chapter) => (
                    <tr
                      key={chapter.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 text-muted-foreground">{chapter.id}</td>
                      <td className="px-4 py-3 font-medium">{chapter.title}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {chapter.chapterNumber ?? "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {chapter.priceOverride != null ? chapter.priceOverride : "Miễn phí"}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
                              aria-label="Tùy chọn"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem
                              onClick={() => setChapterModal({ open: true, chapter })}
                            >
                              <Pencil className="size-4" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteChapterTarget(chapter)}
                            >
                              <Trash2 className="size-4" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chapter modal */}
      {chapterModal.open && (
        <ChapterModal
          chapter={chapterModal.chapter}
          novelId={novelId}
          onClose={() => setChapterModal({ open: false, chapter: null })}
          onSaved={handleChapterSaved}
        />
      )}

      {/* Delete novel */}
      <ConfirmDialog
        open={deleteNovelTarget}
        title="Xóa truyện này?"
        description={`Hành động không thể hoàn tác. Toàn bộ chương của "${novel.title}" sẽ bị xóa.`}
        confirmLabel="Xóa truyện"
        cancelLabel="Hủy"
        busy={deletingNovel}
        onConfirm={handleNovelDelete}
        onCancel={() => setDeleteNovelTarget(false)}
      />

      {/* Delete all chapters */}
      <ConfirmDialog
        open={deleteAllConfirm}
        title="Xóa tất cả chương?"
        description={`Toàn bộ ${chapters.length} chương của "${novel.title}" sẽ bị xóa vĩnh viễn. Hành động không thể hoàn tác.`}
        confirmLabel="Xóa tất cả"
        cancelLabel="Hủy"
        busy={deletingAll}
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteAllConfirm(false)}
      />

      {/* Delete chapter */}
      <ConfirmDialog
        open={Boolean(deleteChapterTarget)}
        title="Xóa chương này?"
        description={`"${deleteChapterTarget?.title ?? "Chương"}" sẽ bị xóa vĩnh viễn.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        busy={deletingChapter}
        onConfirm={handleChapterDelete}
        onCancel={() => setDeleteChapterTarget(null)}
      />
    </div>
  );
}
