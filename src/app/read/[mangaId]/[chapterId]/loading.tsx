import { Loader2 } from "lucide-react";

export default function ReaderLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#08080a] text-[#9393a0]">
      <Loader2 className="h-6 w-6 animate-spin text-[#38bdf8]" />
      <p className="text-sm">Loading chapter</p>
    </div>
  );
}
