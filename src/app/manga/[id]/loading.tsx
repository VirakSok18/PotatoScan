import { Navbar } from "@/components/Navbar";

export default function MangaDetailLoading() {
  return (
    <div className="min-h-screen bg-[#0c0c0e]">
      <Navbar />
      <main className="delayed-loader mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <div className="mb-5 h-4 w-28 rounded skeleton" />
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="mx-auto aspect-[2/3] w-44 shrink-0 rounded-lg skeleton sm:mx-0 sm:w-52" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-32 rounded skeleton" />
            <div className="h-7 w-2/3 rounded skeleton" />
            <div className="h-4 w-40 rounded skeleton" />
            <div className="flex gap-2 pt-2">
              <div className="h-11 w-36 rounded-lg skeleton" />
              <div className="h-11 w-24 rounded-lg skeleton" />
            </div>
            <div className="space-y-2 pt-3">
              <div className="h-3.5 w-full rounded skeleton" />
              <div className="h-3.5 w-5/6 rounded skeleton" />
              <div className="h-3.5 w-2/3 rounded skeleton" />
            </div>
          </div>
        </div>
        <div className="mt-10">
          <div className="mb-4 h-5 w-32 rounded skeleton" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-14 w-full rounded-lg skeleton" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
