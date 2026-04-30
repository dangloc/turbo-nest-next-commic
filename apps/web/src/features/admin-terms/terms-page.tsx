"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { AppContext } from "@/providers/app-provider";
import {
  approveTermSubmission,
  createTerm,
  deleteTerm,
  listTerms,
  listTermSubmissions,
  rejectTermSubmission,
  submitTerm,
  updateTerm,
} from "../author-dashboard/api";
import type {
  TermRecord,
  TermSubmissionRecord,
} from "../author-dashboard/types";
import { ConfirmDialog } from "../author-dashboard/components/confirm-dialog";

const TAXONOMIES = [
  "tac_gia",
  "trang_thai",
  "the_loai",
  "post_tag",
  "nam_phat_hanh",
] as const;
type Taxonomy = (typeof TAXONOMIES)[number];

const TAXONOMY_LABELS: Record<Taxonomy, string> = {
  tac_gia: "Tác giả",
  trang_thai: "Trạng thái",
  the_loai: "Thể loại",
  post_tag: "Tag",
  nam_phat_hanh: "Năm phát hành",
};

const TAXONOMY_COLORS: Record<Taxonomy, string> = {
  tac_gia:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  trang_thai:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  the_loai:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300",
  post_tag:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  nam_phat_hanh:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
};

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("vi-VN");
}

