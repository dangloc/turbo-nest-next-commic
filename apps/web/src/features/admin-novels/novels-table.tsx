"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { resolveImageUrl } from "@/lib/image";
import { createNovel, deleteNovel, listNovels } from "../author-dashboard/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  NovelListQuery,
  NovelListScope,
  NovelListSort,
  NovelRecord,
} from "../author-dashboard/types";
import { ConfirmDialog } from "../author-dashboard/components/confirm-dialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const SCOPE_LABELS: Record<NovelListScope, string> = {
  all: "Tất cả",
  mine: "Của tôi",
  others: "Tác giả khác",
};

const SORT_LABELS: Record<NovelListSort, string> = {
  newest: "Mới nhất",
  oldest: "Cũ nhất",
  title: "Tên A-Z",
  views: "Lượt xem",
};

function toRequestQuery(q: NovelListQuery): NovelListQuery {
  return {
    q: q.q?.trim() || undefined,
    scope: q.scope,
    sort: q.sort,
    page: q.page,
    pageSize: q.pageSize,
  };
}

const INITIAL_QUERY: NovelListQuery = {
  q: "",
  scope: "all",
  sort: "newest",
  page: 1,
  pageSize: 10,
};

export function AdminNovelsTable() {
  const router = useRouter();

  const [novels, setNovels] = useState<NovelRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<NovelListQuery>(INITIAL_QUERY);
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<NovelRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const pageSize = query.pageSize ?? 10;
  const currentPage = query.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function fetchNovels(nextQuery: NovelListQuery) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const res = await listNovels(toRequestQuery(nextQuery), undefined, controller.signal);
    if (controller.signal.aborted) return;

    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }

    setNovels(res.data.items);
    setTotal(res.data.total);
    setSelectedIds(new Set());
  }

  useEffect(() => {
    void fetchNovels(query);
    return () => abortRef.current?.abort();
  }, [query]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuery((prev) => ({ ...prev, q: searchDraft.trim(), page: 1 }));
  }

  function setScope(scope: NovelListScope) {
    setQuery((prev) => ({ ...prev, scope, page: 1 }));
  }

  function setSort(sort: NovelListSort) {
    setQuery((prev) => ({ ...prev, sort, page: 1 }));
  }

  function setPageSize(ps: number) {
    setQuery((prev) => ({ ...prev, pageSize: ps, page: 1 }));
  }

  function goToPage(page: number) {
    setQuery((prev) => ({ ...prev, page: Math.min(Math.max(page, 1), totalPages) }));
  }

  function toggleSelectAll() {
    if (selectedIds.size === novels.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(novels.map((n) => n.id)));
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteNovel(deleteTarget.id);
    setDeleting(false);
    if (!res.ok) {
      setError(res.error.message);
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    void fetchNovels(query);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = createTitle.trim();
    const trimmedContent = createContent.trim();
    if (!trimmedTitle) {
      setCreateError("Tiêu đề không được để trống.");
      return;
    }
    if (trimmedTitle.length > 255) {
      setCreateError("Tiêu đề không được vượt quá 255 ký tự.");
      return;
    }
    if (!trimmedContent) {
      setCreateError("Mô tả không được để trống.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    const res = await createNovel({ title: trimmedTitle, postContent: trimmedContent });
    setCreating(false);
    if (!res.ok) {
      setCreateError(res.error.message);
      return;
    }
    setCreateOpen(false);
    setCreateTitle("");
    setCreateContent("");
    router.push(`/dashboard/novels/${res.data.id}`);
  }

  const allSelected = novels.length > 0 && selectedIds.size === novels.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const showingStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingEnd = total === 0 ? 0 : Math.min(total, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Tìm kiếm truyện..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            className="h-8 text-sm"
          />
        </form>

        {/* Scope filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border px-3 h-8 text-sm font-medium transition-colors hover:bg-accent",
                query.scope !== "all" && "border-foreground/60 bg-accent",
              )}
            >
              <span className="text-base leading-none">+</span>
              Phạm vi
              {query.scope !== "all" && (
                <span className="ml-1 rounded bg-foreground/10 px-1 text-xs">
                  {SCOPE_LABELS[query.scope ?? "all"]}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom">
            {(Object.keys(SCOPE_LABELS) as NovelListScope[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setScope(s)}
                className={cn(query.scope === s && "font-semibold")}
              >
                {SCOPE_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border px-3 h-8 text-sm font-medium transition-colors hover:bg-accent",
                query.sort !== "newest" && "border-foreground/60 bg-accent",
              )}
            >
              <span className="text-base leading-none">+</span>
              Sắp xếp
              {query.sort && query.sort !== "newest" && (
                <span className="ml-1 rounded bg-foreground/10 px-1 text-xs">
                  {SORT_LABELS[query.sort]}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom">
            {(Object.keys(SORT_LABELS) as NovelListSort[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setSort(s)}
                className={cn(query.sort === s && "font-semibold")}
              >
                {SORT_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          onClick={() => { setCreateOpen(true); setCreateError(null); }}
          className="h-8 gap-1.5"
        >
          <Plus className="size-3.5" />
          Thêm truyện
        </Button>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 h-8 text-sm font-medium transition-colors hover:bg-accent"
              >
                <SlidersHorizontal className="size-3.5" />
                Hiển thị
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                  Số hàng / trang
                </DropdownMenuLabel>
                {PAGE_SIZE_OPTIONS.map((ps) => (
                  <DropdownMenuItem
                    key={ps}
                    onClick={() => setPageSize(ps)}
                    className={cn(pageSize === ps && "font-semibold")}
                  >
                    {ps} hàng
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Feedback */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="rounded border-border"
                  aria-label="Chọn tất cả"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell w-16">Ảnh</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tiêu đề</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Mô tả</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Uploader ID</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && novels.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Không tìm thấy truyện nào.
                </td>
              </tr>
            )}
            {!loading &&
              novels.map((novel) => (
                <tr
                  key={novel.id}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    selectedIds.has(novel.id) ? "bg-muted/60" : "hover:bg-muted/30",
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(novel.id)}
                      onChange={() => toggleSelect(novel.id)}
                      className="rounded border-border"
                      aria-label={`Chọn ${novel.title}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">#{novel.id}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
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
                  <td className="px-4 py-3 font-medium">{novel.title}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    <p className="line-clamp-2 max-w-sm">{novel.postContent}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    #{novel.uploaderId}
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
                          onClick={() => router.push(`/dashboard/novels/${novel.id}`)}
                        >
                          <Pencil className="size-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(novel)}
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

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>
          {selectedIds.size > 0
            ? `${selectedIds.size} hàng được chọn`
            : `${showingStart}–${showingEnd} / ${total} truyện`}
        </span>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 h-8 hover:bg-accent transition-colors"
              >
                {pageSize} hàng / trang
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              {PAGE_SIZE_OPTIONS.map((ps) => (
                <DropdownMenuItem
                  key={ps}
                  onClick={() => setPageSize(ps)}
                  className={cn(pageSize === ps && "font-semibold")}
                >
                  {ps}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="px-2">
            Trang {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1}
            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang đầu"
          >
            <ChevronsLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Page number buttons */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let page: number;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (currentPage <= 3) {
              page = i + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = currentPage - 2 + i;
            }
            return (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors",
                  page === currentPage
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent",
                )}
              >
                {page}
              </button>
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className="inline-flex size-8 items-center justify-center text-muted-foreground">
              ...
            </span>
          )}
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <button
              type="button"
              onClick={() => goToPage(totalPages)}
              className="inline-flex size-8 items-center justify-center rounded-md text-sm hover:bg-accent transition-colors"
            >
              {totalPages}
            </button>
          )}

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang sau"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang cuối"
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa truyện này?"
        description={`Hành động không thể hoàn tác. "${deleteTarget?.title ?? "Truyện"}" sẽ bị xóa vĩnh viễn.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        busy={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <Dialog open={createOpen} onOpenChange={(open) => {
        if (!open) { setCreateTitle(""); setCreateContent(""); setCreateError(null); }
        setCreateOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm truyện mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-title" className="text-sm font-medium">
                Tiêu đề <span className="text-destructive">*</span>
              </label>
              <Input
                id="create-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Nhập tiêu đề truyện..."
                maxLength={255}
                required
                disabled={creating}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-content" className="text-sm font-medium">
                Mô tả <span className="text-destructive">*</span>
              </label>
              <textarea
                id="create-content"
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                placeholder="Nhập mô tả truyện..."
                rows={4}
                required
                disabled={creating}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Đang tạo..." : "Tạo truyện"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
