"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSessionToken } from "@/lib/auth/session-store";
import { formatAppCurrency, formatAppDateTime } from "@/lib/i18n";
import { AppContext } from "@/providers/app-provider";
import {
  fetchComboPurchaseHistory,
  fetchPurchaseHistory,
  type ComboPurchaseHistoryResponse,
  type PurchaseHistoryResponse,
} from "../finance/api";
import { buildChapterHref, buildNovelHref } from "../reader/types";
import { ProfilePanel, ProfileShell } from "./profile-shell";

type PurchaseTab = "chapters" | "combos";

export function ProfilePurchasesPage() {
  const { loaded, locale } = useContext(AppContext);
  const [tab, setTab] = useState<PurchaseTab>("chapters");
  const [chapterPage, setChapterPage] = useState(1);
  const [comboPage, setComboPage] = useState(1);
  const [chapterState, setChapterState] = useState<
    | { status: "loading"; data?: PurchaseHistoryResponse }
    | { status: "ready"; data: PurchaseHistoryResponse }
    | { status: "error"; message: string; data?: PurchaseHistoryResponse }
  >({ status: "loading" });
  const [comboState, setComboState] = useState<
    | { status: "loading"; data?: ComboPurchaseHistoryResponse }
    | { status: "ready"; data: ComboPurchaseHistoryResponse }
    | { status: "error"; message: string; data?: ComboPurchaseHistoryResponse }
  >({ status: "loading" });

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const controller = new AbortController();
    setChapterState((current) =>
      current.status === "ready"
        ? { status: "loading", data: current.data }
        : { status: "loading" },
    );

    void (async () => {
      const token = getSessionToken() ?? undefined;
      const result = await fetchPurchaseHistory(chapterPage, 10, token, controller.signal);
      if (controller.signal.aborted) return;

      if (!result.ok) {
        setChapterState({
          status: "error",
          message: result.error.message || "Không thể tải chương đã mua.",
        });
        return;
      }

      setChapterState({ status: "ready", data: result.data });
    })();

    return () => controller.abort();
  }, [loaded, chapterPage]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const controller = new AbortController();
    setComboState((current) =>
      current.status === "ready"
        ? { status: "loading", data: current.data }
        : { status: "loading" },
    );

    void (async () => {
      const token = getSessionToken() ?? undefined;
      const result = await fetchComboPurchaseHistory(comboPage, 10, token, controller.signal);
      if (controller.signal.aborted) return;

      if (!result.ok) {
        setComboState({
          status: "error",
          message: result.error.message || "Không thể tải combo đã mua.",
        });
        return;
      }

      setComboState({ status: "ready", data: result.data });
    })();

    return () => controller.abort();
  }, [loaded, comboPage]);

  const chapterData = "data" in chapterState ? chapterState.data : undefined;
  const comboData = "data" in comboState ? comboState.data : undefined;

  return (
    <ProfileShell active="purchases">
      <ProfilePanel title="TRUYỆN ĐÃ MUA">
        <div className="profile-tabs">
          <button
            type="button"
            className={tab === "chapters" ? "is-active" : undefined}
            onClick={() => setTab("chapters")}
          >
            Chương đã mở khóa
          </button>
          <button
            type="button"
            className={tab === "combos" ? "is-active" : undefined}
            onClick={() => setTab("combos")}
          >
            Mở khóa trọn bộ
          </button>
        </div>

        {tab === "chapters" ? (
          <div className="profile-tab-panel">
            {chapterState.status === "loading" && !chapterData ? (
              <p className="profile-empty-state">Đang tải chương đã mua...</p>
            ) : chapterState.status === "error" && !chapterData ? (
              <p className="profile-error-state">{chapterState.message}</p>
            ) : chapterData && chapterData.items.length === 0 ? (
              <p className="profile-empty-state">Chưa mua chương nào.</p>
            ) : chapterData ? (
              <>
                <Table className="profile-data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Truyện</TableHead>
                      <TableHead>Chương</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Ngày mua</TableHead>
                      <TableHead className="text-right">Đọc</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapterData.items.map((item) => (
                      <TableRow key={item.purchasedChapterId}>
                        <TableCell>
                          <Link className="profile-table-title" href={buildNovelHref(item.novelId)}>
                            {item.novelTitle}
                          </Link>
                        </TableCell>
                        <TableCell>{item.chapterTitle}</TableCell>
                        <TableCell>{formatAppCurrency(item.pricePaid, locale)}</TableCell>
                        <TableCell>{formatAppDateTime(item.purchasedAt, locale)}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            className="profile-table-link"
                            href={buildChapterHref(item.chapterId, item.novelId)}
                          >
                            Mở chương
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="profile-pagination">
                  <Button
                    variant="outline"
                    disabled={chapterPage <= 1 || chapterState.status === "loading"}
                    onClick={() => setChapterPage((current) => Math.max(1, current - 1))}
                  >
                    Trước
                  </Button>
                  <span>
                    Trang {chapterData.page} / {chapterData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={
                      chapterData.page >= chapterData.totalPages ||
                      chapterState.status === "loading"
                    }
                    onClick={() => setChapterPage((current) => current + 1)}
                  >
                    Tiếp
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="profile-tab-panel">
            {comboState.status === "loading" && !comboData ? (
              <p className="profile-empty-state">Đang tải combo đã mua...</p>
            ) : comboState.status === "error" && !comboData ? (
              <p className="profile-error-state">{comboState.message}</p>
            ) : comboData && comboData.items.length === 0 ? (
              <p className="profile-empty-state">Chưa mua combo truyện nào.</p>
            ) : comboData ? (
              <>
                <Table className="profile-data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Truyện</TableHead>
                      <TableHead>Số chương</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Ngày mua</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comboData.items.map((item) => (
                      <TableRow key={item.transactionId}>
                        <TableCell>
                          <Link className="profile-table-title" href={buildNovelHref(item.novelId)}>
                            {item.novelTitle}
                          </Link>
                        </TableCell>
                        <TableCell>{item.purchasedChapterCount} chương</TableCell>
                        <TableCell>{formatAppCurrency(item.chargedAmount, locale)}</TableCell>
                        <TableCell>{formatAppDateTime(item.purchasedAt, locale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="profile-pagination">
                  <Button
                    variant="outline"
                    disabled={comboPage <= 1 || comboState.status === "loading"}
                    onClick={() => setComboPage((current) => Math.max(1, current - 1))}
                  >
                    Trước
                  </Button>
                  <span>
                    Trang {comboData.page} / {comboData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={
                      comboData.page >= comboData.totalPages ||
                      comboState.status === "loading"
                    }
                    onClick={() => setComboPage((current) => current + 1)}
                  >
                    Tiếp
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </ProfilePanel>
    </ProfileShell>
  );
}