function statusVariant(status: TermSubmissionRecord["status"]) {
  switch (status) {
    case "APPROVED":
      return "secondary" as const;
    case "REJECTED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(status: TermSubmissionRecord["status"]) {
  switch (status) {
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Từ chối";
    default:
      return "Chờ duyệt";
  }
}

type TermModalMode = "live-create" | "live-edit" | "submission-create";

interface TermModalProps {
  mode: TermModalMode;
  term: TermRecord | null;
  defaultTaxonomy?: Taxonomy;
  onClose: () => void;
  onSaved: (payload: TermRecord | TermSubmissionRecord) => void;
}

function TermModal({
  mode,
  term,
  defaultTaxonomy = "the_loai",
  onClose,
  onSaved,
}: TermModalProps) {
  const [name, setName] = useState(term?.name ?? "");
  const [slug, setSlug] = useState(term?.slug ?? "");
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(
    (term?.taxonomy as Taxonomy) ?? defaultTaxonomy,
  );
  const [slugManual, setSlugManual] = useState(Boolean(term));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === "live-edit";
  const isSubmission = mode === "submission-create";

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) {
      setSlug(toSlug(value));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError("Tên và slug không được để trống.");
      return;
    }

    setSaving(true);
    setError(null);

    const result =
      mode === "live-edit" && term
        ? await updateTerm(term.id, { name: name.trim(), slug: slug.trim() })
        : isSubmission
          ? await submitTerm({ name: name.trim(), slug: slug.trim(), taxonomy })
          : await createTerm({
              name: name.trim(),
              slug: slug.trim(),
              taxonomy,
            });

    setSaving(false);

    if (!result.ok) {
      setError(result.error.message || "Không thể lưu term.");
      return;
    }

    onSaved(result.data);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Chỉnh sửa term"
              : isSubmission
                ? "Gửi term mới để duyệt"
                : "Thêm term mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {!isEdit ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Taxonomy</label>
              <div className="flex flex-wrap gap-2">
                {TAXONOMIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTaxonomy(item)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      taxonomy === item
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    {TAXONOMY_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-medium">Tên</span>
            <Input
              value={name}
              maxLength={100}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Tên hiển thị"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Slug</span>
            <Input
              value={slug}
              maxLength={100}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugManual(true);
              }}
              placeholder="ten-hien-thi"
            />
          </label>

          {isSubmission ? (
            <p className="text-sm text-muted-foreground">
              Term do tác giả gửi sẽ ở trạng thái chờ duyệt và chưa xuất hiện
              công khai cho đến khi admin duyệt.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Đang lưu..."
                : isSubmission
                  ? "Gửi duyệt"
                  : isEdit
                    ? "Cập nhật"
                    : "Thêm term"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const PAGE_SIZE = 20;

interface TaxonomyGroupProps {
  tax: Taxonomy;
  items: TermRecord[];
  canManageLiveTerms: boolean;
  onEdit: (term: TermRecord) => void;
  onDelete: (term: TermRecord) => void;
}

function TaxonomyGroup({
  tax,
  items,
  canManageLiveTerms,
  onEdit,
  onDelete,
}: TaxonomyGroupProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const paginate = items.length > PAGE_SIZE;

  const prevLen = useRef(items.length);
  if (prevLen.current !== items.length) {
    prevLen.current = items.length;
    if (page !== 1) setPage(1);
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
            TAXONOMY_COLORS[tax],
          )}
        >
          {TAXONOMY_LABELS[tax]}
        </span>
        <span className="text-xs text-muted-foreground">
          {items.length} term
        </span>
        {paginate ? (
          <span className="ml-auto text-xs text-muted-foreground">
            Trang {safePage}/{totalPages}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Chưa có term nào.
        </p>
      ) : (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-16">
                  ID
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Tên
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">
                  Slug
                </th>
                {canManageLiveTerms ? (
                  <th className="w-10 px-4 py-2.5" />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {paged.map((term) => (
                <tr
                  key={term.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    #{term.id}
                  </td>
                  <td className="px-4 py-3 font-medium">{term.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                    {term.slug}
                  </td>
                  {canManageLiveTerms ? (
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
                          <DropdownMenuItem onClick={() => onEdit(term)}>
                            <Pencil className="size-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(term)}
                          >
                            <Trash2 className="size-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>

          {paginate ? (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, items.length)} / {items.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1,
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                      item === safePage
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={safePage >= totalPages}
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function TermsPage() {
  const { user } = useContext(AppContext);
  const isAdmin = user?.role === "ADMIN" || user?.id === 1;
  const canManageLiveTerms = Boolean(isAdmin);
  const [terms, setTerms] = useState<TermRecord[]>([]);
  const [submissions, setSubmissions] = useState<TermSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTax, setFilterTax] = useState<Taxonomy | "all">("all");
  const [search, setSearch] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >(isAdmin ? "PENDING" : "ALL");
  const [modal, setModal] = useState<{
    open: boolean;
    term: TermRecord | null;
    mode: TermModalMode;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TermRecord | null>(null);
  const [reviewTarget, setReviewTarget] = useState<TermSubmissionRecord | null>(
    null,
  );
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [reviewNote, setReviewNote] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  async function fetchData(signal?: AbortSignal) {
    setLoading(true);
    setError(null);

    const [termsResult, submissionsResult] = await Promise.all([
      listTerms(undefined, undefined),
      listTermSubmissions(
        {
          status:
            submissionStatusFilter === "ALL"
              ? undefined
              : submissionStatusFilter,
        },
        undefined,
        signal,
      ),
    ]);

    if (signal?.aborted) {
      return;
    }

    if (!termsResult.ok) {
      setTerms([]);
      setSubmissions([]);
      setError(termsResult.error.message || "Không thể tải danh sách term.");
      setLoading(false);
      return;
    }

    if (!submissionsResult.ok) {
      setTerms(termsResult.data);
      setSubmissions([]);
      setError(
        submissionsResult.error.message ||
          "Không thể tải danh sách duyệt term.",
      );
      setLoading(false);
      return;
    }

    setTerms(termsResult.data);
    setSubmissions(submissionsResult.data);
    setLoading(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [submissionStatusFilter]);

  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      if (filterTax !== "all" && term.taxonomy !== filterTax) {
        return false;
      }

      const query = search.trim().toLowerCase();
      if (!query) {
        return true;
      }

      return (
        term.name.toLowerCase().includes(query) ||
        term.slug.toLowerCase().includes(query)
      );
    });
  }, [filterTax, search, terms]);

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submissions.filter((item) => {
      if (filterTax !== "all" && item.taxonomy !== filterTax) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.user.email.toLowerCase().includes(query) ||
        (item.user.nickname ?? "").toLowerCase().includes(query)
      );
    });
  }, [filterTax, search, submissions]);

  const grouped = useMemo(
    () =>
      TAXONOMIES.map((tax) => ({
        tax,
        items: filteredTerms.filter((term) => term.taxonomy === tax),
      })).filter((group) => group.items.length > 0 || filterTax === group.tax),
    [filterTax, filteredTerms],
  );

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    const result = await deleteTerm(deleteTarget.id);
    setDeleting(false);

    if (!result.ok) {
      setError(result.error.message || "Không thể xóa term.");
      setDeleteTarget(null);
      return;
    }

    setDeleteTarget(null);
    await fetchData();
  }

  async function handleReview() {
    if (!reviewTarget) {
      return;
    }

    setReviewBusy(true);
    const result =
      reviewAction === "approve"
        ? await approveTermSubmission(reviewTarget.id, reviewNote)
        : await rejectTermSubmission(reviewTarget.id, reviewNote);
    setReviewBusy(false);

    if (!result.ok) {
      setError(result.error.message || "Không thể xử lý yêu cầu term.");
      return;
    }

    setReviewNote("");
    setReviewTarget(null);
    await fetchData();
  }

  function handleSaved(payload: TermRecord | TermSubmissionRecord) {
    setModal(null);

    if ("status" in payload) {
      setSubmissions((current) => [payload, ...current]);
      return;
    }

    setTerms((current) => {
      const exists = current.find((item) => item.id === payload.id);
      return exists
        ? current.map((item) => (item.id === payload.id ? payload : item))
        : [...current, payload];
    });
  }

  const defaultTaxonomy: Taxonomy =
    filterTax !== "all"
      ? filterTax
      : ((modal?.term?.taxonomy as Taxonomy) ?? "the_loai");

  return (
    <div className="flex flex-col gap-4">
      {!isAdmin ? (
        <Card>
          <CardContent className="py-5 text-sm text-muted-foreground">
            Tác giả chỉ được gửi term mới để admin duyệt. Bạn có thể xem toàn bộ
            term đang hoạt động nhưng không thể sửa hoặc xóa trực tiếp.
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Tìm kiếm term hoặc hồ sơ gửi..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 w-56 text-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 h-9 text-sm font-medium transition-colors hover:bg-accent"
            >
              {filterTax === "all"
                ? "Tất cả taxonomy"
                : TAXONOMY_LABELS[filterTax]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                Lọc theo taxonomy
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setFilterTax("all")}>
                Tất cả
              </DropdownMenuItem>
              {TAXONOMIES.map((item) => (
                <DropdownMenuItem key={item} onClick={() => setFilterTax(item)}>
                  {TAXONOMY_LABELS[item]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select
          value={submissionStatusFilter}
          onValueChange={(value) =>
            setSubmissionStatusFilter(
              value as "ALL" | "PENDING" | "APPROVED" | "REJECTED",
            )
          }
          options={[
            { value: "ALL", label: "Mọi trạng thái duyệt" },
            { value: "PENDING", label: "Đang chờ duyệt" },
            { value: "APPROVED", label: "Đã duyệt" },
            { value: "REJECTED", label: "Bị từ chối" },
          ]}
          className="h-9 sm:w-52"
        />

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() => void fetchData()}
            disabled={loading}
          >
            Làm mới
          </Button>
          <Button
            onClick={() =>
              setModal({
                open: true,
                term: null,
                mode: isAdmin ? "live-create" : "submission-create",
              })
            }
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            {isAdmin ? "Thêm term" : "Gửi term mới"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {isAdmin ? "Danh sách yêu cầu term" : "Yêu cầu term của bạn"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Taxonomy</TableHead>
                {isAdmin ? <TableHead>Người gửi</TableHead> : null}
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ghi chú duyệt</TableHead>
                <TableHead>Thời gian</TableHead>
                {isAdmin ? (
                  <TableHead className="text-right">Hành động</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Đang tải yêu cầu term...
                  </TableCell>
                </TableRow>
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {TAXONOMY_LABELS[item.taxonomy as Taxonomy] ??
                        item.taxonomy}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell>
                        <div className="space-y-1">
                          <div>
                            {item.user.nickname ??
                              item.user.username ??
                              item.user.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.user.email}
                          </div>
                        </div>
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.reviewNote ?? "-"}</TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        {item.status === "PENDING" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setReviewAction("approve");
                                setReviewNote("");
                                setReviewTarget(item);
                              }}
                            >
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setReviewAction("reject");
                                setReviewNote("");
                                setReviewTarget(item);
                              }}
                            >
                              Từ chối
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isAdmin
                      ? "Chưa có yêu cầu term nào."
                      : "Bạn chưa gửi yêu cầu term nào."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Đang tải term...
        </p>
      ) : null}

      {!loading && filteredTerms.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Không tìm thấy term nào.
        </p>
      ) : null}

      {!loading &&
        grouped.map(({ tax, items }) => (
          <TaxonomyGroup
            key={tax}
            tax={tax}
            items={items}
            canManageLiveTerms={canManageLiveTerms}
            onEdit={(term) => setModal({ open: true, term, mode: "live-edit" })}
            onDelete={setDeleteTarget}
          />
        ))}

      {modal?.open ? (
        <TermModal
          mode={modal.mode}
          term={modal.term}
          defaultTaxonomy={defaultTaxonomy}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa term này?"
        description={`"${deleteTarget?.name ?? "Term"}" (${deleteTarget?.taxonomy}) sẽ bị xóa. Các truyện đang gắn term này sẽ mất liên kết.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Dialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve"
                ? "Duyệt term đề xuất"
                : "Từ chối term đề xuất"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {reviewAction === "approve"
                ? "Ghi chú duyệt là tùy chọn. Sau khi duyệt, term sẽ được tạo chính thức trong taxonomy."
                : "Lý do từ chối sẽ được gửi lại cho tác giả để họ chỉnh sửa và gửi lại."}
            </p>
            <textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              rows={4}
              maxLength={500}
              className="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={
                reviewAction === "approve"
                  ? "Ghi chú nội bộ hoặc ghi chú phản hồi..."
                  : "Slug chưa chuẩn, term bị trùng, nội dung spam..."
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="outline"
              className={
                reviewAction === "approve"
                  ? "border-primary/40 text-primary hover:bg-primary/10"
                  : "border-destructive/40 text-destructive hover:bg-destructive/10"
              }
              disabled={reviewBusy}
              onClick={() => void handleReview()}
            >
              {reviewBusy
                ? "Đang xử lý..."
                : reviewAction === "approve"
                  ? "Xác nhận duyệt"
                  : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
