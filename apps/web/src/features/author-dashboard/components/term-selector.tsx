"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { TermRecord } from "../types";

export const TAXONOMIES = ["tac_gia", "trang_thai", "the_loai", "post_tag", "nam_phat_hanh"] as const;
export type Taxonomy = (typeof TAXONOMIES)[number];

export const TAXONOMY_LABELS: Record<Taxonomy, string> = {
  tac_gia: "Tác giả",
  trang_thai: "Trạng thái",
  the_loai: "Thể loại",
  post_tag: "Tag",
  nam_phat_hanh: "Năm phát hành",
};

interface TermSelectorProps {
  taxonomy: Taxonomy;
  all: TermRecord[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function buildSummary(selectedTerms: TermRecord[]) {
  if (selectedTerms.length === 0) {
    return "Chưa chọn mục nào";
  }

  if (selectedTerms.length === 1) {
    return selectedTerms[0]!.name;
  }

  if (selectedTerms.length === 2) {
    return `${selectedTerms[0]!.name}, ${selectedTerms[1]!.name}`;
  }

  return `${selectedTerms[0]!.name}, ${selectedTerms[1]!.name} +${selectedTerms.length - 2}`;
}

export function TermSelector({ taxonomy, all, selected, onChange }: TermSelectorProps) {
  const [search, setSearch] = useState("");
  const options = useMemo(
    () => all.filter((term) => term.taxonomy === taxonomy),
    [all, taxonomy],
  );

  const selectedTerms = useMemo(
    () => options.filter((term) => selected.includes(term.id)),
    [options, selected],
  );

  const filteredOptions = useMemo(() => {
    const needle = normalizeSearch(search);
    if (!needle) {
      return options;
    }

    return options.filter((term) => {
      const haystacks = [term.name, term.slug].filter(Boolean).map((value) => value.toLowerCase());
      return haystacks.some((value) => value.includes(needle));
    });
  }, [options, search]);

  if (options.length === 0) {
    return null;
  }

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((value) => value !== id));
      return;
    }

    onChange([...selected, id]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{TAXONOMY_LABELS[taxonomy]}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {buildSummary(selectedTerms)}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {selectedTerms.length > 0
                  ? `${selectedTerms.length} mục đã chọn`
                  : "Chọn nhiều mục trong danh sách"}
              </div>
            </div>
            <div className="ml-3 flex items-center gap-2">
              {selectedTerms.length > 0 ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {selectedTerms.length}
                </span>
              ) : null}
              <ChevronDown className="size-4 text-muted-foreground" />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="bottom"
          className="w-[min(26rem,calc(100vw-2rem))] overflow-hidden p-0"
        >
          <div className="border-b border-border px-3 py-3">
            <div className="text-sm font-medium">{TAXONOMY_LABELS[taxonomy]}</div>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Tìm ${TAXONOMY_LABELS[taxonomy].toLowerCase()}...`}
                className="pl-9"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {filteredOptions.length} / {options.length} mục
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Không tìm thấy mục phù hợp.
              </p>
            ) : (
              filteredOptions.map((term) => {
                const active = selected.includes(term.id);
                return (
                  <button
                    key={term.id}
                    type="button"
                    onClick={() => toggle(term.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent",
                      active && "bg-accent/60",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm border",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-transparent",
                      )}
                    >
                      <Check className="size-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {term.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {term.slug}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
