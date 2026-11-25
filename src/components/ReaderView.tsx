"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Music,
  Pause,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { recordHistory } from "@/lib/storage";
import type { ChapterItem } from "@/lib/types";
import { useReaderSoundtrack } from "./ReaderSoundtrackContext";

interface ReaderViewProps {
  mangaId: string;
  mangaTitle: string;
  mangaCover: string;
  chapterId: string;
  currentChapter: ChapterItem | null;
  chapters: ChapterItem[];
  images: { url: string; width?: number; height?: number }[];
}

const SPEEDS = [
  { label: "0.5x", pxPerSec: 45 },
  { label: "1x", pxPerSec: 90 },
  { label: "1.5x", pxPerSec: 150 },
  { label: "2x", pxPerSec: 230 },
  { label: "3x", pxPerSec: 340 },
];

function ReaderPageImage({
  src,
  alt,
  eager,
}: {
  src: string;
  alt: string;
  eager: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full">
      {!loaded && (
        <div className="flex aspect-[2/3] w-full items-center justify-center skeleton">
          <span className="text-xs text-[#6f6f7d]">{alt}</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`block h-auto w-full select-none transition-opacity duration-200 ${
          loaded ? "opacity-100" : "absolute inset-0 opacity-0"
        }`}
      />
    </div>
  );
}

export function ReaderView({
  mangaId,
  mangaTitle,
  mangaCover,
  chapterId,
  currentChapter,
  chapters,
  images,
}: ReaderViewProps) {
  const router = useRouter();
  const soundtrack = useReaderSoundtrack();

  const [hudVisible, setHudVisibleLocal] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [progress, setProgress] = useState(0);

  const speedRef = useRef(SPEEDS[1].pxPerSec);
  const hoverEdgeRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setHud(visible: boolean) {
    setHudVisibleLocal(visible);
    soundtrack.setHudVisible(visible);
  }

  function scheduleHide(delay = 2500) {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!hoverEdgeRef.current && !soundtrack.hoveringPopoverRef.current) {
        setHud(false);
      }
    }, delay);
  }

  function showHudBriefly() {
    setHud(true);
    scheduleHide(2800);
  }

  useEffect(() => {
    setHud(true);
    scheduleHide(2800);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const nearTop = e.clientY <= 84;
      const nearBottom = window.innerHeight - e.clientY <= 84;
      const nearEdge = nearTop || nearBottom;
      hoverEdgeRef.current = nearEdge;

      if (nearEdge || soundtrack.hoveringPopoverRef.current) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setHud(true);
      } else {
        scheduleHide(1400);
      }
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    speedRef.current = SPEEDS[speedIndex].pxPerSec;
  }, [speedIndex]);

  const currentIdx = chapters.findIndex((c) => c.id === chapterId);
  const nextChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const prevChapter =
    currentIdx >= 0 && currentIdx < chapters.length - 1
      ? chapters[currentIdx + 1]
      : null;

  useEffect(() => {
    setAutoScroll(false);
    setProgress(0);
    window.scrollTo({ top: 0 });
    recordHistory({
      mangaId,
      mangaTitle,
      mangaCover,
      chapterId,
      chapterNumber: currentChapter?.number || "?",
    });
  }, [mangaId, mangaTitle, mangaCover, chapterId, currentChapter?.number]);

  // Track vertical scroll progress (0-100%)
  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) {
        setProgress(0);
        return;
      }
      const pct = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
      setProgress(pct);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [chapterId]);

  // Background preload: all pages of current chapter + next 2 chapter routes & images
  useEffect(() => {
    let cancelled = false;

    // 1. Prefetch Next.js routes for the next 2 chapters
    const upcoming = [
      currentIdx > 0 ? chapters[currentIdx - 1] : null,
      currentIdx > 1 ? chapters[currentIdx - 2] : null,
    ].filter((c): c is ChapterItem => c !== null);

    upcoming.forEach((ch) => {
      router.prefetch(
        `/read/${encodeURIComponent(mangaId)}/${encodeURIComponent(ch.id)}`
      );
    });

    // 2. Preload images in small concurrent batches so fast swiping is instant
    function preloadBatch(urls: string[], concurrency = 4): Promise<void> {
      return new Promise((resolve) => {
        let index = 0;
        let active = 0;
        let finished = 0;
        if (urls.length === 0) {
          resolve();
          return;
        }

        function next() {
          if (cancelled) {
            resolve();
            return;
          }
          while (active < concurrency && index < urls.length) {
            const url = urls[index++];
            active++;
            const img = new Image();
            img.decoding = "async";
            const done = () => {
              active--;
              finished++;
              if (finished >= urls.length) {
                resolve();
              } else {
                next();
              }
            };
            img.onload = done;
            img.onerror = done;
            img.src = url;
          }
        }

        next();
      });
    }

    async function runPreload() {
      // Preload all remaining pages of current chapter
      await preloadBatch(
        images.map((i) => i.url),
        4
      );
      if (cancelled) return;

      // Warm the first 6 pages of each of the next 2 chapters
      for (const ch of upcoming) {
        if (cancelled) return;
        try {
          const res = await fetch(
            `/api/chapter/${encodeURIComponent(ch.id)}`
          );
          if (!res.ok || cancelled) continue;
          const data = (await res.json()) as {
            images?: { url: string }[];
          };
          const urls = (data.images || []).slice(0, 6).map((i) => i.url);
          await preloadBatch(urls, 3);
        } catch {
          // Ignore background prefetch errors
        }
      }
    }

    runPreload();
    return () => {
      cancelled = true;
    };
  }, [chapterId, currentIdx, chapters, images, mangaId, router]);

  // Smooth requestAnimationFrame auto-scroll
  useEffect(() => {
    if (!autoScroll) return;

    let rafId = 0;
    let lastTime = performance.now();
    let carry = 0;

    function tick(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const delta = speedRef.current * dt + carry;
      const whole = Math.floor(delta);
      carry = delta - whole;

      if (whole > 0) {
        window.scrollBy(0, whole);
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;

      if (atBottom) {
        setAutoScroll(false);
        return;
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoScroll]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        setAutoScroll((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function goToChapter(id: string) {
    setAutoScroll(false);
    router.push(`/read/${encodeURIComponent(mangaId)}/${encodeURIComponent(id)}`);
  }

  function cycleSpeed() {
    setSpeedIndex((i) => (i + 1) % SPEEDS.length);
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f6]">
      {/* Left-edge segmented micro-block reading progress indicator */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-24 left-0.5 top-24 z-30 flex flex-col justify-between gap-[2px] sm:left-1"
      >
        {Array.from({ length: 16 }).map((_, idx) => {
          const threshold = ((idx + 1) / 16) * 100;
          const active = progress >= threshold - 3;
          return (
            <span
              key={idx}
              className={`w-[3px] flex-1 rounded-[1px] transition-colors duration-150 ${
                active ? "bg-[#38bdf8]" : "bg-white/10"
              }`}
            />
          );
        })}
      </div>

      {/* Top HUD */}
      <header
        onMouseEnter={() => {
          hoverEdgeRef.current = true;
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          setHud(true);
        }}
        onMouseLeave={() => {
          hoverEdgeRef.current = false;
          scheduleHide(1400);
        }}
        className={`fixed left-0 right-0 top-0 z-40 border-b border-[#24242c] bg-[#0c0c0e]/95 backdrop-blur-md transition-opacity duration-300 ${
          hudVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={`/manga/${encodeURIComponent(mangaId)}`}
              aria-label="Back to series"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#9393a0] hover:bg-[#141418] hover:text-[#f4f4f6]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#f4f4f6]">
                {mangaTitle}
              </p>
              <p className="truncate text-xs text-[#9393a0]">
                Chapter {currentChapter?.number || "?"} ({images.length} pages)
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setHud(true);
                soundtrack.setPopoverOpen((v) => !v);
              }}
              aria-label="Series soundtrack"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                soundtrack.videoId && soundtrack.playing
                  ? "border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8]"
                  : "border-[#24242c] bg-[#141418] text-[#9393a0] hover:bg-[#1c1c22] hover:text-[#f4f4f6]"
              }`}
            >
              <Music className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setAutoScroll((v) => !v)}
              aria-label={autoScroll ? "Pause auto scroll" : "Start auto scroll"}
              className={`flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                autoScroll
                  ? "border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8]"
                  : "border-[#24242c] bg-[#141418] text-[#f4f4f6] hover:bg-[#1c1c22]"
              }`}
            >
              {autoScroll ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 text-[#38bdf8]" />
              )}
              <span className="hidden sm:inline">
                {autoScroll ? "Scrolling" : "Auto"}
              </span>
            </button>

            <button
              type="button"
              onClick={cycleSpeed}
              aria-label="Change scroll speed"
              className="flex h-10 min-w-[44px] items-center justify-center rounded-lg border border-[#24242c] bg-[#141418] px-2 text-xs font-medium text-[#9393a0] hover:bg-[#1c1c22] hover:text-[#f4f4f6]"
            >
              {SPEEDS[speedIndex].label}
            </button>
          </div>
        </div>
      </header>

      {/* Reader Canvas */}
      <main
        onClick={() => {
          if (hudVisible) {
            setHud(false);
          } else {
            showHudBriefly();
          }
        }}
        className="mx-auto max-w-3xl pb-16 pt-14"
      >
        {images.length === 0 ? (
          <div className="px-4 py-20 text-center text-sm text-[#9393a0]">
            No pages returned for this chapter
          </div>
        ) : (
          <div className="flex flex-col">
            {images.map((img, idx) => (
              <ReaderPageImage
                key={`${chapterId}-${idx}`}
                src={img.url}
                alt={`Page ${idx + 1}`}
                eager={idx < 3}
              />
            ))}
          </div>
        )}

        {/* End-of-chapter quick buttons */}
        {images.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between gap-3 px-4 py-8"
          >
            {prevChapter ? (
              <Link
                href={`/read/${encodeURIComponent(
                  mangaId
                )}/${encodeURIComponent(prevChapter.id)}`}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#24242c] bg-[#141418] text-sm font-medium text-[#f4f4f6] hover:bg-[#1c1c22]"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Ch {prevChapter.number}</span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextChapter ? (
              <Link
                href={`/read/${encodeURIComponent(
                  mangaId
                )}/${encodeURIComponent(nextChapter.id)}`}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#38bdf8] text-sm font-semibold text-[#07131a] hover:bg-[#56ccf9]"
              >
                <span>Next Ch {nextChapter.number}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/manga/${encodeURIComponent(mangaId)}`}
                className="flex h-11 flex-1 items-center justify-center rounded-lg border border-[#24242c] bg-[#141418] text-sm font-medium text-[#f4f4f6]"
              >
                Back to series
              </Link>
            )}
          </div>
        )}
      </main>

      {/* Minimal floating pause button when auto-scrolling with bars faded */}
      {!hudVisible && autoScroll && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={() => setAutoScroll(false)}
            aria-label="Pause auto scroll"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#38bdf8]/50 bg-[#0c0c0e]/90 text-[#38bdf8] shadow-lg backdrop-blur-md"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bottom HUD */}
      <footer
        onMouseEnter={() => {
          hoverEdgeRef.current = true;
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          setHud(true);
        }}
        onMouseLeave={() => {
          hoverEdgeRef.current = false;
          scheduleHide(1400);
        }}
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-[#24242c] bg-[#0c0c0e]/95 backdrop-blur-md transition-opacity duration-300 ${
          hudVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-3 sm:px-4">
          <button
            type="button"
            disabled={!prevChapter}
            onClick={() => prevChapter && goToChapter(prevChapter.id)}
            aria-label="Previous chapter"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#24242c] bg-[#141418] text-[#f4f4f6] disabled:opacity-35"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <select
            aria-label="Select chapter"
            value={chapterId}
            onChange={(e) => goToChapter(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg border border-[#24242c] bg-[#141418] px-3 text-sm text-[#f4f4f6] focus:border-[#38bdf8] focus:outline-none"
          >
            {chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                Chapter {ch.number}
                {ch.title ? ` - ${ch.title}` : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!nextChapter}
            onClick={() => nextChapter && goToChapter(nextChapter.id)}
            aria-label="Next chapter"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#24242c] bg-[#141418] text-[#f4f4f6] disabled:opacity-35"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
