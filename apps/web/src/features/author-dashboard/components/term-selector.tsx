"use client";

import { cn } from "@/lib/cn";
import type { TermRecord } from "../types";

export const TAXONOMIES = ["author", "status", "genre", "posttag", "year"] as const;
export type Taxonomy = (typeof TAXONOMIES)[number];

export const TAXONOMY_LABELS: Record<Taxonomy, string> = {
  author: "Tác giả",
  status: "Trạng thái",
  genre: "Thể loại",
  posttag: "Tag",
  year: "Năm phát hành",
};

interface TermSelectorProps {
  taxonomy: Taxonomy;
  all: TermRecord[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export function TermSelector({ taxonomy, all, selected, onChange }: TermSelectorProps) {
  const options = all.filter((t) => t.taxonomy === taxonomy);
  if (options.length === 0) return null;

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{TAXONOMY_LABELS[taxonomy]}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((term) => {
          const active = selected.includes(term.id);
          return (
            <button
              key={term.id}
              type="button"
              onClick={() => toggle(term.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent text-foreground",
              )}
            >
              {term.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
