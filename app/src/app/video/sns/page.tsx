"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fetchFile } from "@ffmpeg/util";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { FFmpegLoader } from "@/components/ffmpeg-loader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Play,
  Pause,
  Plus,
  Trash2,
  ArrowLeft,
  Smartphone,
  Volume2,
  VolumeX,
  Film,
  Music,
  Settings2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  RotateCw,
  Loader2,
  Type,
  Link2,
  Search,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { TimelineClip, TextOverlay } from "./types";
import {
  PLATFORMS,
  CROP_POSITIONS,
  AUDIO_MODES,
  QUALITY,
  TIMELINE_PX_PER_SEC,
  TIMELINE_ZOOM_MIN,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_STEP,
  TEXT_SIZES,
  TEXT_COLORS,
  TEXT_PREVIEW_SIZES,
} from "./constants";
import {
  uid,
  ext,
  fmt,
  loadClipMeta,
  renderTextPng,
  getClipStartTimes,
  globalToLocal,
  generateRulerTicks,
} from "./helpers";
import { SortableClip } from "./_components/sortable-clip";

/* ================================================================
   Main Component
   ================================================================ */

export default function SnsCreatorPage() {
  const ff = useFFmpeg();

  /* ── Clips & media ─────────────────────────── */
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [bgmName, setBgmName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingClips, setLoadingClips] = useState(false);

  /* ── Settings ──────────────────────────────── */
  const [platform, setPlatform] = useState("tiktok");
  const [crop, setCrop] = useState("center");
  const [audioMode, setAudioMode] = useState("keep");
  const [quality, setQuality] = useState("standard");
  const [origVol, setOrigVol] = useState(30);
  const [bgmVol, setBgmVol] = useState(70);

  /* ── SNS BGM (TikTok / YouTube / Instagram) ── */
  const [snsBgmUrl, setSnsBgmUrl] = useState("");
  const [snsBgmLoading, setSnsBgmLoading] = useState(false);

  /* ── Text overlays (テロップ) ────────────────── */
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);

  /* ── BGM preview audio ────────────────────── */
  const bgmAudioRef = useRef<HTMLAudioElement>(null);
  const [bgmDuration, setBgmDuration] = useState(0);
  const [bgmStartOffset, setBgmStartOffset] = useState(0);
  const [bgmObjectUrl, setBgmObjectUrl] = useState<string | null>(null);

  /* ── Preview ───────────────────────────────── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const seqPlayRef = useRef(false); // true during sequential playback of all clips

  /* ── Process state ─────────────────────────── */
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  /* ── Accordion for mobile ──────────────────── */
  const [settingsOpen, setSettingsOpen] = useState(true);

  /* ── Timeline zoom ──────────────────────────── */
  const [timelineZoom, setTimelineZoom] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  /* ── Video rotation (per-clip) ───────────────── */
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

  /* ── Panel resize ────────────────────────────── */
  const [leftPanelWidth, setLeftPanelWidth] = useState(224);  // px
  const [rightPanelWidth, setRightPanelWidth] = useState(260); // px
  const [timelineHeight, setTimelineHeight] = useState(160);  // px
  const resizingRef = useRef<{ panel: "left" | "right" | "timeline"; startX: number; startY: number; startVal: number } | null>(null);

  /* ── Derived ───────────────────────────────── */
  const plat = PLATFORMS.find((p) => p.id === platform)!;
  const qual = QUALITY.find((q) => q.value === quality)!;
  const needsBgm = audioMode === "replace" || audioMode === "mix";
  const selectedClip = clips.find((c) => c.id === selectedId) ?? null;
  const totalDuration = clips.reduce((s, c) => s + (c.outPoint - c.inPoint), 0);
  const pxPerSec = TIMELINE_PX_PER_SEC * timelineZoom;
  const clipStartTimes = getClipStartTimes(clips);
  const rulerTicks = generateRulerTicks(totalDuration, pxPerSec);

  // Global playhead position (seconds from start of timeline)
  const globalCurrentTime = (() => {
    if (!selectedClip) return 0;
    const idx = clips.findIndex((c) => c.id === selectedClip.id);
    if (idx < 0) return 0;
    return clipStartTimes[idx] + (currentTime - selectedClip.inPoint);
  })();
  const playheadPx = globalCurrentTime * pxPerSec;

  const videoInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  /* ── DnD sensors ───────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  /* ── Add clips ─────────────────────────────── */
  const addClips = useCallback(async (files: FileList | File[]) => {
    setLoadingClips(true);
    const arr = Array.from(files);
    const newClips: TimelineClip[] = [];

    for (const file of arr) {
      try {
        const meta = await loadClipMeta(file);
        newClips.push({
          id: uid(),
          file,
          name: file.name.replace(/\.[^.]+$/, ""),
          fullDuration: meta.duration,
          inPoint: 0,
          outPoint: meta.duration,
          thumbnailUrl: meta.thumb,
          objectUrl: meta.url,
        });
      } catch {
        // skip unreadable files
      }
    }

    setClips((prev) => {
      const all = [...prev, ...newClips];
      if (!selectedId && newClips.length > 0) {
        setSelectedId(newClips[0].id);
      }
      return all;
    });
    setLoadingClips(false);
  }, [selectedId]);

  const removeClip = useCallback((id: string) => {
    setClips((prev) => {
      const next = prev.filter((c) => c.id !== id);
      return next;
    });
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  /* ── Trim controls ─────────────────────────── */
  const updateClip = useCallback((id: string, patch: Partial<TimelineClip>) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  /* ── Timeline trim handlers (drag clip edges) ── */
  const handleTrimIn = useCallback((clipId: string, deltaSec: number) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        const newIn = Math.max(0, Math.min(c.inPoint + deltaSec, c.outPoint - 0.1));
        return { ...c, inPoint: newIn };
      }),
    );
  }, []);

  const handleTrimOut = useCallback((clipId: string, deltaSec: number) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        const newOut = Math.min(c.fullDuration, Math.max(c.outPoint + deltaSec, c.inPoint + 0.1));
        return { ...c, outPoint: newOut };
      }),
    );
  }, []);

  /* ── Panel resize handlers ──────────────────── */
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, panel: "left" | "right" | "timeline") => {
      e.preventDefault();
      const startVal =
        panel === "left" ? leftPanelWidth : panel === "right" ? rightPanelWidth : timelineHeight;
      resizingRef.current = { panel, startX: e.clientX, startY: e.clientY, startVal };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [leftPanelWidth, rightPanelWidth, timelineHeight],
  );

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizingRef.current) return;
    const { panel, startX, startY, startVal } = resizingRef.current;
    if (panel === "left") {
      const dx = e.clientX - startX;
      setLeftPanelWidth(Math.max(48, Math.min(500, startVal + dx)));
    } else if (panel === "right") {
      const dx = e.clientX - startX;
      setRightPanelWidth(Math.max(48, Math.min(500, startVal - dx)));
    } else if (panel === "timeline") {
      const dy = e.clientY - startY;
      setTimelineHeight(Math.max(80, Math.min(500, startVal - dy)));
    }
  }, []);

  const handleResizePointerUp = useCallback(() => {
    resizingRef.current = null;
  }, []);

  /* ── DnD handler ───────────────────────────── */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setClips((prev) => {
        const oldIdx = prev.findIndex((c) => c.id === active.id);
        const newIdx = prev.findIndex((c) => c.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }, []);

  /* ── Preview transport ─────────────────────── */
  // Play/pause: always uses sequential mode so playback continues through all clips
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || !selectedClip) return;
    const bgm = bgmAudioRef.current;
    const useBgm = bgmFile && (audioMode === "replace" || audioMode === "mix");
    if (v.paused) {
      seqPlayRef.current = true; // always sequential
      // If past outPoint or before inPoint, seek to inPoint first
      if (v.currentTime < selectedClip.inPoint || v.currentTime >= selectedClip.outPoint - 0.05) {
        v.currentTime = selectedClip.inPoint;
      }
      v.play();
      if (bgm && useBgm) {
        bgm.play().catch(() => {});
      }
      setPlaying(true);
    } else {
      v.pause();
      if (bgm) bgm.pause();
      setPlaying(false);
      seqPlayRef.current = false;
    }
  }, [bgmFile, audioMode, selectedClip]);

  // Seek to inPoint when clip selection changes.
  // Sequential auto-play after source change is handled by onLoadedData on the <video>.
  // This effect handles: (a) same-source clips during sequential play, (b) normal clip selection.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !selectedClip) return;

    if (v.readyState >= 2) {
      // Video already loaded (same source / element persisted)
      v.currentTime = selectedClip.inPoint;
      if (seqPlayRef.current) {
        v.play().catch(() => {});
        setPlaying(true);
      } else {
        setCurrentTime(selectedClip.inPoint);
      }
    }
    // If readyState < 2 (new source, element recreated), onLoadedData prop handles it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClip?.id]);

  // Track time & handle sequential clip transitions + enforce outPoint
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !selectedClip) return;

    const pauseBgm = () => {
      const bgm = bgmAudioRef.current;
      if (bgm) bgm.pause();
    };

    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);

      // Enforce outPoint — stop at outPoint in all modes
      if (v.currentTime >= selectedClip.outPoint - 0.05) {
        if (seqPlayRef.current) {
          // Sequential mode: advance to next clip
          v.pause();
          const idx = clips.findIndex((c) => c.id === selectedClip.id);
          if (idx >= 0 && idx < clips.length - 1) {
            setSelectedId(clips[idx + 1].id);
          } else {
            seqPlayRef.current = false;
            setPlaying(false);
            pauseBgm();
          }
        } else {
          // Single clip mode: pause at outPoint
          v.pause();
          v.currentTime = selectedClip.outPoint;
          setPlaying(false);
          pauseBgm();
        }
      }
    };

    const onEnded = () => {
      if (seqPlayRef.current) {
        const idx = clips.findIndex((c) => c.id === selectedClip.id);
        if (idx >= 0 && idx < clips.length - 1) {
          setSelectedId(clips[idx + 1].id);
        } else {
          seqPlayRef.current = false;
          setPlaying(false);
          pauseBgm();
        }
      } else {
        setPlaying(false);
        pauseBgm();
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
  }, [selectedClip, clips]);

  /* ── BGM object URL & duration ──────────────── */
  useEffect(() => {
    if (!bgmFile) {
      setBgmDuration(0);
      setBgmStartOffset(0);
      return;
    }
    const url = URL.createObjectURL(bgmFile);
    setBgmObjectUrl(url);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => setBgmDuration(audio.duration));
    return () => {
      URL.revokeObjectURL(url);
      setBgmObjectUrl(null);
    };
  }, [bgmFile]);

  /* ── Sync video/BGM volume with audioMode settings ── */
  useEffect(() => {
    const v = videoRef.current;
    const bgm = bgmAudioRef.current;
    if (v) {
      v.muted = audioMode === "mute" || audioMode === "replace";
      v.volume = audioMode === "mix" ? origVol / 100 : 1;
    }
    if (bgm) {
      bgm.volume = audioMode === "mix" ? bgmVol / 100 : 1;
    }
  }, [audioMode, origVol, bgmVol]);

  /* ── Pause BGM when clip changes (non-sequential) ── */
  useEffect(() => {
    if (!seqPlayRef.current) {
      const bgm = bgmAudioRef.current;
      if (bgm) bgm.pause();
      setPlaying(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  /* ── BGM handler ───────────────────────────── */
  const handleBgmSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setBgmFile(f);
      setBgmName(f.name.replace(/\.[^.]+$/, ""));
    }
    if (bgmInputRef.current) bgmInputRef.current.value = "";
  }, []);

  /* ── SNS BGM handler (TikTok / YouTube / Instagram) ── */
  const detectPlatform = (url: string): "tiktok" | "youtube" | "instagram" | null => {
    try {
      const h = new URL(url).hostname;
      if (/tiktok\.com$/.test(h)) return "tiktok";
      if (/youtu\.?be(\.com)?$/.test(h)) return "youtube";
      if (/instagram\.com$/.test(h)) return "instagram";
    } catch { /* invalid URL */ }
    return null;
  };

  const handleSnsBgm = async () => {
    const url = snsBgmUrl.trim();
    if (!url) return;
    const plf = detectPlatform(url);
    if (!plf) {
      alert("TikTok、YouTube、またはInstagramのURLを入力してください");
      return;
    }
    setSnsBgmLoading(true);
    try {
      const apiEndpoint = plf === "tiktok"
        ? "/api/tiktok/download"
        : plf === "youtube"
          ? "/api/youtube/download"
          : "/api/instagram/download";

      const bodyKey = plf === "tiktok" ? "tiktokVideoUrl" : "url";

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: url }),
      });

      if (!res.ok) {
        let msg = `音源の取得に失敗 (HTTP ${res.status})`;
        try {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            msg = data.error || msg;
          } catch {
            msg += `: ${text.slice(0, 200)}`;
          }
        } catch { /* body読み取り失敗 */ }
        throw new Error(msg);
      }

      const title = decodeURIComponent(res.headers.get("X-Music-Title") || "音源");
      const author = decodeURIComponent(res.headers.get("X-Music-Author") || "不明");

      const blob = await res.blob();
      const file = new File([blob], `${title}.mp3`, { type: "audio/mpeg" });

      setBgmFile(file);
      setBgmName(`${title} - ${author}`);
      setSnsBgmUrl("");

      if (audioMode === "keep" || audioMode === "mute") {
        setAudioMode("replace");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "音源の取得に失敗しました";
      alert(msg);
    } finally {
      setSnsBgmLoading(false);
    }
  };

  /* ── Timeline seek (click ruler to seek) ──── */
  const seekToGlobalTime = useCallback((globalTime: number) => {
    const result = globalToLocal(globalTime, clips);
    if (!result) return;
    const { clipIndex, localTime } = result;
    const clip = clips[clipIndex];
    setSelectedId(clip.id);
    // Wait for video source to update, then seek
    setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        v.currentTime = localTime;
        setCurrentTime(localTime);
      }
    }, 50);
  }, [clips]);

  const handleRulerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pxPerSec;
    seekToGlobalTime(Math.max(0, Math.min(time, totalDuration)));
  }, [pxPerSec, totalDuration, seekToGlobalTime]);

  /* ── Frame step ──────────────────────────── */
  const stepFrame = useCallback((direction: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    const step = 1 / 30; // ~1 frame at 30fps
    v.currentTime = Math.max(0, v.currentTime + direction * step);
    setCurrentTime(v.currentTime);
  }, []);

  /* ── Jump to start/end of timeline ────────── */
  const jumpToStart = useCallback(() => {
    if (clips.length === 0) return;
    setSelectedId(clips[0].id);
    setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        v.currentTime = clips[0].inPoint;
        setCurrentTime(clips[0].inPoint);
      }
    }, 50);
  }, [clips]);

  const jumpToEnd = useCallback(() => {
    if (clips.length === 0) return;
    const last = clips[clips.length - 1];
    setSelectedId(last.id);
    setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        v.currentTime = last.outPoint;
        setCurrentTime(last.outPoint);
      }
    }, 50);
  }, [clips]);

  /* ── Text overlay handlers ──────────────────── */
  const addOverlay = () => {
    setOverlays((prev) => [
      ...prev,
      { id: uid(), text: "", position: "bottom", size: "m", color: "#ffffff" },
    ]);
  };

  const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
  };

  /* ================================================================
     FFmpeg Processing — Multi-clip with proper encoding + overlays
     ================================================================ */

  const handleExport = async () => {
    if (clips.length === 0) return;
    if (needsBgm && !bgmFile) return;
    setProcessing(true);
    setResult(null);

    try {
      const W = plat.w;
      const H = plat.h;
      const cropY =
        crop === "top" ? "0" : crop === "bottom" ? "in_h-out_h" : "(in_h-out_h)/2";
      const rotateFilter = rotation === 90 ? "transpose=1," : rotation === 180 ? "transpose=1,transpose=1," : rotation === 270 ? "transpose=2," : "";
      const scaleAndCrop = `${rotateFilter}scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(in_w-out_w)/2:${cropY}`;

      const keepAudio = audioMode === "keep" || audioMode === "mix";

      /* ── Step 0: Render text overlay PNGs ────── */
      const activeOverlays = overlays.filter((o) => o.text.trim().length > 0);
      const overlayMeta: { position: string; height: number }[] = [];

      if (activeOverlays.length > 0) {
        setProcessStep("テロップを生成中...");
        for (let j = 0; j < activeOverlays.length; j++) {
          const o = activeOverlays[j];
          const fontSize = TEXT_SIZES[o.size] || 52;
          const { bytes, height } = await renderTextPng(o.text, fontSize, o.color, W);
          if (bytes.length > 0) {
            await ff.writeFile(`overlay${j}.png`, bytes);
            overlayMeta.push({ position: o.position, height });
          }
        }
      }

      const numOverlays = overlayMeta.length;

      /* ── Step 1: Encode each clip ─────────────── */
      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        setProcessStep(`クリップ ${i + 1}/${clips.length} をエンコード中...`);

        const inputName = `input${i}${ext(c.file.name)}`;
        await ff.writeFile(inputName, await fetchFile(c.file));

        const args: string[] = [];

        // Trim (input-level for speed)
        if (c.inPoint > 0) args.push("-ss", String(c.inPoint));
        if (c.outPoint < c.fullDuration) args.push("-to", String(c.outPoint));

        args.push("-i", inputName);

        // Add overlay PNG inputs (with -loop 1 so the image persists for the entire clip)
        for (let j = 0; j < numOverlays; j++) {
          args.push("-loop", "1", "-i", `overlay${j}.png`);
        }

        // Video filter
        if (numOverlays > 0) {
          // Build filter_complex with overlay chain
          let fc = `[0:v]${scaleAndCrop}[base]`;
          let prev = "base";

          for (let j = 0; j < numOverlays; j++) {
            const next = `t${j}`;
            const { position } = overlayMeta[j];
            const yExpr =
              position === "top" ? "80" :
              position === "bottom" ? "main_h-overlay_h-80" :
              "(main_h-overlay_h)/2";

            fc += `; [${prev}][${j + 1}:v]overlay=x=(main_w-overlay_w)/2:y=${yExpr}:shortest=1[${next}]`;
            prev = next;
          }

          // Final format conversion
          fc += `; [${prev}]format=yuv420p,setsar=1[outv]`;

          args.push("-filter_complex", fc);
          args.push("-map", "[outv]");

          if (keepAudio) {
            args.push("-map", "0:a");
          }
        } else {
          args.push("-vf", `${scaleAndCrop},format=yuv420p,setsar=1`);
        }

        // Encoding params
        args.push(
          "-c:v", "libx264",
          "-profile:v", "high",
          "-level", "4.0",
          "-pix_fmt", "yuv420p",
          "-preset", "fast",
          "-b:v", qual.vBit,
          "-maxrate", qual.vBit,
          "-bufsize", qual.buf,
        );

        // Audio
        if (keepAudio) {
          args.push("-c:a", "aac", "-b:a", qual.aBit, "-ar", "44100", "-ac", "2");
        } else {
          args.push("-an");
        }

        args.push("-movflags", "+faststart", "-y", `temp${i}.mp4`);
        await ff.exec(args);
      }

      /* ── Step 2: Concat ───────────────────────── */
      let concatFile: string;

      if (clips.length === 1) {
        concatFile = "temp0.mp4";
      } else {
        setProcessStep("クリップを結合中...");
        const listContent = clips.map((_, i) => `file 'temp${i}.mp4'`).join("\n");
        await ff.writeFile("list.txt", new TextEncoder().encode(listContent));
        await ff.exec([
          "-f", "concat", "-safe", "0", "-i", "list.txt",
          "-c", "copy", "-movflags", "+faststart", "-y", "concat.mp4",
        ]);
        concatFile = "concat.mp4";
      }

      /* ── Step 3: Audio post-processing ────────── */
      let outputFile = concatFile;

      if (audioMode === "replace" && bgmFile) {
        setProcessStep("BGMを適用中...");
        const bgmIn = "bgm" + ext(bgmFile.name);
        await ff.writeFile(bgmIn, await fetchFile(bgmFile));

        const bgmArgs: string[] = ["-i", concatFile];
        if (bgmStartOffset > 0) bgmArgs.push("-ss", String(bgmStartOffset));
        bgmArgs.push(
          "-i", bgmIn,
          "-map", "0:v",
          "-map", "1:a",
          "-c:v", "copy",
          "-c:a", "aac", "-b:a", qual.aBit, "-ar", "44100", "-ac", "2",
          "-shortest",
          "-movflags", "+faststart",
          "-y", "output.mp4",
        );
        await ff.exec(bgmArgs);
        outputFile = "output.mp4";
      } else if (audioMode === "mix" && bgmFile) {
        setProcessStep("BGMをミックス中...");
        const bgmIn = "bgm" + ext(bgmFile.name);
        await ff.writeFile(bgmIn, await fetchFile(bgmFile));

        const oVol = (origVol / 100).toFixed(2);
        const bVol = (bgmVol / 100).toFixed(2);

        const mixArgs: string[] = ["-i", concatFile];
        if (bgmStartOffset > 0) mixArgs.push("-ss", String(bgmStartOffset));
        mixArgs.push(
          "-i", bgmIn,
          "-filter_complex",
          `[0:a]volume=${oVol}[a0];[1:a]volume=${bVol}[a1];[a0][a1]amix=inputs=2:duration=first[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
          "-c:v", "copy",
          "-c:a", "aac", "-b:a", qual.aBit, "-ar", "44100", "-ac", "2",
          "-movflags", "+faststart",
          "-y", "output.mp4",
        );
        await ff.exec(mixArgs);
        outputFile = "output.mp4";
      }

      /* ── Step 4: Read result ──────────────────── */
      setProcessStep("完了!");
      const data = await ff.readFile(outputFile);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      const baseName = clips[0].name;
      setResult({ blob, name: `${baseName}_${platform}.mp4` });
    } catch (err) {
      console.error("Export failed:", err);
      alert("書き出しに失敗しました。クリップやBGMを確認してもう一度お試しください。");
    } finally {
      setProcessing(false);
      setProcessStep("");
    }
  };

  /* ── Download result ───────────────────────── */
  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    clips.forEach((c) => URL.revokeObjectURL(c.objectUrl));
    const bgm = bgmAudioRef.current;
    if (bgm) bgm.pause();
    setClips([]);
    setBgmFile(null);
    setBgmName("");
    setBgmDuration(0);
    setBgmStartOffset(0);
    setSelectedId(null);
    setResult(null);
    setPlaying(false);
    setOverlays([]);
    setSnsBgmUrl("");
  };

  /* ================================================================
     Render
     ================================================================ */

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* ── Top bar ──────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-semibold tracking-tight">SNS動画クリエイター</h1>
          </div>
        </div>

        <FFmpegLoader
          loaded={ff.loaded}
          loading={ff.loading}
          loadProgress={ff.loadProgress}
          error={ff.error}
          onLoad={ff.load}
        />
      </div>

      {ff.loaded && !result && (
        <>
          {/* ── Main panels ──────────────────────── */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* ─── Left: Media Bin ─────────────────── */}
            <div className="border-b lg:border-b-0 lg:border-r bg-card/50 flex flex-col overflow-hidden" style={{ width: leftPanelWidth, minWidth: 48 }}>
              <div className="px-3 py-2 border-b flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  メディア
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => videoInputRef.current?.click()}
                    title="動画を追加"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.avi,.webm,.mkv"
                multiple
                onChange={(e) => {
                  if (e.target.files) addClips(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <input
                ref={bgmInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg,.flac"
                onChange={handleBgmSelect}
                className="hidden"
              />

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {clips.length === 0 && !bgmFile && (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-1.5 py-8 rounded-lg border border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <Film className="h-5 w-5 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">動画を追加</span>
                  </button>
                )}

                {/* Video clips */}
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedId(clip.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors ${
                      selectedId === clip.id
                        ? "bg-primary/15 ring-1 ring-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {clip.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={clip.thumbnailUrl}
                        alt=""
                        className="w-10 h-6 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-6 rounded bg-muted shrink-0 flex items-center justify-center">
                        <Film className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{clip.name}</p>
                      <p className="text-[10px] text-muted-foreground">{fmt(clip.fullDuration)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClip(clip.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {/* Add more clips */}
                {clips.length > 0 && (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> 動画を追加
                  </button>
                )}

                {loadingClips && (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">読み込み中...</span>
                  </div>
                )}

                {/* Divider */}
                {clips.length > 0 && <div className="border-t my-2" />}

                {/* BGM */}
                {bgmFile ? (
                  <div className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30">
                    <div className="w-10 h-6 rounded bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Music className="h-3 w-3 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{bgmName}</p>
                      <p className="text-[10px] text-muted-foreground">BGM</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setBgmFile(null);
                        setBgmName("");
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => bgmInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Music className="h-3 w-3" /> ファイルからBGMを追加
                    </button>

                    {/* SNS BGM input (TikTok / YouTube / Instagram) */}
                    <div className="rounded-md border border-border/60 p-2 space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Link2 className="h-3 w-3" />
                        <span>SNSから音源を取得</span>
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="TikTok / YouTube / Instagram URL"
                          value={snsBgmUrl}
                          onChange={(e) => setSnsBgmUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSnsBgm();
                          }}
                          className="flex-1 min-w-0 rounded border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleSnsBgm}
                          disabled={snsBgmLoading || !snsBgmUrl.trim()}
                          title="音源を取得"
                        >
                          {snsBgmLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground/60">
                        TikTok・YouTube・Instagram対応
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Left resize handle */}
            <div
              className="hidden lg:flex w-1.5 cursor-col-resize items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors group/resize shrink-0"
              onPointerDown={(e) => handleResizePointerDown(e, "left")}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
            >
              <div className="w-px h-8 bg-border group-hover/resize:bg-primary/40 transition-colors" />
            </div>

            {/* ─── Center: Preview ─────────────────── */}
            <div className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-900 min-h-0">
              <div className="flex-1 flex items-center justify-center p-1.5 min-h-0">
                {selectedClip ? (
                  <div className="relative flex flex-col items-center gap-1.5 max-h-full w-full">
                    <div className="relative bg-black rounded-lg overflow-hidden shadow-xl mx-auto" style={{ aspectRatio: "9/16", maxHeight: "calc(100vh - 280px)", width: "auto" }}>
                      <video
                        ref={videoRef}
                        key={selectedClip.objectUrl}
                        src={selectedClip.objectUrl}
                        className="h-full w-full object-contain"
                        style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
                        playsInline
                        muted={audioMode === "mute" || audioMode === "replace"}
                        onLoadedData={() => {
                          // Fires when a new source loads (element recreated via key change).
                          // Handles sequential auto-play for different-file clips.
                          const v = videoRef.current;
                          if (!v || !selectedClip) return;
                          if (seqPlayRef.current) {
                            v.currentTime = selectedClip.inPoint;
                            v.play().catch(() => {});
                            setPlaying(true);
                            const bgm = bgmAudioRef.current;
                            const useBgm = bgmFile && (audioMode === "replace" || audioMode === "mix");
                            if (bgm && useBgm && bgm.paused) {
                              bgm.play().catch(() => {});
                            }
                          } else {
                            v.currentTime = selectedClip.inPoint;
                            setCurrentTime(selectedClip.inPoint);
                          }
                        }}
                      />
                      {/* Text overlay preview */}
                      {overlays.filter((o) => o.text.trim()).map((o) => (
                        <div
                          key={o.id}
                          className="absolute left-0 right-0 text-center pointer-events-none px-2"
                          style={{
                            top: o.position === "top" ? "5%" : o.position === "center" ? "50%" : undefined,
                            bottom: o.position === "bottom" ? "5%" : undefined,
                            transform: o.position === "center" ? "translateY(-50%)" : undefined,
                          }}
                        >
                          {o.text.split("\n").map((line, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: `${TEXT_PREVIEW_SIZES[o.size] || 14}px`,
                                color: o.color,
                                fontWeight: "bold",
                                textShadow:
                                  o.color === "#000000"
                                    ? "0 0 3px #fff, 0 0 3px #fff"
                                    : "0 0 3px #000, 0 0 3px #000",
                                lineHeight: 1.4,
                              }}
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {/* Hidden BGM audio element */}
                    {bgmObjectUrl && (
                      <audio ref={bgmAudioRef} src={bgmObjectUrl} preload="auto" />
                    )}
                    {/* Transport bar — Premiere Pro style */}
                    <div className="flex items-center gap-1 bg-card/80 rounded-md px-2 py-0.5 border">
                      <Button variant="ghost" size="icon-xs" onClick={jumpToStart} title="先頭へ">
                        <SkipBack className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => stepFrame(-1)} title="1フレーム戻る">
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={togglePlay}
                        title="再生/一時停止"
                        className="mx-0.5"
                      >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => stepFrame(1)} title="1フレーム進む">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={jumpToEnd} title="末尾へ">
                        <SkipForward className="h-3.5 w-3.5" />
                      </Button>
                      {/* Rotation controls */}
                      <div className="border-l mx-1 h-4" />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setRotation((r) => ((r + 270) % 360))}
                        title="左に90°回転"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-[9px] text-muted-foreground font-mono w-6 text-center">{rotation}°</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setRotation((r) => ((r + 90) % 360))}
                        title="右に90°回転"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      {/* Timecode display */}
                      <div className="border-l mx-1 h-4" />
                      <div className="bg-black/80 rounded px-2 py-0.5 font-mono text-[11px] text-blue-400 tabular-nums tracking-wider">
                        {fmt(globalCurrentTime)}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 mx-0.5">/</span>
                      <div className="bg-black/80 rounded px-2 py-0.5 font-mono text-[11px] text-muted-foreground tabular-nums tracking-wider">
                        {fmt(totalDuration)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Film className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground/60">
                      動画を追加してプレビュー
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right resize handle */}
            <div
              className="hidden lg:flex w-1.5 cursor-col-resize items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors group/resize shrink-0"
              onPointerDown={(e) => handleResizePointerDown(e, "right")}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
            >
              <div className="w-px h-8 bg-border group-hover/resize:bg-primary/40 transition-colors" />
            </div>

            {/* ─── Right: Inspector / Settings ────── */}
            <div className="border-t lg:border-t-0 lg:border-l bg-card/50 overflow-y-auto overflow-x-hidden" style={{ width: rightPanelWidth, minWidth: 48 }}>
              {/* Settings header (collapsible on mobile) */}
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full px-3 py-2 border-b flex items-center justify-between lg:pointer-events-none"
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="h-3 w-3" /> 設定
                </span>
                <span className="lg:hidden">
                  {settingsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </button>

              <div className={`${settingsOpen ? "block" : "hidden lg:block"} p-3 space-y-4`}>
                {/* Platform */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    プラットフォーム
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                          platform === p.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {plat.w}×{plat.h} ・ {plat.note}
                  </p>
                </div>

                {/* Crop position */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    クロップ位置
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {CROP_POSITIONS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setCrop(c.value)}
                        className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                          crop === c.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio mode */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    オーディオ
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {AUDIO_MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setAudioMode(m.value)}
                        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                          audioMode === m.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <m.icon className="h-3 w-3" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume sliders */}
                {audioMode === "mix" && bgmFile && (
                  <div className="space-y-2 rounded-md bg-muted/30 p-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground">音量バランス</p>
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span>元音声</span>
                        <span className="text-muted-foreground">{origVol}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={origVol}
                        onChange={(e) => setOrigVol(Number(e.target.value))}
                        className="w-full h-1 accent-primary"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span>BGM</span>
                        <span className="text-muted-foreground">{bgmVol}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100" value={bgmVol}
                        onChange={(e) => setBgmVol(Number(e.target.value))}
                        className="w-full h-1 accent-primary"
                      />
                    </div>
                  </div>
                )}

                {/* BGM start offset slider */}
                {bgmFile && (audioMode === "replace" || audioMode === "mix") && bgmDuration > 0 && (
                  <div className="space-y-2 rounded-md bg-muted/30 p-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground">BGM開始位置</p>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(bgmDuration - 1, 0)}
                      step="0.1"
                      value={bgmStartOffset}
                      onChange={(e) => setBgmStartOffset(Number(e.target.value))}
                      className="w-full h-1 accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{fmt(bgmStartOffset)}</span>
                      <span>全長 {fmt(bgmDuration)}</span>
                    </div>
                  </div>
                )}

                {/* Quality */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    画質
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {QUALITY.map((q) => (
                      <button
                        key={q.value}
                        onClick={() => setQuality(q.value)}
                        className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                          quality === q.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Text Overlays (テロップ) ─────────── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Type className="h-3 w-3" /> テロップ
                    </label>
                    <Button variant="ghost" size="icon-xs" onClick={addOverlay} title="テロップを追加">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {overlays.length === 0 && (
                    <button
                      onClick={addOverlay}
                      className="w-full flex items-center justify-center gap-1 py-2 rounded-md border border-dashed border-border/60 text-[10px] text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> テキストを追加
                    </button>
                  )}

                  <div className="space-y-2">
                    {overlays.map((o) => (
                      <div key={o.id} className="rounded-md border p-2 space-y-1.5">
                        <div className="flex items-start gap-1">
                          <textarea
                            rows={2}
                            placeholder="テキストを入力..."
                            value={o.text}
                            onChange={(e) => updateOverlay(o.id, { text: e.target.value })}
                            className="flex-1 min-w-0 rounded border bg-background px-2 py-1 text-[11px] resize-none placeholder:text-muted-foreground/50"
                          />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeOverlay(o.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Position */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground w-6 shrink-0">位置</span>
                          <div className="flex gap-0.5 flex-1">
                            {(["top", "center", "bottom"] as const).map((pos) => (
                              <button
                                key={pos}
                                onClick={() => updateOverlay(o.id, { position: pos })}
                                className={`flex-1 rounded px-1 py-0.5 text-[9px] font-medium transition-colors ${
                                  o.position === pos
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                                }`}
                              >
                                {pos === "top" ? "上" : pos === "center" ? "中央" : "下"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Size */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground w-6 shrink-0">大小</span>
                          <div className="flex gap-0.5 flex-1">
                            {(["s", "m", "l"] as const).map((sz) => (
                              <button
                                key={sz}
                                onClick={() => updateOverlay(o.id, { size: sz })}
                                className={`flex-1 rounded px-1 py-0.5 text-[9px] font-medium transition-colors ${
                                  o.size === sz
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                                }`}
                              >
                                {sz === "s" ? "小" : sz === "m" ? "中" : "大"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Color */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground w-6 shrink-0">色</span>
                          <div className="flex gap-1 flex-1">
                            {TEXT_COLORS.map((tc) => (
                              <button
                                key={tc.value}
                                onClick={() => updateOverlay(o.id, { color: tc.value })}
                                className={`w-5 h-5 rounded-full border-2 transition-colors ${
                                  o.color === tc.value
                                    ? "border-primary ring-1 ring-primary/30"
                                    : "border-border/60 hover:border-border"
                                }`}
                                style={{ backgroundColor: tc.value }}
                                title={tc.label}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected clip — trimming controls */}
                {selectedClip && (
                  <div className="rounded-md bg-muted/30 p-2.5 space-y-2">
                    <p className="text-[11px] font-medium truncate">{selectedClip.name}</p>

                    {/* In point slider */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">In</span>
                        <span className="font-mono text-muted-foreground">{fmt(selectedClip.inPoint)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={selectedClip.fullDuration}
                        step="0.01"
                        value={selectedClip.inPoint}
                        onChange={(e) => {
                          const newIn = Math.min(Number(e.target.value), selectedClip.outPoint - 0.1);
                          updateClip(selectedClip.id, { inPoint: Math.max(0, newIn) });
                        }}
                        className="w-full h-1 accent-primary"
                      />
                    </div>

                    {/* Out point slider */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">Out</span>
                        <span className="font-mono text-muted-foreground">{fmt(selectedClip.outPoint)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={selectedClip.fullDuration}
                        step="0.01"
                        value={selectedClip.outPoint}
                        onChange={(e) => {
                          const newOut = Math.max(Number(e.target.value), selectedClip.inPoint + 0.1);
                          updateClip(selectedClip.id, { outPoint: Math.min(selectedClip.fullDuration, newOut) });
                        }}
                        className="w-full h-1 accent-primary"
                      />
                    </div>

                    {/* Duration info */}
                    <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                      <span>使用時間</span>
                      <span className="font-mono">{fmt(selectedClip.outPoint - selectedClip.inPoint)} / {fmt(selectedClip.fullDuration)}</span>
                    </div>

                    <p className="text-[9px] text-muted-foreground/60">
                      スライダーまたはタイムラインのクリップ端をドラッグ
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline resize handle (drag up/down to resize) */}
          <div
            className="h-1.5 cursor-row-resize flex items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors group/resize border-t bg-neutral-900"
            onPointerDown={(e) => handleResizePointerDown(e, "timeline")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          >
            <div className="h-px w-12 bg-neutral-700 group-hover/resize:bg-primary/40 transition-colors" />
          </div>

          {/* ── Timeline — Premiere Pro style ───── */}
          <div ref={timelineRef} className="bg-neutral-950 overflow-hidden" style={{ height: timelineHeight }}>
            {/* Timeline header */}
            <div className="flex items-center justify-between px-3 py-1 border-b border-neutral-800 bg-neutral-900">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                タイムライン
              </span>
              <div className="flex items-center gap-2">
                {totalDuration > plat.maxDur && (
                  <span className="text-[10px] text-red-400">
                    {plat.label}上限 {plat.maxDur}秒 超過
                  </span>
                )}
                <span className="text-[10px] text-neutral-500 font-mono tabular-nums">
                  合計 {fmt(totalDuration)}
                </span>
                <div className="border-l border-neutral-700 h-4 mx-1" />
                {/* Zoom controls — prominent buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimelineZoom((z) => Math.max(TIMELINE_ZOOM_MIN, z - TIMELINE_ZOOM_STEP))}
                  disabled={timelineZoom <= TIMELINE_ZOOM_MIN}
                  className="text-neutral-300 hover:text-white hover:bg-neutral-700 h-6 w-6 p-0"
                  title="ズームアウト"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                {/* Zoom slider */}
                <input
                  type="range"
                  min={TIMELINE_ZOOM_MIN}
                  max={TIMELINE_ZOOM_MAX}
                  step={0.1}
                  value={timelineZoom}
                  onChange={(e) => setTimelineZoom(Number(e.target.value))}
                  className="w-16 h-1 accent-blue-400 cursor-pointer"
                  title={`ズーム ${timelineZoom.toFixed(1)}x`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimelineZoom((z) => Math.min(TIMELINE_ZOOM_MAX, z + TIMELINE_ZOOM_STEP))}
                  disabled={timelineZoom >= TIMELINE_ZOOM_MAX}
                  className="text-neutral-300 hover:text-white hover:bg-neutral-700 h-6 w-6 p-0"
                  title="ズームイン"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <span className="text-[10px] text-neutral-400 font-mono w-8 text-center tabular-nums">
                  {timelineZoom.toFixed(1)}x
                </span>
              </div>
            </div>

            {/* Timeline body with ruler + tracks + playhead */}
            <div className="flex">
              {/* Track labels */}
              <div className="w-8 shrink-0 border-r border-neutral-800 bg-neutral-900/50">
                {/* Ruler spacer */}
                <div className="h-5 border-b border-neutral-800" />
                {/* V label */}
                <div className="h-14 flex items-center justify-center border-b border-neutral-800">
                  <span className="text-[10px] font-bold text-blue-400">V</span>
                </div>
                {/* A label */}
                <div className="h-8 flex items-center justify-center border-b border-neutral-800">
                  <span className="text-[10px] font-bold text-emerald-400">A</span>
                </div>
                {/* T label */}
                {overlays.filter((o) => o.text.trim()).length > 0 && (
                  <div className="h-6 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-amber-400">T</span>
                  </div>
                )}
              </div>

              {/* Scrollable tracks area */}
              <div className="flex-1 overflow-x-auto relative">
                <div style={{ width: `${Math.max(totalDuration * pxPerSec, 200)}px`, minWidth: "100%" }}>
                  {/* Ruler */}
                  <div
                    className="h-5 border-b border-neutral-800 relative cursor-pointer bg-neutral-900/80"
                    onClick={handleRulerClick}
                  >
                    {rulerTicks.map((tick) => (
                      <div
                        key={tick.time}
                        className="absolute top-0"
                        style={{ left: `${tick.time * pxPerSec}px` }}
                      >
                        <div
                          className={`${tick.major ? "h-5 bg-neutral-600" : "h-2.5 bg-neutral-700"}`}
                          style={{ width: "1px" }}
                        />
                        {tick.major && (
                          <span className="absolute top-0.5 left-1 text-[8px] text-neutral-500 font-mono whitespace-nowrap select-none">
                            {fmt(tick.time)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* V — Video track */}
                  <div className="h-14 border-b border-neutral-800 relative">
                    {clips.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={clips.map((c) => c.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          <div className="flex h-full">
                            {clips.map((clip, i) => (
                              <SortableClip
                                key={clip.id}
                                clip={clip}
                                index={i}
                                isSelected={clip.id === selectedId}
                                totalDuration={totalDuration}
                                pxPerSec={pxPerSec}
                                onClick={() => setSelectedId(clip.id)}
                                onTrimIn={handleTrimIn}
                                onTrimOut={handleTrimOut}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] text-neutral-600">
                          動画クリップをここに配置
                        </span>
                      </div>
                    )}
                  </div>

                  {/* A — Audio track */}
                  <div className="h-8 border-b border-neutral-800 relative">
                    {bgmFile && needsBgm ? (
                      <div
                        className="h-full bg-purple-500/25 border-y border-purple-500/40 flex items-center px-2"
                        style={{ width: `${Math.max(totalDuration * pxPerSec, 64)}px` }}
                      >
                        <Music className="h-3 w-3 text-purple-400 shrink-0 mr-1" />
                        <span className="text-[10px] text-purple-300 truncate">{bgmName}</span>
                      </div>
                    ) : audioMode === "keep" && clips.length > 0 ? (
                      <div
                        className="h-full bg-emerald-500/15 flex items-center px-2"
                        style={{ width: `${Math.max(totalDuration * pxPerSec, 64)}px` }}
                      >
                        <Volume2 className="h-3 w-3 text-emerald-500/60 shrink-0 mr-1" />
                        <span className="text-[10px] text-emerald-500/60">元の音声</span>
                      </div>
                    ) : audioMode === "mute" ? (
                      <div className="h-full flex items-center px-2">
                        <VolumeX className="h-3 w-3 text-neutral-600 shrink-0 mr-1" />
                        <span className="text-[10px] text-neutral-600">ミュート</span>
                      </div>
                    ) : needsBgm && !bgmFile ? (
                      <button
                        onClick={() => bgmInputRef.current?.click()}
                        className="h-full flex items-center px-2 hover:bg-purple-500/5 transition-colors"
                      >
                        <Plus className="h-3 w-3 text-purple-400/60 shrink-0 mr-1" />
                        <span className="text-[10px] text-purple-400/60">BGMを追加</span>
                      </button>
                    ) : null}
                  </div>

                  {/* T — Text overlay track */}
                  {overlays.filter((o) => o.text.trim()).length > 0 && (
                    <div className="h-6 relative">
                      <div
                        className="h-full bg-amber-500/15 flex items-center px-2"
                        style={{ width: `${Math.max(totalDuration * pxPerSec, 64)}px` }}
                      >
                        <Type className="h-3 w-3 text-amber-400/60 shrink-0 mr-1" />
                        <span className="text-[10px] text-amber-400/60 truncate">
                          テロップ ×{overlays.filter((o) => o.text.trim()).length}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── Playhead (CTI) — red line spanning all tracks ── */}
                  {totalDuration > 0 && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-30"
                      style={{ left: `${playheadPx}px` }}
                    >
                      {/* Playhead marker (triangle at top) */}
                      <div className="relative">
                        <div
                          className="absolute -top-0 -translate-x-1/2 w-0 h-0"
                          style={{
                            borderLeft: "5px solid transparent",
                            borderRight: "5px solid transparent",
                            borderTop: "6px solid #ef4444",
                          }}
                        />
                      </div>
                      {/* Playhead line */}
                      <div className="w-px h-full bg-red-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Export bar ────────────────────────── */}
          <div className="border-t bg-card px-4 py-3">
            {processing ? (
              <div className="space-y-2">
                <Progress value={ff.progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground text-center">
                  {processStep} {ff.progress > 0 ? `${ff.progress}%` : ""}
                </p>
              </div>
            ) : (
              <Button
                onClick={handleExport}
                disabled={clips.length === 0 || (needsBgm && !bgmFile) || processing}
                className="w-full gap-2"
                size="lg"
              >
                <Download className="h-4 w-4" />
                {plat.label}用に書き出し ({fmt(totalDuration)})
              </Button>
            )}
          </div>
        </>
      )}

      {/* ── Result ───────────────────────────────── */}
      {result && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="rounded-xl border bg-card p-8">
              <p className="text-lg font-medium mb-1">書き出し完了</p>
              <p className="text-sm text-muted-foreground mb-6">
                {plat.label}用の動画 ({fmt(totalDuration)})
              </p>
              <Button onClick={handleDownload} size="lg" className="gap-2">
                <Download className="h-5 w-5" />
                ダウンロード
              </Button>
            </div>
            <Button variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              新しいプロジェクト
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
