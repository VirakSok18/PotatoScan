export interface SavedSeries {
  id: string;
  title: string;
  cover: string;
  format: string;
  savedAt: number;
}

export interface HistoryEntry {
  mangaId: string;
  mangaTitle: string;
  mangaCover: string;
  chapterId: string;
  chapterNumber: string;
  updatedAt: number;
}

const BOOKMARKS_KEY = "potatoscan_bookmarks_v1";
const HISTORY_KEY = "potatoscan_history_v1";
const MUSIC_KEY = "potatoscan_music_v1";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function getBookmarks(): SavedSeries[] {
  return safeRead<SavedSeries[]>(BOOKMARKS_KEY, []);
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().some((b) => b.id === id);
}

export function toggleBookmark(series: Omit<SavedSeries, "savedAt">): boolean {
  const list = getBookmarks();
  const exists = list.some((b) => b.id === series.id);
  const next = exists
    ? list.filter((b) => b.id !== series.id)
    : [{ ...series, savedAt: Date.now() }, ...list];
  safeWrite(BOOKMARKS_KEY, next);
  return !exists;
}

export function getHistory(): HistoryEntry[] {
  return safeRead<HistoryEntry[]>(HISTORY_KEY, []);
}

export function recordHistory(entry: Omit<HistoryEntry, "updatedAt">): void {
  const list = getHistory().filter((h) => h.mangaId !== entry.mangaId);
  const next = [{ ...entry, updatedAt: Date.now() }, ...list].slice(0, 30);
  safeWrite(HISTORY_KEY, next);
}

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      if (
        (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") &&
        parts[1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function getSeriesMusic(mangaId: string): string | null {
  const map = safeRead<Record<string, string>>(MUSIC_KEY, {});
  return map[mangaId] || null;
}

export function setSeriesMusic(mangaId: string, url: string | null): void {
  const map = safeRead<Record<string, string>>(MUSIC_KEY, {});
  if (!url) {
    delete map[mangaId];
  } else {
    map[mangaId] = url;
  }
  safeWrite(MUSIC_KEY, map);
}
