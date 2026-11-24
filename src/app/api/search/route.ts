import { NextRequest, NextResponse } from "next/server";
import { searchManga } from "@/lib/provider";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const { items } = await searchManga(q);
    return NextResponse.json(
      { items: items.slice(0, 6) },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      }
    );
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
