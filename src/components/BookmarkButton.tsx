"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { isBookmarked, toggleBookmark } from "@/lib/storage";

interface BookmarkButtonProps {
  id: string;
  title: string;
  cover: string;
  format: string;
}

export function BookmarkButton({ id, title, cover, format }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(id));
  }, [id]);

  function handleClick() {
    const next = toggleBookmark({ id, title, cover, format });
    setSaved(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
        saved
          ? "border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8]"
          : "border-[#24242c] bg-[#141418] text-[#f4f4f6] hover:bg-[#1c1c22]"
      }`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-[#38bdf8]" : ""}`} />
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
