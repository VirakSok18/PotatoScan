"use client";

import Link from "next/link";
import { TabBar } from "glisse";
import { useEffect, useState } from "react";
import type { MediaFormat } from "@/lib/types";

const ITEMS = [
  { value: "all", label: "All", href: "/" },
  { value: "manhwa", label: "Manhwa", href: "/?format=manhwa" },
  { value: "manga", label: "Manga", href: "/?format=manga" },
  { value: "manhua", label: "Manhua", href: "/?format=manhua" },
];

export function FormatTabs({ format }: { format: MediaFormat }) {
  const [active, setActive] = useState<MediaFormat>(format);

  useEffect(() => {
    setActive(format);
  }, [format]);

  return (
    <div className="mb-4 flex overflow-x-auto py-3 no-scrollbar">
      <TabBar
        items={ITEMS}
        value={active}
        onValueChange={(v) => setActive(v as MediaFormat)}
        link={Link}
        aria-label="Filter by format"
      />
    </div>
  );
}
