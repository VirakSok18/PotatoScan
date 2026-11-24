import * as cheerio from "cheerio";
import type {
  ChapterItem,
  ChapterPages,
  MangaDetail,
  MangaItem,
  MediaFormat,
} from "./types";

const BASE = "https://weebcentral.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function proxyImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("/api/image")) return url;
  const absolute = url.startsWith("/") ? `${BASE}${url}` : url;
  return `/api/image?url=${encodeURIComponent(absolute)}`;
}

async function fetchHtml(url: string, revalidate = 300): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Referer: `${BASE}/`,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Upstream request failed (${res.status})`);
  }
  return await res.text();
}

function normalizeFormat(raw?: string): MangaItem["format"] {
  const v = (raw || "").trim().toLowerCase();
  if (v === "manhwa") return "Manhwa";
  if (v === "manhua") return "Manhua";
  if (v === "manga") return "Manga";
  return "Comic";
}

function parseSearchArticles(html: string): MangaItem[] {
  const $ = cheerio.load(html);
  const items: MangaItem[] = [];
  const seen = new Set<string>();

  $("article").each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find('a[href*="/series/"]').first();
    const href = linkEl.attr("href") || "";
    const match = href.match(/\/series\/([A-Z0-9]+)(?:\/([^/?#]+))?/i);
    if (!match) return;

    const id = match[1];
    if (seen.has(id)) return;
    seen.add(id);

    const title =
      $el.find("h2").first().text().trim() ||
      linkEl.attr("data-tip")?.trim() ||
      $el.find("img").first().attr("alt")?.replace(/\s+cover$/i, "").trim() ||
      linkEl.text().trim();

    if (!title) return;

    const rawCover =
      $el.find("picture img").first().attr("src") ||
      $el.find("img").first().attr("src") ||
      `https://temp.compsci88.com/cover/fallback/${id}.jpg`;

    const metaText = $el.text();
    let format: MangaItem["format"] = "Manga";
    if (/\bManhwa\b/i.test(metaText)) format = "Manhwa";
    else if (/\bManhua\b/i.test(metaText)) format = "Manhua";
    else if (/\bManga\b/i.test(metaText)) format = "Manga";

    const yearMatch = metaText.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? Number(yearMatch[0]) : null;

    const statusMatch = metaText.match(/\b(Ongoing|Complete|Hiatus|Canceled)\b/i);
    const status = statusMatch
      ? statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1).toLowerCase()
      : undefined;

    const chapMatch = metaText.match(/(?:Chapter|Episode|Ch\.?)\s*(\d+(?:\.\d+)?)/i);
    const latestChapter = chapMatch ? chapMatch[1] : undefined;

    items.push({
      id,
      title,
      cover: proxyImageUrl(rawCover),
      format,
      status,
      year,
      latestChapter,
      source: "comix",
    });
  });

  return items;
}

function buildTypeQuery(format: MediaFormat): string {
  if (format === "manhwa") return "&included_type=Manhwa";
  if (format === "manhua") return "&included_type=Manhua";
  if (format === "manga") return "&included_type=Manga";
  return "";
}

export async function getHomeFeed(format: MediaFormat = "all"): Promise<{
  trending: MangaItem[];
  latest: MangaItem[];
  source: "comix";
}> {
  const typeParam = buildTypeQuery(format);
  const [popHtml, latHtml] = await Promise.all([
    fetchHtml(
      `${BASE}/search/data?limit=18&sort=Popularity&order=Descending&display_mode=Full+Display${typeParam}`,
      600
    ),
    fetchHtml(
      `${BASE}/search/data?limit=18&sort=Latest+Updates&order=Descending&display_mode=Full+Display${typeParam}`,
      180
    ),
  ]);

  return {
    trending: parseSearchArticles(popHtml).slice(0, 18),
    latest: parseSearchArticles(latHtml).slice(0, 18),
    source: "comix",
  };
}

