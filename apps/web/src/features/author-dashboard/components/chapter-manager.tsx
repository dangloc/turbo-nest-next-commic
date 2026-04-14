"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { createChapter, deleteChapter, listChaptersByNovel, updateChapter } from "../api";
import type { ChapterFormInput, ChapterRecord, NovelRecord } from "../types";
import { ConfirmDialog } from "./confirm-dialog";

interface ChapterManagerProps {
  selectedNovel: NovelRecord | null;
}

const EMPTY_FORM: ChapterFormInput = {
  title: "",
  postContent: "",
  chapterNumber: undefined,
  priceOverride: undefined,
};

function safeOrder(chapters: ChapterRecord[]) {
  return [...chapters].sort((a, b) => {
    const an = a.chapterNumber ?? Number.MAX_SAFE_INTEGER;
    const bn = b.chapterNumber ?? Number.MAX_SAFE_INTEGER;
    return an - bn;
  });
}

export function ChapterManager({ selectedNovel }: ChapterManagerProps) {
  const [chapters, setChapters] = useState<ChapterRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ChapterFormInput>(EMPTY_FORM);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChapterRecord | null>(null);

  const selectedNovelId = selectedNovel?.id ?? null;

  const orderedChapters = useMemo(() => safeOrder(chapters), [chapters]);

  useEffect(() => {
    if (!selectedNovelId) {
      setChapters([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const response = await listChaptersByNovel(selectedNovelId);
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setLoading(false);
        setError(response.error.message);
        return;
      }

      setChapters(response.data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedNovelId]);

  function resetForm() {
    setEditingChapterId(null);
    setForm(EMPTY_FORM);
  }

  function validate(input: ChapterFormInput) {
    if (!input.title?.trim()) {
      return "Title is required.";
    }

    if (input.title.length > 255) {
      return "Title cannot exceed 255 characters.";
    }

    if (!input.postContent?.trim()) {
      return "Content is required.";
    }

    if (input.chapterNumber !== undefined && (!Number.isInteger(input.chapterNumber) || input.chapterNumber < 1)) {
      return "Chapter number must be an integer greater than 0.";
    }

    if (input.priceOverride !== undefined && Number.isNaN(input.priceOverride)) {
      return "Price override must be numeric.";
    }

    return null;
  }

  async function refreshChapters() {
    if (!selectedNovelId) {
      return false;
    }

    const response = await listChaptersByNovel(selectedNovelId);
    if (!response.ok) {
      setError(response.error.message);
      return false;
    }

    setChapters(response.data);
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNovelId) {
      return;
    }

    setError(null);
    setMessage(null);

    const payload: ChapterFormInput = {
      title: form.title?.trim() ?? "",
      postContent: form.postContent?.trim() ?? "",
      chapterNumber: form.chapterNumber,
      priceOverride: form.priceOverride,
    };

    const validationError = validate(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const response = editingChapterId
      ? await updateChapter(editingChapterId, payload)
      : await createChapter(selectedNovelId, payload);

    if (!response.ok) {
      setSubmitting(false);
      setError(response.error.message);
      return;
    }

    const refreshed = await refreshChapters();
    setSubmitting(false);
    if (!refreshed) {
      return;
    }

    setMessage(editingChapterId ? "Chapter updated." : "Chapter created.");
    resetForm();
  }

  function beginEdit(chapter: ChapterRecord) {
    setEditingChapterId(chapter.id);
    setForm({
      title: chapter.title,
      postContent: chapter.postContent,
      chapterNumber: chapter.chapterNumber ?? undefined,
      priceOverride: chapter.priceOverride ?? undefined,
    });
    setError(null);
    setMessage(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    const response = await deleteChapter(deleteTarget.id);
    if (!response.ok) {
      setSubmitting(false);
      setError(response.error.message);
      return;
    }

    const refreshed = await refreshChapters();
    setSubmitting(false);
    if (!refreshed) {
      return;
    }

    setMessage("Chapter deleted.");
    setDeleteTarget(null);
  }

  if (!selectedNovel) {
    return (
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Chapter Management</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Select a novel in the left panel to manage its chapters.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Chapter Management</h2>
        <p className="text-sm text-[var(--muted)]">Novel: {selectedNovel.title}</p>
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-strong)] p-4" onSubmit={handleSubmit}>
        <Input
          aria-label="Chapter title"
          placeholder="Chapter title"
          maxLength={255}
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <textarea
          aria-label="Chapter content"
          className="shd-textarea min-h-24"
          placeholder="Chapter content"
          value={form.postContent}
          onChange={(event) => setForm((prev) => ({ ...prev, postContent: event.target.value }))}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            aria-label="Chapter number"
            placeholder="Chapter number"
            type="number"
            min={1}
            value={form.chapterNumber ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setForm((prev) => ({
                ...prev,
                chapterNumber: value === "" ? undefined : Number.parseInt(value, 10),
              }));
            }}
          />
          <Input
            aria-label="Price override"
            placeholder="Price override"
            type="number"
            min={0}
            step="0.01"
            value={form.priceOverride ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setForm((prev) => ({
                ...prev,
                priceOverride: value === "" ? undefined : Number.parseFloat(value),
              }));
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingChapterId ? "Update chapter" : "Create chapter"}
          </Button>
          {editingChapterId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p> : null}

      <div className="mt-4 grid gap-3">
        {loading ? <p className="text-sm text-[var(--muted)]">Loading chapters...</p> : null}
        {!loading && orderedChapters.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No chapters yet. Create one above.</p>
        ) : null}

        {orderedChapters.map((chapter) => (
          <article
            key={chapter.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--panel-strong)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">
                  Chapter {chapter.chapterNumber ?? "-"}: {chapter.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{chapter.postContent}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => beginEdit(chapter)}>
                  Edit
                </Button>
                <Button type="button" onClick={() => setDeleteTarget(chapter)}>
                  Delete
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this chapter?"
        description={`This action cannot be undone. ${deleteTarget?.title ?? "Chapter"} will be removed.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={submitting}
      />
    </section>
  );
}
