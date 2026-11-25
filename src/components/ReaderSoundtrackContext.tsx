"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface SoundtrackContextValue {
  videoId: string | null;
  savedUrl: string;
  playing: boolean;
  volume: number;
  popoverOpen: boolean;
  hudVisible: boolean;
  setPopoverOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setHudVisible: (visible: boolean) => void;
  saveUrl: (url: string) => boolean;
  clearMusic: () => void;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
}

const SoundtrackContext = createContext<SoundtrackContextValue | null>(null);

export function useReaderSoundtrack() {
  const ctx = useContext(SoundtrackContext);
  if (!ctx) {
    throw new Error("useReaderSoundtrack must be used inside ReaderSoundtrackProvider");
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
  const [savedUrl, setSavedUrl] = useState("");
  const [playing, setPlaying] = useState(true);
  const [volume, setVolumeState] = useState(8);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);

  const playerRef = useRef<YTPlayer | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(8);
  const playingRef = useRef(true);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Load saved track for this mangaId once when entering the series reader
  useEffect(() => {
    const saved = getSeriesMusic(mangaId);
    const id = saved ? extractYouTubeId(saved) : null;
    setSavedUrl(saved || "");
    setVideoId(id);
    setPlaying(Boolean(id));
    setVolumeState(8);
  }, [mangaId]);

  // Initialize official YouTube IFrame API player whenever videoId changes
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
            // Guaranteed loop when track ends
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

  // Cleanup player only when leaving this manga's reader layout completely
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

  const saveUrl = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) {
        setSeriesMusic(mangaId, null);
        setSavedUrl("");
        setVideoId(null);
        setPlaying(false);
        return true;
      }
      const id = extractYouTubeId(trimmed);
      if (!id) return false;
      setSeriesMusic(mangaId, trimmed);
      setSavedUrl(trimmed);
      setVideoId(id);
      setPlaying(true);
      return true;
    },
    [mangaId]
  );

  const clearMusic = useCallback(() => {
    setSeriesMusic(mangaId, null);
    setSavedUrl("");
    setVideoId(null);
    setPlaying(false);
    setPopoverOpen(false);
  }, [mangaId]);

  // Visible inside the mobile popover when open & header is visible; hidden off-screen otherwise
  const showMobilePlayer = Boolean(videoId && popoverOpen && hudVisible);

  return (
    <SoundtrackContext.Provider
      value={{
        videoId,
        savedUrl,
        playing,
        volume,
        popoverOpen,
        hudVisible,
        setPopoverOpen,
        setHudVisible,
        saveUrl,
        clearMusic,
        togglePlay,
        setVolume,
      }}
    >
      {children}

      {/* Persistent YouTube player: stays alive across chapter switches */}
      {videoId && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={
            showMobilePlayer
              ? "fixed left-1/2 top-[172px] z-50 aspect-video w-[min(86vw,340px)] -translate-x-1/2 overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl transition-opacity duration-300 sm:pointer-events-none sm:bottom-0 sm:left-auto sm:right-0 sm:top-auto sm:h-px sm:w-px sm:translate-x-0 sm:border-0 sm:opacity-0"
              : "pointer-events-none fixed bottom-0 right-0 h-px w-px opacity-0"
          }
        >
          <div ref={hostRef} className="h-full w-full" />
        </div>
      )}
    </SoundtrackContext.Provider>
  );
}
