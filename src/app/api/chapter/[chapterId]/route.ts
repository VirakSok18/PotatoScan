import { NextResponse } from "next/server";
import { getChapterPages } from "@/lib/provider";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const decoded = decodeURIComponent(chapterId);

  try {
    const pages = await getChapterPages(decoded);
    return NextResponse.json(pages, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json({ chapterId: decoded, total: 0, images: [] });
  }
}
