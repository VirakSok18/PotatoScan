import { NextRequest, NextResponse } from "next/server";

async function fetchImageWithRetry(url: string, origin: string): Promise<Response> {
  const isMangaDex =
    origin.includes("mangadex.org") || origin.includes("mangadex.network");
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Referer: isMangaDex ? "https://mangadex.org/" : "https://weebcentral.com/",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok || res.status < 500) {
        return res;
      }
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }

  throw new Error("Image fetch failed");
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = url.startsWith("/") ? new URL(url, "https://comix.to") : new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  try {
    const upstream = await fetchImageWithRetry(parsed.toString(), parsed.origin);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Image fetch failed (${upstream.status})` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 502 });
  }
}
