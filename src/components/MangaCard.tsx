import Link from "next/link";
import type { MangaItem } from "@/lib/types";

export function MangaCard({ item }: { item: MangaItem }) {
  return (
    <Link
      href={`/manga/${encodeURIComponent(item.id)}`}
      prefetch={true}
      className="group flex flex-col gap-2"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-[#24242c] bg-[#141418]">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[#6f6f7d]">
            No cover
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-[#0c0c0e]/85 px-1.5 py-0.5 text-[10px] font-medium text-[#f4f4f6] backdrop-blur-sm">
          {item.format}
        </span>
        {item.status && (
          <span
            className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
              item.status === "Complete"
                ? "bg-emerald-500/20 text-emerald-300"
                : item.status === "Hiatus"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-[#0c0c0e]/85 text-[#38bdf8]"
            }`}
          >
            {item.status}
          </span>
        )}
        {item.latestChapter && (
          <span className="absolute bottom-2 right-2 rounded bg-[#0c0c0e]/85 px-1.5 py-0.5 text-[10px] font-medium text-[#38bdf8] backdrop-blur-sm">
            Ch {item.latestChapter}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[#f4f4f6] group-hover:text-[#38bdf8]">
          {item.title}
        </h3>
      </div>
    </Link>
  );
}
