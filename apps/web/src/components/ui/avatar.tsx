"use client";

import { cn } from "../../lib/cn";

interface AvatarProps {
  fallback: string;
  src?: string | null;
  alt?: string;
  className?: string;
}

export function Avatar({ fallback, src, alt, className }: AvatarProps) {
  return (
    <span className={cn("shd-avatar", className)}>
      {src ? (
        <img className="shd-avatar__image" src={src} alt={alt ?? fallback} />
      ) : (
        <span className="shd-avatar__fallback">{fallback}</span>
      )}
    </span>
  );
}
