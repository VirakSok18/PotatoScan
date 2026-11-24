import { MangaCard } from "@/components/MangaCard";
import { Navbar } from "@/components/Navbar";
import { searchManga } from "@/lib/provider";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";

  let items: Awaited<ReturnType<typeof searchManga>>["items"] = [];
  let errorMessage = "";

  if (query) {
    try {
      const res = await searchManga(query);
      items = res.items;
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : "Search request failed.";
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e]">
      <Navbar initialQuery={query} />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <h1 className="mb-5 text-lg font-semibold text-[#f4f4f6]">
          {query ? `Results for "${query}"` : "Search"}
        </h1>

        {errorMessage ? (
          <div className="rounded-lg border border-[#3a2224] bg-[#1b1213] p-4 text-sm text-[#f2a6a6]">
            {errorMessage}
          </div>
        ) : !query ? (
          <p className="text-sm text-[#9393a0]">
            Enter a title in the search bar to find manga, manhwa, or manhua.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[#9393a0]">
            No titles matched &quot;{query}&quot;.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <MangaCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
