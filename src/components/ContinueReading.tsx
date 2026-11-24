"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getHistory, type HistoryEntry } from "@/lib/storage";

export function ContinueReading() {
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setItems(getHistory().slice(0, 8));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#f4f4f6]">
          Continue reading
        </h2>
        <Link
          href="/library"
          className="text-xs font-medium text-[#9393a0] hover:text-[#38bdf8]"
        >
          View all
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {items.map((entry) => (
          <Link
            key={entry.mangaId}
            href={`/read/${encodeURIComponent(entry.mangaId)}/${encodeURIComponent(
              entry.chapterId
            )}`}
            className="group flex w-64 shrink-0 items-center gap-3 rounded-xl border border-[#1f1f27] bg-[#131317] p-2.5 transition-colors hover:border-[#38bdf8]/40 hover:bg-[#18181f]"
          >
            <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-[#0c0c0e]">
              {entry.mangaCover ? (
                <img
                  src={entry.mangaCover}
                  alt={entry.mangaTitle}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#f4f4f6] group-hover:text-[#38bdf8]">
                {entry.mangaTitle}
              </p>
              <p className="mt-1 text-xs font-medium text-[#38bdf8]">
                Chapter {entry.chapterNumber}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