export async function searchManga(
  query: string
): Promise<{ items: MangaItem[]; source: "comix" }> {
  const q = query.trim();
  if (!q) return { items: [], source: "comix" };

  const html = await fetchHtml(
    `${BASE}/search/data?text=${encodeURIComponent(
      q
    )}&limit=24&display_mode=Full+Display`,
    120
  );

  return {
    items: parseSearchArticles(html),
    source: "comix",
  };
}

export async function getMangaDetail(id: string): Promise<MangaDetail> {
  const seriesId = id.split("-")[0];

  const [seriesHtml, chaptersHtml] = await Promise.all([
    fetchHtml(`${BASE}/series/${encodeURIComponent(seriesId)}`, 600),
    fetchHtml(
      `${BASE}/series/${encodeURIComponent(seriesId)}/full-chapter-list`,
      120
    ),
  ]);

  const $ = cheerio.load(seriesHtml);

  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "Untitled";

  const rawCover =
    $("picture img").first().attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    `https://temp.compsci88.com/cover/fallback/${seriesId}.jpg`;

  let description =
    $("p.whitespace-pre-wrap").first().text().trim() || "";

  const authors: string[] = [];
  const tags: string[] = [];
  let format: MangaItem["format"] = "Manga";
  let status: string | undefined;
  let year: number | null = null;

  $("li").each((_, li) => {
    const $li = $(li);
    const label = $li.find("strong").first().text().trim().toLowerCase();
    if (label.startsWith("author")) {
      $li.find("a").each((__, a) => {
        const name = $(a).text().trim();
        if (name) authors.push(name);
      });
    } else if (label.startsWith("tag")) {
      $li.find("a").each((__, a) => {
        const tag = $(a).text().trim();
        if (tag) tags.push(tag);
      });
    } else if (label.startsWith("type")) {
      format = normalizeFormat($li.find("a").first().text().trim());
    } else if (label.startsWith("status")) {
      status = $li.find("a").first().text().trim() || undefined;
    } else if (label.startsWith("released")) {
      const y = Number($li.find("span").first().text().trim());
      if (!Number.isNaN(y) && y > 1900) year = y;
    } else if (label.startsWith("description") && !description) {
      description = $li.find("p").first().text().trim();
    }
  });

  // Parse chapters
  const $ch = cheerio.load(chaptersHtml);
  const chapters: ChapterItem[] = [];
  const seen = new Set<string>();

  $ch('a[href*="/chapters/"]').each((_, a) => {
    const $a = $ch(a);
    const href = $a.attr("href") || "";
    const match = href.match(/\/chapters\/([A-Z0-9]+)/i);
    if (!match) return;

    const chId = match[1];
    if (seen.has(chId)) return;
    seen.add(chId);

    const rawLabel =
      $a.find("span.grow span").first().text().trim() ||
      $a.find("span").first().text().trim() ||
      $a.text().trim();

    const numMatch = rawLabel.match(/(\d+(?:\.\d+)?)/);
    const number = numMatch ? numMatch[1] : rawLabel || "?";
    const cleanedTitle = rawLabel
      .replace(/^(Chapter|Episode|Ch\.?)\s*\d+(?:\.\d+)?\s*[-:]?\s*/i, "")
      .trim();

    const time = $a.find("time").attr("datetime") || undefined;

    chapters.push({
      id: chId,
      number,
      title: cleanedTitle === number ? "" : cleanedTitle,
      publishedAt: time,
    });
  });

  return {
    id: seriesId,
    title,
    cover: proxyImageUrl(rawCover),
    format,
    status,
    year,
    description,
    tags: tags.slice(0, 8),
    authors: Array.from(new Set(authors)),
    chapters,
    source: "comix",
  };
}

export async function getChapterPages(chapterId: string): Promise<ChapterPages> {
  const html = await fetchHtml(
    `${BASE}/chapters/${encodeURIComponent(
      chapterId
    )}/images?is_prev=False&current_page=1&reading_style=long_strip`,
    3600
  );

  const $ = cheerio.load(html);
  const images: ChapterPages["images"] = [];

  $("img").each((_, img) => {
    const src = $(img).attr("src")?.trim();
    if (!src) return;
    images.push({
      url: proxyImageUrl(src),
    });
  });

  return {
    chapterId,
    total: images.length,
    images,
  };
}
