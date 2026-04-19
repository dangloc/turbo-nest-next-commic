"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { resolveImageUrl } from "@/lib/image";
import { createNovel, deleteNovel, listNovels, listTerms, updateNovel } from "../api";
import type {
  NovelFormInput,
  NovelListQuery,
  NovelListScope,
  NovelListSort,
  NovelRecord,
  TermRecord,
} from "../types";
import { ConfirmDialog } from "./confirm-dialog";
import { TermSelector, TAXONOMIES } from "./term-selector";

interface NovelManagerProps {
  selectedNovelId: number | null;
  currentUserId: number | null;
  onSelectNovel: (novel: NovelRecord | null) => void;
}

const EMPTY_FORM: NovelFormInput = {
  title: "",
  postContent: "",
};

const INITIAL_QUERY: NovelListQuery = {
  q: "",
  scope: "all",
  sort: "newest",
  page: 1,
  pageSize: 10,
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const SCOPE_OPTIONS: { value: NovelListScope; label: string }[] = [
  { value: "all", label: "All novels" },
  { value: "mine", label: "My uploads" },
  { value: "others", label: "Other authors" },
];
const SORT_OPTIONS: { value: NovelListSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title A-Z" },
  { value: "views", label: "Most viewed" },
];

function toRequestQuery(query: NovelListQuery): NovelListQuery {
  return {
    q: query.q?.trim() || undefined,
    scope: query.scope,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  };
}

function formatOwnerLabel(uploaderId: number, currentUserId: number | null) {
  return uploaderId === currentUserId ? "You" : `Author #${uploaderId}`;
}

export function NovelManager({ selectedNovelId, currentUserId, onSelectNovel }: NovelManagerProps) {
  const [novels, setNovels] = useState<NovelRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<NovelFormInput>(EMPTY_FORM);
  const [editingNovelId, setEditingNovelId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NovelRecord | null>(null);
  const [query, setQuery] = useState<NovelListQuery>(INITIAL_QUERY);
  const [searchDraft, setSearchDraft] = useState(INITIAL_QUERY.q ?? "");
  const [allTerms, setAllTerms] = useState<TermRecord[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<number[]>([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const selectedNovelIdRef = useRef<number | null>(selectedNovelId);

  useEffect(() => {
    selectedNovelIdRef.current = selectedNovelId;
  }, [selectedNovelId]);

  useEffect(() => {
    let cancelled = false;
    void listTerms().then((res) => {
      if (cancelled) return;
      setTermsLoading(false);
      if (res.ok) setAllTerms(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / (query.pageSize ?? 10)));
  const currentPage = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const showingStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingEnd = total === 0 ? 0 : Math.min(total, currentPage * pageSize);

  async function syncNovels(nextQuery: NovelListQuery, signal?: AbortSignal) {
    setLoading(true);
    setError(null);

    const response = await listNovels(toRequestQuery(nextQuery), undefined, signal);
    if (signal?.aborted) {
      return null;
    }

    if (!response.ok) {
      setLoading(false);
      setError(response.error.message);
      return null;
    }

    const pageResponse = response.data;
    setNovels(pageResponse.items);
    setTotal(pageResponse.total);
    setQuery((prev) =>
      prev.page === pageResponse.page && prev.pageSize === pageResponse.pageSize
        ? prev
        : { ...prev, page: pageResponse.page, pageSize: pageResponse.pageSize },
    );
    setLoading(false);

    const activeNovelId = selectedNovelIdRef.current;
    if (activeNovelId !== null) {
      const active = pageResponse.items.find((item) => item.id === activeNovelId) ?? null;
      onSelectNovel(active);
    }

    return pageResponse;
  }

  useEffect(() => {
    const controller = new AbortController();
    void syncNovels(query, controller.signal);

    return () => {
      controller.abort();
    };
  }, [onSelectNovel, query]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingNovelId(null);
    setSelectedTermIds([]);
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
      : await createNovel({ ...payload, termIds: selectedTermIds });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error.message);
      return;
    }

    const refreshed = await syncNovels(query);
    setSubmitting(false);
    if (!refreshed) {
      return;
    }

    setMessage(editingNovelId ? "Novel updated." : "Novel created.");
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

    const refreshed = await syncNovels(query);
    setSubmitting(false);
    if (!refreshed) {
      return;
    }

    setDeleteTarget(null);
    setMessage("Novel deleted.");

    if (selectedNovelIdRef.current === removedId) {
      onSelectNovel(refreshed.items[0] ?? null);
    }
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      q: searchDraft.trim(),
      page: 1,
    }));
  }

  function resetFilters() {
    setSearchDraft("");
    setQuery({
      ...INITIAL_QUERY,
      q: "",
      page: 1,
    });
  }

  function handlePageChange(nextPage: number) {
    setQuery((prev) => ({
      ...prev,
      page: Math.min(Math.max(nextPage, 1), totalPages),
    }));
  }

  function handleScopeChange(value: string) {
    setQuery((prev) => ({
      ...prev,
      scope: value as NovelListScope,
      page: 1,
    }));
  }

  function handleSortChange(value: string) {
    setQuery((prev) => ({
      ...prev,
      sort: value as NovelListSort,
      page: 1,
    }));
  }

  function handlePageSizeChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    setQuery((prev) => ({
      ...prev,
      pageSize: Number.isInteger(parsed) && parsed > 0 ? parsed : prev.pageSize ?? 10,
      page: 1,
    }));
  }

  const selectedNovel = useMemo(
    () => novels.find((item) => item.id === selectedNovelId) ?? null,
    [novels, selectedNovelId],
  );

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Novel Management</h2>
          <p className="text-sm text-[var(--muted)]">Search, sort, and page through your catalog.</p>
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
        {/* Taxonomies — only shown in create mode, not edit mode */}
        {!editingNovelId ? (
          termsLoading ? (
            <p className="text-xs text-muted-foreground">Đang tải phân loại...</p>
          ) : allTerms.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Phân loại
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          ) : null
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingNovelId ? "Update novel" : "Create novel"}
          </Button>
          {editingNovelId ? (
            <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-4 grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-strong)] p-4">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr),auto]" onSubmit={handleSearchSubmit}>
          <Input
            aria-label="Search novels"
            placeholder="Search title or description"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Search</Button>
            <Button type="button" variant="outline" onClick={resetFilters}>
              Clear
            </Button>
          </div>
        </form>

        <div className="grid gap-3 md:grid-cols-3">
          <Select
            aria-label="Owner filter"
            value={query.scope ?? "all"}
            onValueChange={handleScopeChange}
            options={SCOPE_OPTIONS}
          />
          <Select
            aria-label="Sort novels"
            value={query.sort ?? "newest"}
            onValueChange={handleSortChange}
            options={SORT_OPTIONS}
          />
          <Select
            aria-label="Rows per page"
            value={String(query.pageSize ?? 10)}
            onValueChange={handlePageSizeChange}
            options={PAGE_SIZE_OPTIONS.map((option) => ({
              value: String(option),
              label: `${option} rows`,
            }))}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
          <p>
            Showing {showingStart}-{showingEnd} of {total} novel{total === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => handlePageChange((query.page ?? 1) - 1)} disabled={loading || (query.page ?? 1) <= 1}>
              Previous
            </Button>
            <Button type="button" variant="outline" onClick={() => handlePageChange((query.page ?? 1) + 1)} disabled={loading || (query.page ?? 1) >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel-strong)]">
        {loading ? <p className="p-4 text-sm text-[var(--muted)]">Loading novels...</p> : null}
        {!loading && novels.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">No novels match the current filters.</p>
        ) : null}
        {!loading && novels.length > 0 ? (
          <table className="w-full border-collapse text-left">
            <thead className="bg-[var(--panel)] text-sm uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="border-b border-[var(--line)] px-4 py-3">ID</th>
                <th className="border-b border-[var(--line)] px-4 py-3 hidden md:table-cell w-16">Ảnh</th>
                <th className="border-b border-[var(--line)] px-4 py-3">Title</th>
                <th className="border-b border-[var(--line)] px-4 py-3">Description</th>
                <th className="border-b border-[var(--line)] px-4 py-3">Owner</th>
                <th className="border-b border-[var(--line)] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {novels.map((novel) => {
                const isSelected = novel.id === selectedNovelId;

                return (
                  <tr
                    key={novel.id}
                    className={isSelected ? "bg-[rgba(125,211,252,0.14)]" : undefined}
                  >
                    <td className="border-b border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">#{novel.id}</td>
                    <td className="border-b border-[var(--line)] px-4 py-4 hidden md:table-cell">
                      {novel.featuredImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(novel.featuredImage) ?? ""}
                          alt={novel.title}
                          className="h-12 w-9 rounded object-cover border border-border"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="border-b border-[var(--line)] px-4 py-4">
                      <div className="font-semibold text-[var(--ink)]">{novel.title}</div>
                      <button
                        type="button"
                        className="mt-1 text-xs font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline"
                        onClick={() => onSelectNovel(novel)}
                      >
                        Open chapters
                      </button>
                    </td>
                    <td className="border-b border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">
                      <p className="line-clamp-2 max-w-2xl">{novel.postContent}</p>
                    </td>
                    <td className="border-b border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">
                      {formatOwnerLabel(novel.uploaderId, currentUserId)}
                    </td>
                    <td className="border-b border-[var(--line)] px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => beginEdit(novel)}>
                          Edit
                        </Button>
                        <Button type="button" onClick={() => setDeleteTarget(novel)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
        <p>
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => handlePageChange((query.page ?? 1) - 1)} disabled={loading || (query.page ?? 1) <= 1}>
            Previous page
          </Button>
          <Button type="button" variant="outline" onClick={() => handlePageChange((query.page ?? 1) + 1)} disabled={loading || (query.page ?? 1) >= totalPages}>
            Next page
          </Button>
        </div>
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
