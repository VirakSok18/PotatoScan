import Link from "next/link";
import { ReaderView } from "@/components/ReaderView";
import { getChapterPages, getMangaDetail } from "@/lib/provider";

export default async function ReadChapterPage({
  params,
}: {
  params: Promise<{ mangaId: string; chapterId: string }>;
}) {
  const { mangaId, chapterId } = await params;
  const decodedMangaId = decodeURIComponent(mangaId);
  const decodedChapterId = decodeURIComponent(chapterId);

  try {
    const [manga, pages] = await Promise.all([
      getMangaDetail(decodedMangaId),
      getChapterPages(decodedChapterId),
    ]);

    const currentChapter =
      manga.chapters.find((c) => c.id === decodedChapterId) || null;

    return (
      <ReaderView
        mangaId={manga.id}
        mangaTitle={manga.title}
        mangaCover={manga.cover}
        chapterId={decodedChapterId}
        currentChapter={currentChapter}
        chapters={manga.chapters}
        images={pages.images}
      />
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load chapter pages.";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0c0e] px-4 text-center">
        <p className="mb-4 text-sm text-[#f2a6a6]">{message}</p>
        <Link
          href={`/manga/${encodeURIComponent(decodedMangaId)}`}
          className="rounded-lg bg-[#38bdf8] px-4 py-2 text-sm font-semibold text-[#07131a]"
        >
          Back to series
        </Link>
      </div>
    );
  }
}
