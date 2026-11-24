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
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Glass, Slider } from "glisse";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  extractYouTubeId,
  getSeriesMusic,
  recordHistory,
  setSeriesMusic,
} from "@/lib/storage";
import type { ChapterItem } from "@/lib/types";

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
  const [hudVisible, setHudVisible] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [musicVideoId, setMusicVideoId] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [musicVolume, setMusicVolume] = useState(8);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicInput, setMusicInput] = useState("");
  const speedRef = useRef(SPEEDS[1].pxPerSec);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);

  function postYtCommand(func: string, args: unknown[] = []) {
    ytIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  }

  useEffect(() => {
    const saved = getSeriesMusic(mangaId);
    const id = saved ? extractYouTubeId(saved) : null;
    setMusicVideoId(id);
    setMusicInput(saved || "");
    setMusicPlaying(Boolean(id));
    setMusicVolume(8);
  }, [mangaId]);

  useEffect(() => {
    if (!musicVideoId || !musicPlaying) return;
    postYtCommand("setVolume", [musicVolume]);
    if (musicVolume === 0) {
      postYtCommand("mute");
    } else {
      postYtCommand("unMute");
    }
  }, [musicVolume, musicVideoId, musicPlaying]);

  function handleSaveMusic(e: FormEvent) {
    e.preventDefault();
    const trimmed = musicInput.trim();
    if (!trimmed) {
      setSeriesMusic(mangaId, null);
      setMusicVideoId(null);
      setMusicPlaying(false);
      setMusicOpen(false);
      return;
    }
    const id = extractYouTubeId(trimmed);
    if (!id) return;
    setSeriesMusic(mangaId, trimmed);
    setMusicVideoId(id);
    setMusicPlaying(true);
    setMusicOpen(false);
  }

  function handleClearMusic() {
    setSeriesMusic(mangaId, null);
    setMusicVideoId(null);
    setMusicInput("");
    setMusicPlaying(false);
    setMusicOpen(false);
  }
  const hoverEdgeRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleHide(delay = 2500) {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!hoverEdgeRef.current) {
        setHudVisible(false);
      }
    }, delay);
  }

  function showHudBriefly() {
    setHudVisible(true);
    scheduleHide(2800);
  }

  useEffect(() => {
    scheduleHide(2800);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const nearTop = e.clientY <= 84;
      const nearBottom = window.innerHeight - e.clientY <= 84;
      const nearEdge = nearTop || nearBottom;
      hoverEdgeRef.current = nearEdge;

      if (nearEdge) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setHudVisible(true);
      } else {
        scheduleHide(1400);
      }
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
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
    window.scrollTo({ top: 0 });
    recordHistory({
      mangaId,
      mangaTitle,
      mangaCover,
      chapterId,
      chapterNumber: currentChapter?.number || "?",
    });
  }, [mangaId, mangaTitle, mangaCover, chapterId, currentChapter?.number]);

  // Smooth requestAnimationFrame auto-scroll (middle-click wheel style)
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
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
      {/* Single persistent YouTube iframe so closing the popover never interrupts playback */}
      {musicVideoId && musicPlaying && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={
            musicOpen
              ? "fixed left-1/2 top-[132px] z-50 w-[min(86vw,340px)] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-black/50 sm:pointer-events-none sm:bottom-0 sm:left-auto sm:right-0 sm:top-auto sm:h-px sm:w-px sm:translate-x-0 sm:border-0 sm:opacity-0"
              : "pointer-events-none fixed bottom-0 right-0 h-px w-px opacity-0"
          }
        >
          <iframe
            ref={ytIframeRef}
            key={musicVideoId}
            src={`https://www.youtube.com/embed/${musicVideoId}?autoplay=1&loop=1&playlist=${musicVideoId}&playsinline=1&controls=1&enablejsapi=1`}
            title="Reading soundtrack"
            allow="autoplay; encrypted-media"
            onLoad={() => {
              setTimeout(() => {
                postYtCommand("setVolume", [musicVolume]);
                if (musicVolume > 0) postYtCommand("unMute");
              }, 400);
            }}
            className="aspect-video w-full"
          />
        </div>
      )}
      {/* Top HUD */}
      <header
        onMouseEnter={() => {
          hoverEdgeRef.current = true;
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          setHudVisible(true);
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
              onClick={() => setMusicOpen((v) => !v)}
              aria-label="Series soundtrack"
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                musicVideoId && musicPlaying
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

      {/* Compact Liquid Glass soundtrack popover */}
      {musicOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed left-1/2 top-16 z-50 w-[min(92vw,360px)] -translate-x-1/2"
        >
          <Glass className="w-full rounded-2xl p-2.5 shadow-2xl">
            <form onSubmit={handleSaveMusic} className="flex items-center gap-1.5">
              <input
                type="url"
                value={musicInput}
                onChange={(e) => setMusicInput(e.target.value)}
                placeholder="Paste YouTube link"
                aria-label="YouTube song link"
                className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 text-xs text-[#f4f7fb] placeholder:text-[#8f9bb0] focus:border-[#38bdf8] focus:outline-none"
              />
              <button
                type="submit"
                className="h-9 shrink-0 rounded-xl bg-[#38bdf8] px-3 text-xs font-semibold text-[#07131a]"
              >
                Loop
              </button>
              {musicVideoId && (
                <>
                  <button
                    type="button"
                    onClick={() => setMusicPlaying((v) => !v)}
                    aria-label={musicPlaying ? "Mute" : "Unmute"}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-[#f4f7fb]"
                  >
                    {musicPlaying ? (
                      <Volume2 className="h-4 w-4 text-[#38bdf8]" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-[#8f9bb0]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearMusic}
                    aria-label="Remove soundtrack"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-[#8f9bb0] hover:text-[#f2a6a6]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </form>
            {musicVideoId && (
              <div className="mt-2.5 flex items-center gap-2.5 px-1">
                <span className="w-8 text-[11px] text-[#8f9bb0]">
                  {musicVolume}%
                </span>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={musicVolume}
                  onValueChange={(val) => {
                    setMusicVolume(val);
                    if (val > 0 && !musicPlaying) setMusicPlaying(true);
                  }}
                  aria-label="Soundtrack volume"
                  className="flex-1"
                />
              </div>
            )}
          </Glass>
        </div>
      )}

      {/* Reader Canvas */}
      <main
        onClick={() => {
          if (hudVisible) {
            setHudVisible(false);
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
          setHudVisible(true);
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
