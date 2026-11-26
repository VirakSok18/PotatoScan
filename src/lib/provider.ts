import * as cheerio from "cheerio";
import type {
  ChapterItem,
  ChapterPages,
  MangaDetail,
  MangaItem,
  MediaFormat,
} from "./types";

const BASE = "https://weebcentral.com";
const MD_API = "https://api.mangadex.org";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function mapMdFormat(lang?: string): MangaItem["format"] {
  if (lang === "ko") return "Manhwa";
  if (lang === "zh" || lang === "zh-hk") return "Manhua";
  if (lang === "ja") return "Manga";
  return "Comic";
}

function pickLocalized(map?: Record<string, string>): string {
  if (!map) return "";
  return map.en || map["ja-ro"] || map["ko-ro"] || Object.values(map)[0] || "";
}

async function searchMangaDex(query: string): Promise<MangaItem[]> {
  try {
    const url = `${MD_API}/manga?title=${encodeURIComponent(
      query
    )}&limit=16&includes[]=cover_art&availableTranslatedLanguage[]=en&contentRating[]=safe&contentRating[]=suggestive&order[relevance]=desc`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PotatoScan/1.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        attributes?: {
          title?: Record<string, string>;
          originalLanguage?: string;
          status?: string;
          year?: number | null;
          lastChapter?: string | null;
        };
        relationships?: Array<{
          type: string;
          attributes?: { fileName?: string };
        }>;
      }>;
    };

    return (json.data || []).map((m) => {
      const title = pickLocalized(m.attributes?.title) || "Untitled";
      const coverRel = m.relationships?.find((r) => r.type === "cover_art");
      const fileName = coverRel?.attributes?.fileName;
      const rawCover = fileName
        ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.512.jpg`
        : "";
      const rawStatus = m.attributes?.status;
      const status = rawStatus
        ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
        : undefined;

      return {
        id: `md_${m.id}`,
        title,
        cover: proxyImageUrl(rawCover),
        format: mapMdFormat(m.attributes?.originalLanguage),
        status,
        year: m.attributes?.year ?? null,
        latestChapter: m.attributes?.lastChapter || undefined,
        source: "comix" as const,
      };
    });
  } catch {
    return [];
  }
}

async function getMangaDexDetail(uuid: string): Promise<MangaDetail> {
  const [mangaRes, feedRes] = await Promise.all([
    fetch(`${MD_API}/manga/${encodeURIComponent(uuid)}?includes[]=cover_art&includes[]=author`, {
      headers: { "User-Agent": "PotatoScan/1.0" },
      next: { revalidate: 600 },
    }),
    fetch(
      `${MD_API}/manga/${encodeURIComponent(
        uuid
      )}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=500&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`,
      {
        headers: { "User-Agent": "PotatoScan/1.0" },
        next: { revalidate: 180 },
      }
    ),
  ]);

  if (!mangaRes.ok) {
    throw new Error(`Series fetch failed (${mangaRes.status})`);
  }

  const mangaJson = (await mangaRes.json()) as {
    data: {
      id: string;
      attributes?: {
        title?: Record<string, string>;
        description?: Record<string, string>;
        originalLanguage?: string;
        status?: string;
        year?: number | null;
        tags?: Array<{ attributes?: { name?: Record<string, string> } }>;
      };
      relationships?: Array<{
        type: string;
        attributes?: { fileName?: string; name?: string };
      }>;
    };
  };

  const m = mangaJson.data;
  const title = pickLocalized(m.attributes?.title) || "Untitled";
  const description = pickLocalized(m.attributes?.description) || "";
  const coverRel = m.relationships?.find((r) => r.type === "cover_art");
  const fileName = coverRel?.attributes?.fileName;
  const rawCover = fileName
    ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.512.jpg`
    : "";
  const authors = (m.relationships || [])
    .filter((r) => r.type === "author" && r.attributes?.name)
    .map((r) => r.attributes!.name!);
  const tags = (m.attributes?.tags || [])
    .map((t) => pickLocalized(t.attributes?.name))
    .filter(Boolean)
    .slice(0, 8);
  const rawStatus = m.attributes?.status;
  const status = rawStatus
    ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
    : undefined;

  const chapters: ChapterItem[] = [];
  if (feedRes.ok) {
    const feedJson = (await feedRes.json()) as {
      data?: Array<{
        id: string;
        attributes?: {
          chapter?: string | null;
          title?: string | null;
          publishAt?: string;
          pages?: number;
          externalUrl?: string | null;
        };
      }>;
    };

    const seenNum = new Set<string>();
    for (const ch of feedJson.data || []) {
      // Skip external-only chapters that have 0 hosted pages
      if (ch.attributes?.externalUrl && !ch.attributes?.pages) continue;
      const num = ch.attributes?.chapter || "?";
      if (num !== "?" && seenNum.has(num)) continue;
      seenNum.add(num);
      chapters.push({
        id: `md_${ch.id}`,
        number: num,
        title: ch.attributes?.title || "",
        publishedAt: ch.attributes?.publishAt,
      });
    }
  }

  return {
    id: `md_${m.id}`,
    title,
    cover: proxyImageUrl(rawCover),
    format: mapMdFormat(m.attributes?.originalLanguage),
    status,
    year: m.attributes?.year ?? null,
    description,
    tags,
    authors: Array.from(new Set(authors)),
    chapters,
    source: "comix",
  };
}

async function getMangaDexChapterPages(
  chapterUuid: string
): Promise<ChapterPages> {
  const res = await fetch(
    `${MD_API}/at-home/server/${encodeURIComponent(chapterUuid)}`,
    {
      headers: { "User-Agent": "PotatoScan/1.0" },
      next: { revalidate: 1800 },
    }
  );
  if (!res.ok) {
    throw new Error(`Chapter pages fetch failed (${res.status})`);
  }
  const json = (await res.json()) as {
    baseUrl?: string;
    chapter?: { hash?: string; data?: string[]; dataSaver?: string[] };
  };
  const baseUrl = json.baseUrl || "";
  const hash = json.chapter?.hash || "";
  const files = json.chapter?.data || json.chapter?.dataSaver || [];
  const mode = json.chapter?.data?.length ? "data" : "data-saver";

  const images = files.map((file) => ({
    url: proxyImageUrl(`${baseUrl}/${mode}/${hash}/${file}`),
  }));

  return {
    chapterId: `md_${chapterUuid}`,
    total: images.length,
    images,
  };
}

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

  let primary: MangaItem[] = [];
  try {
    const html = await fetchHtml(
      `${BASE}/search/data?text=${encodeURIComponent(
        q
      )}&limit=24&display_mode=Full+Display`,
      120
    );
    primary = parseSearchArticles(html);
  } catch {
    primary = [];
  }

  // Fallback to MangaDex when primary returns fewer than 6 results
  if (primary.length < 6) {
    const mdItems = await searchMangaDex(q);
    const seenTitles = new Set(
      primary.map((i) => i.title.toLowerCase().trim())
    );
    for (const item of mdItems) {
      const key = item.title.toLowerCase().trim();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      primary.push(item);
    }
  }

  return {
    items: primary,
    source: "comix",
  };
}

export async function getMangaDetail(id: string): Promise<MangaDetail> {
  if (id.startsWith("md_")) {
    return getMangaDexDetail(id.slice(3));
  }
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
  if (chapterId.startsWith("md_")) {
    return getMangaDexChapterPages(chapterId.slice(3));
  }
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
