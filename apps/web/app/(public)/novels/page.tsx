"use client";

import { Suspense } from "react";
import { NovelsPage } from "../../../src/features/novels/novels-page";

function NovelsFallback() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl text-sm text-muted-foreground">
        Đang tải danh sách truyện...
      </section>
    </main>
  );
}

export default function PublicNovelsPage() {
  return (
    <Suspense fallback={<NovelsFallback />}>
      <NovelsPage />
    </Suspense>
  );
}
