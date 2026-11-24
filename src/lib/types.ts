export type MediaFormat = "all" | "manhwa" | "manga" | "manhua";

export interface MangaItem {
  id: string;
  title: string;
  cover: string;
  format: "Manga" | "Manhwa" | "Manhua" | "Comic";
  status?: string;
  year?: number | null;
  latestChapter?: string;
  description?: string;
  tags?: string[];
  source: "comix" | "mangadex";
}

export interface ChapterItem {
  id: string;
  number: string;
  title: string;
  group?: string;
  publishedAt?: string;
  pages?: number;
}

export interface MangaDetail extends MangaItem {
  authors: string[];
  chapters: ChapterItem[];
}

export interface ChapterPages {
  chapterId: string;
  total: number;
  images: {
    url: string;
    width?: number;
    height?: number;
  }[];
}
