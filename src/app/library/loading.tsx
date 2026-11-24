import { Navbar } from "@/components/Navbar";

export default function LibraryLoading() {
  return (
    <div className="min-h-screen bg-[#0c0c0e]">
      <Navbar />
      <main className="delayed-loader mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <div className="mb-4 h-6 w-32 rounded skeleton" />
        <div className="mb-10 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[2/3] w-full rounded-lg skeleton" />
              <div className="h-4 w-4/5 rounded skeleton" />
            </div>
          ))}
        </div>
        <div className="mb-4 h-6 w-36 rounded skeleton" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 w-full rounded-lg skeleton" />
          ))}
        </div>
      </main>
    </div>
  );
}
