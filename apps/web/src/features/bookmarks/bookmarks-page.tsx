"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSessionToken } from "@/lib/auth/session-store";
import { formatAppDateTime } from "@/lib/i18n";
import { resolveImageUrl } from "@/lib/image";
import { AppContext } from "@/providers/app-provider";
import { ProfilePanel, ProfileShell } from "../profile-layout/profile-shell";
import {
  buildChapterHref,
  buildNovelHref,
  fetchBookmarks,
  removeBookmark,
} from "../reader/api";
import type { BookmarkEntry, BookmarkListResponse } from "../reader/types";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function bookmarkHref(bookmark: BookmarkEntry) {
  if (bookmark.chapterId) {
    return buildChapterHref(bookmark.chapterId, bookmark.novelId);
  }

  return buildNovelHref(bookmark.novelId);
}

function bookmarkTargetLabel(bookmark: BookmarkEntry) {
  if (bookmark.chapterId) {
    return bookmark.chapter?.title ?? `Chương #${bookmark.chapterId}`;
  }

  return "Truyện";
}

function getBookmarkCover(bookmark: BookmarkEntry) {
  return (
    resolveImageUrl(bookmark.novel?.featuredImage) ?? "/default-novel-cover.svg"
  );
}

function BookmarkTable({
  data,
  deletingId,
  onDelete,
}: {
  data: BookmarkListResponse;
  deletingId: number | null;
  onDelete: (bookmarkId: number) => void;
}) {
  const { locale } = useContext(AppContext);

  return (
    <Table className="profile-data-table">
      <TableHeader>
        <TableRow>
          <TableHead>Truyện</TableHead>
          <TableHead>Đọc gần nhất</TableHead>
          <TableHead>Ngày lưu</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="min-w-[260px]">
              <div className="profile-bookmark-title">
                <Link href={buildNovelHref(item.novelId)} className="profile-bookmark-cover">
                  <img
                    src={getBookmarkCover(item)}
                    alt={item.novel?.title ?? `Novel #${item.novelId}`}
                    onError={(event) => {
                      event.currentTarget.src = "/default-novel-cover.svg";
                    }}
                  />
                </Link>
                <div>
                  <Link
                    className="profile-table-title"
                    href={buildNovelHref(item.novelId)}
                  >
                    {item.novel?.title ?? `Novel #${item.novelId}`}
                  </Link>
                  <button
                    className="profile-link-danger"
                    disabled={deletingId === item.id}
                    onClick={() => onDelete(item.id)}
                    type="button"
                  >
                    Bỏ theo dõi
                  </button>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Link className="profile-table-link" href={bookmarkHref(item)}>
                {bookmarkTargetLabel(item)}
              </Link>
            </TableCell>
            <TableCell>{formatAppDateTime(item.createdAt, locale)}</TableCell>
            <TableCell className="text-right">
              <Button
                aria-label="Xóa bookmark"
                disabled={deletingId === item.id}
                onClick={() => onDelete(item.id)}
                size="sm"
                variant="outline"
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {deletingId === item.id ? "Đang xóa" : "Xóa"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function BookmarksPage() {
  const { loaded } = useContext(AppContext);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [state, setState] = useState<
    | { status: "loading"; data?: BookmarkListResponse }
    | { status: "ready"; data: BookmarkListResponse }
    | { status: "error"; message: string; data?: BookmarkListResponse }
    | { status: "unauthenticated" }
  >({ status: "loading" });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const controller = new AbortController();
    setState((current) =>
      current.status === "ready"
        ? { status: "loading", data: current.data }
        : { status: "loading" },
    );

    void (async () => {
      const token = getSessionToken() ?? undefined;
      const result = await fetchBookmarks(page, pageSize, token, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        if (result.error.status === 401 || result.error.status === 403) {
          setState({ status: "unauthenticated" });
          return;
        }

        setState({
          status: "error",
          message: result.error.message || "Không thể tải bookmark.",
        });
        return;
      }

      setState({ status: "ready", data: result.data });
    })();

    return () => controller.abort();
  }, [loaded, page, pageSize]);

  const data = "data" in state ? state.data : undefined;
  const pageTotal = Math.max(1, data?.totalPages ?? 1);
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data && data.total > 0 ? Math.min(data.total, data.page * data.pageSize) : 0;
  const isLoading = state.status === "loading";
  const canPreviousPage = (data?.page ?? page) > 1;
  const canNextPage = (data?.page ?? page) < pageTotal;

  const pageSizeLabel = useMemo(() => `${pageSize}/trang`, [pageSize]);

  async function onDelete(bookmarkId: number) {
    setDeletingId(bookmarkId);
    const token = getSessionToken() ?? undefined;
    const result = await removeBookmark(bookmarkId, token);
    setDeletingId(null);

    if (!result.ok) {
      setState((current) => ({
        status: "error",
        message: result.error.message || "Không thể xóa bookmark.",
        data: "data" in current ? current.data : undefined,
      }));
      return;
    }

    if (data && data.items.length === 1 && data.page > 1) {
      setPage(data.page - 1);
      return;
    }

    const refreshed = await fetchBookmarks(page, pageSize, token);
    if (refreshed.ok) {
      setState({ status: "ready", data: refreshed.data });
    }
  }

  if (state.status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Bookmark</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Bạn cần đăng nhập để xem danh sách bookmark.
              </p>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                href="/auth/login"
              >
                Đăng nhập
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <ProfileShell active="bookmarks">
      <ProfilePanel
        title="TRUYỆN ĐANG THEO DÕI"
        actions={
          <Link className="profile-secondary-action" href="/novels">
            Tìm truyện
          </Link>
        }
      >
        <Card className="profile-inner-card">
          <CardHeader className="profile-inner-card__header">
            <div>
              <CardTitle>Danh sách tủ truyện</CardTitle>
              <p>
                {data ? `${from}-${to} trong ${data.total} truyện` : "Đang tải dữ liệu"}
              </p>
            </div>
            <select
              className="shd-select h-10 w-[130px]"
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              aria-label="Số bookmark mỗi trang"
            >
              {PAGE_SIZE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}/trang
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            {isLoading && !data ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Đang tải bookmark...
              </p>
            ) : state.status === "error" && !data ? (
              <p className="py-10 text-center text-sm text-destructive">
                {state.message}
              </p>
            ) : data && data.items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Bạn chưa lưu bookmark nào.
              </p>
            ) : data ? (
              <BookmarkTable
                data={data}
                deletingId={deletingId}
                onDelete={onDelete}
              />
            ) : null}

            {state.status === "error" && data ? (
              <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.message}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                disabled={isLoading || !canPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                variant="outline"
              >
                Trước
              </Button>
              <p className="text-sm text-muted-foreground">
                Trang {data?.page ?? page} / {pageTotal} · {pageSizeLabel}
              </p>
              <Button
                disabled={isLoading || !canNextPage}
                onClick={() => setPage((current) => current + 1)}
                variant="outline"
              >
                Tiếp
              </Button>
            </div>
          </CardContent>
        </Card>
      </ProfilePanel>
    </ProfileShell>
  );
}
