"use client";

import Link from "next/link";
import { ArrowDownUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ChapterItem } from "@/lib/types";

interface ChapterListProps {
  mangaId: string;
  chapters: ChapterItem[];
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChapterList({ mangaId, chapters }: ChapterListProps) {
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [filter, setFilter] = useState("");

  const visibleChapters = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const base = order === "desc" ? chapters : [...chapters].reverse();
    if (!q) return base;

    const matched = base.filter(
      (c) =>
        c.number.toLowerCase().includes(q) ||
        (c.title && c.title.toLowerCase().includes(q))
    );

    return matched.sort((a, b) => {
      const aNum = a.number.toLowerCase();
      const bNum = b.number.toLowerCase();

      const aExact = aNum === q ? 0 : aNum.startsWith(q) ? 1 : 2;
      const bExact = bNum === q ? 0 : bNum.startsWith(q) ? 1 : 2;
      if (aExact !== bExact) return aExact - bExact;

      const aVal = parseFloat(a.number);
      const bVal = parseFloat(b.number);
      if (!Number.isNaN(aVal) && !Number.isNaN(bVal)) {
        return aVal - bVal;
      }
      return aNum.localeCompare(bNum);
    });
  }, [chapters, order, filter]);

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-[#f4f4f6]">
          Chapters ({chapters.length})
        </h2>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9393a0]" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Jump to chapter"
              aria-label="Filter chapters"
              className="h-9 w-full rounded-lg border border-[#24242c] bg-[#141418] pl-8 pr-3 text-xs text-[#f4f4f6] placeholder:text-[#6f6f7d] focus:border-[#38bdf8] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#24242c] bg-[#141418] px-3 text-xs font-medium text-[#f4f4f6] hover:bg-[#1c1c22]"
          >
            <ArrowDownUp className="h-3.5 w-3.5 text-[#38bdf8]" />
            <span>{order === "desc" ? "Newest" : "Oldest"}</span>
          </button>
        </div>
      </div>

      {visibleChapters.length === 0 ? (
        <p className="text-sm text-[#9393a0]">
          No matching chapters found
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {visibleChapters.map((ch) => {
            const dateStr = formatDate(ch.publishedAt);
            return (
              <Link
                key={ch.id}
                href={`/read/${encodeURIComponent(
                  mangaId
                )}/${encodeURIComponent(ch.id)}`}
                className="group flex flex-col justify-between rounded-lg border border-[#24242c] bg-[#141418] px-3.5 py-2.5 transition-colors hover:border-[#38bdf8]/50 hover:bg-[#1c1c22]"
              >
                <span className="truncate text-sm font-medium text-[#f4f4f6] group-hover:text-[#38bdf8]">
                  Chapter {ch.number}
                </span>
                {ch.title ? (
                  <span className="mt-0.5 truncate text-xs text-[#9393a0]">
                    {ch.title}
                  </span>
                ) : dateStr ? (
                  <span className="mt-0.5 text-[11px] text-[#6f6f7d]">
                    {dateStr}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
