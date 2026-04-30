"use client";

import { useEffect, useRef } from "react";
import type { PublicAdSettings } from "./api";

interface SponsoredNativeBannerProps {
  placement: "novel-detail" | "chapter-detail";
  settings?: PublicAdSettings | null;
}

export function SponsoredNativeBanner({
  placement,
  settings,
}: SponsoredNativeBannerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    host.innerHTML = "";

    if (
      !settings?.nativeBannerEnabled ||
      !settings.nativeBannerScriptSrc ||
      !settings.nativeBannerContainerId
    ) {
      return;
    }

    const container = document.createElement("div");
    container.id = settings.nativeBannerContainerId;
    host.appendChild(container);

    const script = document.createElement("script");
    script.async = true;
    script.src = settings.nativeBannerScriptSrc;
    script.setAttribute("data-cfasync", "false");
    host.appendChild(script);

    return () => {
      host.innerHTML = "";
    };
  }, [
    settings?.nativeBannerContainerId,
    settings?.nativeBannerEnabled,
    settings?.nativeBannerScriptSrc,
  ]);

  if (
    !settings?.nativeBannerEnabled ||
    !settings.nativeBannerScriptSrc ||
    !settings.nativeBannerContainerId
  ) {
    return null;
  }

  return (
    <aside className="sponsored-native-banner" data-placement={placement}>
      <div>
        <span>Nội dung tài trợ</span>
        <strong>Khám phá nội dung được đề xuất</strong>
      </div>
      <div ref={hostRef} className="w-full" />
    </aside>
  );
}
