"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Glass, Slider } from "glisse";
import { Trash2, Volume2, VolumeX } from "lucide-react";
import {
  extractYouTubeId,
  getSeriesMusic,
  setSeriesMusic,
} from "@/lib/storage";

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface SoundtrackContextValue {
  videoId: string | null;
  playing: boolean;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setHudVisible: (visible: boolean) => void;
  hoveringPopoverRef: React.MutableRefObject<boolean>;
}

const SoundtrackContext = createContext<SoundtrackContextValue | null>(null);

export function useReaderSoundtrack() {
  const ctx = useContext(SoundtrackContext);
  if (!ctx) {
    throw new Error(
      "useReaderSoundtrack must be used inside ReaderSoundtrackProvider"
    );
  }
  return ctx;
}

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if (window.YT?.Player) {
      resolve();
      return;
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export function ReaderSoundtrackProvider({
  mangaId,
  children,
}: {
  mangaId: string;
  children: ReactNode;
}) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [playing, setPlaying] = useState(true);
  const [volume, setVolumeState] = useState(8);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);

  const playerRef = useRef<YTPlayer | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const hoveringPopoverRef = useRef(false);
  const volumeRef = useRef(8);
  const playingRef = useRef(true);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const saved = getSeriesMusic(mangaId);
    const id = saved ? extractYouTubeId(saved) : null;
    setInput(saved || "");
    setVideoId(id);
    setPlaying(Boolean(id));
    setVolumeState(8);
  }, [mangaId]);

  useEffect(() => {
    if (!videoId || !hostRef.current) {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const container = hostRef.current;

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player || !container) return;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      container.innerHTML = "";
      const mountEl = document.createElement("div");
      mountEl.style.width = "100%";
      mountEl.style.height = "100%";
      container.appendChild(mountEl);

      playerRef.current = new window.YT.Player(mountEl, {
        videoId,
        playerVars: {
          autoplay: 1,
          loop: 1,
          playlist: videoId,
          playsinline: 1,
          controls: 1,
          rel: 0,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volumeRef.current);
            if (volumeRef.current === 0) {
              e.target.mute();
            } else {
              e.target.unMute();
            }
            if (playingRef.current) {
              e.target.playVideo();
            }
          },
          onStateChange: (e) => {
            if (e.data === 0) {
              e.target.seekTo(0, true);
              e.target.playVideo();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    const p = playerRef.current;
    if (p) {
      p.setVolume(vol);
      if (vol === 0) {
        p.mute();
      } else {
        p.unMute();
        if (!playingRef.current) {
          setPlaying(true);
          p.playVideo();
        }
      }
    }
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => {
      const next = !prev;
      const p = playerRef.current;
      if (p) {
        if (next) {
          p.setVolume(volumeRef.current);
          if (volumeRef.current > 0) p.unMute();
          p.playVideo();
        } else {
          p.pauseVideo();
        }
      }
      return next;
    });
  }, []);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setSeriesMusic(mangaId, null);
      setVideoId(null);
      setPlaying(false);
      setPopoverOpen(false);
      return;
    }
    const id = extractYouTubeId(trimmed);
    if (!id) return;
    setSeriesMusic(mangaId, trimmed);
    setVideoId(id);
    setPlaying(true);
    if (typeof window !== "undefined" && window.innerWidth >= 640) {
      setPopoverOpen(false);
    }
  }

  function handleClear() {
    setSeriesMusic(mangaId, null);
    setInput("");
    setVideoId(null);
    setPlaying(false);
    setPopoverOpen(false);
  }

  const showPopover = popoverOpen && hudVisible;

  return (
    <SoundtrackContext.Provider
      value={{
        videoId,
        playing,
        popoverOpen,
        setPopoverOpen,
        setHudVisible,
        hoveringPopoverRef,
      }}
    >
      {children}

      {/* Unified Liquid Glass soundtrack popover + persistent YouTube player inside it */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerEnter={() => {
          hoveringPopoverRef.current = true;
        }}
        onPointerDown={() => {
          hoveringPopoverRef.current = true;
        }}
        onPointerLeave={() => {
          hoveringPopoverRef.current = false;
        }}
        className={`fixed left-1/2 top-16 z-50 w-[min(92vw,360px)] -translate-x-1/2 transition-opacity duration-300 ${
          showPopover ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Glass className="w-full rounded-2xl p-2.5 shadow-2xl">
          <div className="flex w-full flex-col gap-2.5">
            <form onSubmit={handleSave} className="flex items-center gap-1.5">
              <input
                type="url"
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
              {videoId && (
                <>
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={playing ? "Pause" : "Play"}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-[#f4f7fb]"
                  >
                    {playing ? (
                      <Volume2 className="h-4 w-4 text-[#38bdf8]" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-[#8f9bb0]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Remove soundtrack"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-[#8f9bb0] hover:text-[#f2a6a6]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </form>

            {videoId && (
              <div className="flex items-center gap-2.5 px-1">
                <span className="w-8 text-[11px] text-[#8f9bb0]">
                  {volume}%
                </span>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={volume}
                  onValueChange={(val) => setVolume(val)}
                  aria-label="Soundtrack volume"
                  className="flex-1"
                />
              </div>
            )}

            {/* Player stays mounted inside the card on mobile; hidden on desktop */}
            {videoId && (
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black sm:pointer-events-none sm:fixed sm:bottom-0 sm:right-0 sm:h-px sm:w-px sm:border-0 sm:opacity-0">
                <div ref={hostRef} className="h-full w-full" />
              </div>
            )}
          </div>
        </Glass>
      </div>
    </SoundtrackContext.Provider>
  );
}
