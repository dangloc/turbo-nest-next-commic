"use client";

import { Suspense } from "react";
import { TopUpPageContent } from "../../../../src/features/top-up/top-up-page";

export default function ProfileDonatePage() {
  return (
    <Suspense fallback={<div className="profile-portal">Đang tải...</div>}>
      <TopUpPageContent />
    </Suspense>
  );
}
