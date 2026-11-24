"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
  getBookmarks,
  getHistory,
  type HistoryEntry,
  type SavedSeries,
} from "@/lib/storage";

export default function LibraryPage() {
  const [bookmarks, setBookmarks] = useState<SavedSeries[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setBookmarks(getBookmarks());
    setHistory(getHistory());
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0c0e]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#9393a0] hover:text-[#f4f4f6]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to browse</span>
        </Link>

        <section className="mb-10">
          <h1 className="mb-4 text-lg font-semibold text-[#f4f4f6]">
            Saved titles
          </h1>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-[#9393a0]">
              You have not saved any titles yet. Open a series and tap Save.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {bookmarks.map((item) => (
                <Link
                  key={item.id}
                  href={`/manga/${encodeURIComponent(item.id)}`}
                  className="group flex flex-col gap-2"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-[#24242c] bg-[#141418]">
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <span className="absolute left-2 top-2 rounded bg-[#0c0c0e]/85 px-1.5 py-0.5 text-[10px] font-medium text-[#f4f4f6]">
                      {item.format}
                    </span>
                  </div>
                  <span className="line-clamp-2 text-sm font-medium text-[#f4f4f6] group-hover:text-[#38bdf8]">
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#f4f4f6]">
            Reading history
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-[#9393a0]">No chapters read yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((entry) => (
                <Link
                  key={entry.mangaId}
                  href={`/read/${encodeURIComponent(
                    entry.mangaId
                  )}/${encodeURIComponent(entry.chapterId)}`}
                  className="flex items-center gap-3 rounded-lg border border-[#24242c] bg-[#141418] p-2.5 hover:bg-[#1c1c22]"
                >
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-[#0c0c0e]">
                    {entry.mangaCover ? (
                      <img
                        src={entry.mangaCover}
                        alt={entry.mangaTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#f4f4f6]">
                      {entry.mangaTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-[#38bdf8]">
                      Chapter {entry.chapterNumber}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
