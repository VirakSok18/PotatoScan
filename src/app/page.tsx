import { ContinueReading } from "@/components/ContinueReading";
import { FormatTabs } from "@/components/FormatTabs";
import { MangaCard } from "@/components/MangaCard";
import { Navbar } from "@/components/Navbar";
import { getHomeFeed } from "@/lib/provider";
import type { MediaFormat } from "@/lib/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const params = await searchParams;
  const rawFormat = params.format as MediaFormat | undefined;
  const format: MediaFormat =
    rawFormat && ["all", "manhwa", "manga", "manhua"].includes(rawFormat)
      ? rawFormat
      : "all";

  let trending: Awaited<ReturnType<typeof getHomeFeed>>["trending"] = [];
  let latest: Awaited<ReturnType<typeof getHomeFeed>>["latest"] = [];
  let errorMessage = "";

  try {
    const feed = await getHomeFeed(format);
    trending = feed.trending;
    latest = feed.latest;
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : "Could not load catalog.";
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <FormatTabs format={format} />

        <ContinueReading />

        {errorMessage ? (
          <div className="rounded-lg border border-[#3a2224] bg-[#1b1213] p-4 text-sm text-[#f2a6a6]">
            {errorMessage}
          </div>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="mb-4 text-base font-semibold text-[#f4f4f6]">
                Popular now
              </h2>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {trending.map((item) => (
                  <MangaCard key={item.id} item={item} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-base font-semibold text-[#f4f4f6]">
                Latest updates
              </h2>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {latest.map((item) => (
                  <MangaCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
