"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { createNovel, deleteNovel, listNovels, updateNovel } from "../api";
import type { NovelFormInput, NovelRecord } from "../types";
import { ConfirmDialog } from "./confirm-dialog";

interface NovelManagerProps {
  selectedNovelId: number | null;
  onSelectNovel: (novel: NovelRecord | null) => void;
}

const EMPTY_FORM: NovelFormInput = {
  title: "",
  postContent: "",
};

function sortByIdDesc(items: NovelRecord[]) {
  return [...items].sort((a, b) => b.id - a.id);
}

export function NovelManager({ selectedNovelId, onSelectNovel }: NovelManagerProps) {
  const [novels, setNovels] = useState<NovelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<NovelFormInput>(EMPTY_FORM);
  const [editingNovelId, setEditingNovelId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NovelRecord | null>(null);

  const selectedNovel = useMemo(
    () => novels.find((item) => item.id === selectedNovelId) ?? null,
    [novels, selectedNovelId],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      const response = await listNovels();
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setLoading(false);
        setError(response.error.message);
        return;
      }

      const sorted = sortByIdDesc(response.data);
      setNovels(sorted);
      setLoading(false);
      if (selectedNovelId) {
        const active = sorted.find((item) => item.id === selectedNovelId) ?? null;
        onSelectNovel(active);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onSelectNovel, selectedNovelId]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingNovelId(null);
  }

  function validateForm(input: NovelFormInput) {
    if (!input.title.trim()) {
      return "Title is required.";
    }

    if (input.title.length > 255) {
      return "Title cannot exceed 255 characters.";
    }

    if (!input.postContent.trim()) {
      return "Description is required.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const payload: NovelFormInput = {
      title: form.title.trim(),
      postContent: form.postContent.trim(),
    };

    const validationError = validateForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const result = editingNovelId
      ? await updateNovel(editingNovelId, payload)
      : await createNovel(payload);

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error.message);
      return;
    }

    const refreshed = await listNovels();
    setSubmitting(false);
    if (!refreshed.ok) {
      setError(refreshed.error.message);
      return;
    }

    const sorted = sortByIdDesc(refreshed.data);
    setNovels(sorted);
    setMessage(editingNovelId ? "Novel updated." : "Novel created.");
    const selected = sorted.find((item) => item.id === result.data.id) ?? null;
    onSelectNovel(selected);
    resetForm();
  }

  function beginEdit(novel: NovelRecord) {
    setEditingNovelId(novel.id);
    setForm({
      title: novel.title,
      postContent: novel.postContent,
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
    const removedId = deleteTarget.id;
    const response = await deleteNovel(removedId);
    if (!response.ok) {
      setSubmitting(false);
      setError(response.error.message);
      return;
    }

    const refreshed = await listNovels();
    setSubmitting(false);
    if (!refreshed.ok) {
      setError(refreshed.error.message);
      return;
    }

    const sorted = sortByIdDesc(refreshed.data);
    setNovels(sorted);
    setDeleteTarget(null);
    setMessage("Novel deleted.");

    if (selectedNovelId === removedId) {
      onSelectNovel(sorted[0] ?? null);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Novel Management</h2>
          <p className="text-sm text-[var(--muted)]">Create, update, and remove novels from your catalog.</p>
        </div>
        {selectedNovel ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
            Selected: {selectedNovel.title}
          </span>
        ) : null}
      </div>

      <form className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-strong)] p-4" onSubmit={handleSubmit}>
        <Input
          aria-label="Novel title"
          placeholder="Novel title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          maxLength={255}
        />
        <textarea
          aria-label="Novel content"
          className="shd-textarea min-h-24"
          placeholder="Novel description"
          value={form.postContent}
          onChange={(event) => setForm((prev) => ({ ...prev, postContent: event.target.value }))}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingNovelId ? "Update novel" : "Create novel"}
          </Button>
          {editingNovelId ? (
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={submitting}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p> : null}

      <div className="mt-4 grid gap-3">
        {loading ? <p className="text-sm text-[var(--muted)]">Loading novels...</p> : null}
        {!loading && novels.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No novels yet. Create your first novel above.</p>
        ) : null}
        {novels.map((novel) => (
          <article
            key={novel.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--panel-strong)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">{novel.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{novel.postContent}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => onSelectNovel(novel)}>
                  Open chapters
                </Button>
                <Button type="button" variant="outline" onClick={() => beginEdit(novel)}>
                  Edit
                </Button>
                <Button type="button" onClick={() => setDeleteTarget(novel)}>
                  Delete
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this novel?"
        description={`This action cannot be undone. ${deleteTarget?.title ?? "Novel"} will be removed.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={submitting}
      />
    </section>
  );
}
