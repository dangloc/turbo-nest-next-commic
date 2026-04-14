"use client";

import { cn } from "../../lib/cn";

interface AvatarProps {
  fallback: string;
  className?: string;
}

export function Avatar({ fallback, className }: AvatarProps) {
  return (
    <span className={cn("shd-avatar", className)}>
      <span className="shd-avatar__fallback">{fallback}</span>
    </span>
  );
}
