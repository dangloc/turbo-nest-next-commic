"use client";

import { Suspense } from "react";
import { VipPage } from "../../../src/features/vip/vip-page";

export default function PublicVipPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-center">Đang tải...</div>}>
      <VipPage />
    </Suspense>
  );
}
