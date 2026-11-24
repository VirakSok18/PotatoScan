import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { ChapterList } from "@/components/ChapterList";
import { Navbar } from "@/components/Navbar";
import { getMangaDetail } from "@/lib/provider";

export default async function MangaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  let manga: Awaited<ReturnType<typeof getMangaDetail>> | null = null;
  let errorMessage = "";

  try {
    manga = await getMangaDetail(decodedId);
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : "Could not load this title.";
  }

  if (errorMessage || !manga) {
    return (
      <div className="min-h-screen bg-[#0c0c0e]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#9393a0] hover:text-[#f4f4f6]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <div className="rounded-lg border border-[#3a2224] bg-[#1b1213] p-4 text-sm text-[#f2a6a6]">
            {errorMessage || "Title not found."}
          </div>
        </main>
      </div>
    );
  }

  const firstChapter =
    manga.chapters.length > 0
      ? manga.chapters[manga.chapters.length - 1]
      : null;
  const latestChapter = manga.chapters.length > 0 ? manga.chapters[0] : null;

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

        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="mx-auto w-44 shrink-0 sm:mx-0 sm:w-52">
            <div className="aspect-[2/3] overflow-hidden rounded-lg border border-[#24242c] bg-[#141418]">
              {manga.cover ? (
                <img
                  src={manga.cover}
                  alt={manga.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#9393a0]">
              <span className="rounded bg-[#141418] px-2 py-0.5 font-medium text-[#f4f4f6]">
                {manga.format}
              </span>
              {manga.status && (
                <span className="capitalize">{manga.status}</span>
              )}
              {manga.year && <span>{manga.year}</span>}
            </div>

            <h1 className="text-xl font-semibold leading-tight text-[#f4f4f6] sm:text-2xl">
              {manga.title}
            </h1>

            {manga.authors.length > 0 && (
              <p className="mt-1.5 text-sm text-[#9393a0]">
                {manga.authors.join(", ")}
              </p>
            )}

            {manga.tags && manga.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {manga.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-[#24242c] bg-[#141418] px-2 py-0.5 text-xs text-[#9393a0]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              {firstChapter && (
                <Link
                  href={`/read/${encodeURIComponent(
                    manga.id
                  )}/${encodeURIComponent(firstChapter.id)}`}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#38bdf8] px-5 text-sm font-semibold text-[#07131a] hover:bg-[#56ccf9] sm:flex-none"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Read Ch {firstChapter.number}</span>
                </Link>
              )}
              {latestChapter && latestChapter.id !== firstChapter?.id && (
                <Link
                  href={`/read/${encodeURIComponent(
                    manga.id
                  )}/${encodeURIComponent(latestChapter.id)}`}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-[#24242c] bg-[#141418] px-4 text-sm font-medium text-[#f4f4f6] hover:bg-[#1c1c22]"
                >
                  Latest (Ch {latestChapter.number})
                </Link>
              )}
              <BookmarkButton
                id={manga.id}
                title={manga.title}
                cover={manga.cover}
                format={manga.format}
              />
            </div>

            {manga.description && (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-[#b8b8c4]">
                {manga.description}
              </p>
            )}
          </div>
        </div>

        <ChapterList mangaId={manga.id} chapters={manga.chapters} />
      </main>
    </div>
  );
}
