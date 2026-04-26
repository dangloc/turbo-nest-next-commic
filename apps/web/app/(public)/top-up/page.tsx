"use client";

import { Suspense } from "react";
import { TopUpPageContent } from "../../../src/features/top-up/top-up-page";

export default function TopUpPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10">Đang tải...</div>}>
      <TopUpPageContent />
    </Suspense>
  );
}
