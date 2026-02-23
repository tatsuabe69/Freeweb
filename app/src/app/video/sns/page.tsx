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
  GripVertical,
  ArrowLeft,
  Smartphone,
  Volume2,
  VolumeX,
  Film,
  Music,
  Settings2,
  Scissors,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  Type,
  Link2,
  Search,
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ================================================================
   Types
   ================================================================ */

interface TimelineClip {
  id: string;
  file: File;
  name: string;
  fullDuration: number;
  inPoint: number;
  outPoint: number;
  thumbnailUrl: string;
  objectUrl: string;
}

interface TextOverlay {
  id: string;
  text: string;
  position: "top" | "center" | "bottom";
  size: "s" | "m" | "l";
  color: string;
}

/* ================================================================
   Constants
   ================================================================ */

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", w: 1080, h: 1920, maxDur: 600, note: "15〜60秒推奨" },
  { id: "reels", label: "Reels", w: 1080, h: 1920, maxDur: 90, note: "最大90秒" },
  { id: "shorts", label: "Shorts", w: 1080, h: 1920, maxDur: 60, note: "最大60秒" },
] as const;

const CROP_POSITIONS = [
  { label: "上", value: "top" },
  { label: "中央", value: "center" },
  { label: "下", value: "bottom" },
] as const;

const AUDIO_MODES = [
  { label: "元音声を保持", value: "keep", icon: Volume2 },
  { label: "BGMで置換", value: "replace", icon: Music },
  { label: "BGMをミックス", value: "mix", icon: Volume2 },
  { label: "ミュート", value: "mute", icon: VolumeX },
] as const;

const QUALITY = [
  { label: "高画質", value: "high", vBit: "8000k", aBit: "192k", buf: "16000k" },
  { label: "標準", value: "standard", vBit: "4000k", aBit: "128k", buf: "8000k" },
  { label: "軽量", value: "compact", vBit: "2000k", aBit: "96k", buf: "4000k" },
] as const;

const CLIP_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-lime-500",
];

const TIMELINE_PX_PER_SEC = 8;

const TEXT_SIZES: Record<string, number> = { s: 36, m: 52, l: 72 };

const TEXT_COLORS = [
  { label: "白", value: "#ffffff" },
  { label: "黒", value: "#000000" },
  { label: "黄", value: "#ffff00" },
  { label: "赤", value: "#ff3333" },
];

/* ================================================================
   Helpers
   ================================================================ */

let _idCounter = 0;
function uid(): string {
  return `clip-${Date.now()}-${_idCounter++}`;
}

function ext(name: string): string {
  const m = name.match(/\.[^.]+$/);
  return m ? m[0] : ".mp4";
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

function fmtSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + u[i];
}

async function loadClipMeta(file: File): Promise<{ duration: number; thumb: string; url: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, 160, 90);
      const thumb = canvas.toDataURL("image/jpeg", 0.6);
      resolve({ duration: video.duration, thumb, url });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("動画を読み込めませんでした"));
    };

    // Timeout fallback — some videos never fire onseeked
    setTimeout(() => {
      if (video.duration) {
        resolve({ duration: video.duration, thumb: "", url });
      }
    }, 5000);
  });
}

/** Render text to a transparent PNG using Canvas (supports Japanese via browser fonts) */
async function renderTextPng(
  text: string,
  fontSize: number,
  color: string,
  canvasWidth: number,
): Promise<{ bytes: Uint8Array; height: number }> {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;

  const font = `bold ${fontSize}px "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", "Meiryo", sans-serif`;

  const tmpCtx = canvas.getContext("2d")!;
  tmpCtx.font = font;

  const lines = text.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { bytes: new Uint8Array(0), height: 0 };

  const lineH = fontSize * 1.5;
  const pad = fontSize * 0.5;
  canvas.height = Math.ceil(lines.length * lineH + pad * 2);

  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Outline for readability
  const outlineColor = color === "#000000" || color === "#000" ? "#ffffff" : "#000000";
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = Math.max(fontSize / 5, 3);
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.strokeText(lines[i], canvas.width / 2, pad + i * lineH);
  }

  ctx.fillStyle = color;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], canvas.width / 2, pad + i * lineH);
  }

  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), "image/png"),
  );
  const buf = await blob.arrayBuffer();
  return { bytes: new Uint8Array(buf), height: canvas.height };
}

/* ================================================================
   SortableClip — draggable clip block on the timeline
   ================================================================ */

function SortableClip({
  clip,
  index,
  isSelected,
  totalDuration,
  onClick,
}: {
  clip: TimelineClip;
  index: number;
  isSelected: boolean;
  totalDuration: number;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clip.id,
  });

  const clipDur = clip.outPoint - clip.inPoint;
  const widthPx = Math.max(clipDur * TIMELINE_PX_PER_SEC, 64);
  const color = CLIP_COLORS[index % CLIP_COLORS.length];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${widthPx}px`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        relative flex-shrink-0 h-14 rounded-md cursor-pointer select-none overflow-hidden
        border-2 transition-colors
        ${isSelected ? "border-white ring-1 ring-white/30" : "border-transparent hover:border-white/40"}
      `}
      {...attributes}
    >
      {/* Color bar + thumbnail background */}
      <div className={`absolute inset-0 ${color} opacity-80`} />
      {clip.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clip.thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
        />
      )}
      {/* Content */}
      <div className="relative flex items-center h-full px-2 gap-1.5">
        <div {...listeners} className="cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="h-3.5 w-3.5 text-white/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-white truncate leading-tight">{clip.name}</p>
          <p className="text-[9px] text-white/70 leading-tight">{fmt(clipDur)}</p>
        </div>
      </div>
    </div>
  );
}

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

  /* ── TikTok BGM ─────────────────────────────── */
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [tiktokLoading, setTiktokLoading] = useState(false);

  /* ── Text overlays (テロップ) ────────────────── */
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);

  /* ── Preview ───────────────────────────────── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  /* ── Process state ─────────────────────────── */
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  /* ── Accordion for mobile ──────────────────── */
  const [settingsOpen, setSettingsOpen] = useState(true);

  /* ── Derived ───────────────────────────────── */
  const plat = PLATFORMS.find((p) => p.id === platform)!;
  const qual = QUALITY.find((q) => q.value === quality)!;
  const needsBgm = audioMode === "replace" || audioMode === "mix";
  const selectedClip = clips.find((c) => c.id === selectedId) ?? null;
  const totalDuration = clips.reduce((s, c) => s + (c.outPoint - c.inPoint), 0);

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
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onEnd = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnd);
    };
  }, [selectedClip]);

  /* ── BGM handler ───────────────────────────── */
  const handleBgmSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setBgmFile(f);
      setBgmName(f.name.replace(/\.[^.]+$/, ""));
    }
    if (bgmInputRef.current) bgmInputRef.current.value = "";
  }, []);

  /* ── TikTok BGM handler ─────────────────────── */
  const handleTikTokBgm = async () => {
    const url = tiktokUrl.trim();
    if (!url) return;
    setTiktokLoading(true);
    try {
      const infoRes = await fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const info = await infoRes.json();
      if (!infoRes.ok) throw new Error(info.error || "音源情報の取得に失敗");

      const dlRes = await fetch("/api/tiktok/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: info.music.playUrl, filename: info.music.title }),
      });
      if (!dlRes.ok) throw new Error("音源のダウンロードに失敗しました");

      const blob = await dlRes.blob();
      const file = new File([blob], `${info.music.title}.mp3`, { type: "audio/mpeg" });

      setBgmFile(file);
      setBgmName(`${info.music.title} - ${info.music.author}`);
      setTiktokUrl("");

      if (audioMode === "keep" || audioMode === "mute") {
        setAudioMode("replace");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "TikTok音源の取得に失敗しました";
      alert(msg);
    } finally {
      setTiktokLoading(false);
    }
  };

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
      const scaleAndCrop = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(in_w-out_w)/2:${cropY}`;

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

        // Add overlay PNG inputs
        for (let j = 0; j < numOverlays; j++) {
          args.push("-i", `overlay${j}.png`);
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

            fc += `; [${prev}][${j + 1}:v]overlay=x=(main_w-overlay_w)/2:y=${yExpr}[${next}]`;
            prev = next;
          }

          // Final format conversion
          fc += `; [${prev}]format=yuv420p,setsar=1[outv]`;

          args.push("-filter_complex", fc);
          args.push("-map", "[outv]");

          if (keepAudio) {
            args.push("-map", "0:a?");
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
          if (numOverlays === 0) {
            args.push("-an");
          } else {
            args.push("-an");
          }
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

        await ff.exec([
          "-i", concatFile,
          "-i", bgmIn,
          "-map", "0:v",
          "-map", "1:a",
          "-c:v", "copy",
          "-c:a", "aac", "-b:a", qual.aBit, "-ar", "44100", "-ac", "2",
          "-shortest",
          "-movflags", "+faststart",
          "-y", "output.mp4",
        ]);
        outputFile = "output.mp4";
      } else if (audioMode === "mix" && bgmFile) {
        setProcessStep("BGMをミックス中...");
        const bgmIn = "bgm" + ext(bgmFile.name);
        await ff.writeFile(bgmIn, await fetchFile(bgmFile));

        const oVol = (origVol / 100).toFixed(2);
        const bVol = (bgmVol / 100).toFixed(2);

        await ff.exec([
          "-i", concatFile,
          "-i", bgmIn,
          "-filter_complex",
          `[0:a]volume=${oVol}[a0];[1:a]volume=${bVol}[a1];[a0][a1]amix=inputs=2:duration=first[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
          "-c:v", "copy",
          "-c:a", "aac", "-b:a", qual.aBit, "-ar", "44100", "-ac", "2",
          "-movflags", "+faststart",
          "-y", "output.mp4",
        ]);
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
    setClips([]);
    setBgmFile(null);
    setBgmName("");
    setSelectedId(null);
    setResult(null);
    setPlaying(false);
    setOverlays([]);
    setTiktokUrl("");
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
            <div className="lg:w-56 xl:w-64 border-b lg:border-b-0 lg:border-r bg-card/50 flex flex-col">
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

                    {/* TikTok BGM input */}
                    <div className="rounded-md border border-border/60 p-2 space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Link2 className="h-3 w-3" />
                        <span>TikTokから音源を取得</span>
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="TikTokのURLを貼り付け"
                          value={tiktokUrl}
                          onChange={(e) => setTiktokUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleTikTokBgm();
                          }}
                          className="flex-1 min-w-0 rounded border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleTikTokBgm}
                          disabled={tiktokLoading || !tiktokUrl.trim()}
                          title="音源を取得"
                        >
                          {tiktokLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground/60">
                        短縮URL (vm.tiktok.com) にも対応
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Center: Preview ─────────────────── */}
            <div className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-900 min-h-0">
              <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                {selectedClip ? (
                  <div className="relative flex flex-col items-center gap-2 max-h-full">
                    <div className="relative bg-black rounded-lg overflow-hidden shadow-xl" style={{ aspectRatio: "9/16", maxHeight: "min(50vh, 400px)" }}>
                      <video
                        ref={videoRef}
                        key={selectedClip.objectUrl}
                        src={selectedClip.objectUrl}
                        className="h-full w-full object-contain"
                        playsInline
                        muted={false}
                      />
                    </div>
                    {/* Transport */}
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon-xs" onClick={togglePlay}>
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <span className="text-xs font-mono text-muted-foreground tabular-nums">
                        {fmt(currentTime)} / {fmt(selectedClip.fullDuration)}
                      </span>
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

            {/* ─── Right: Inspector / Settings ────── */}
            <div className="lg:w-60 xl:w-72 border-t lg:border-t-0 lg:border-l bg-card/50 overflow-y-auto">
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

                {/* Selected clip trim */}
                {selectedClip && (
                  <div className="space-y-2 rounded-md border p-2.5">
                    <div className="flex items-center gap-1.5">
                      <Scissors className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[11px] font-medium">クリップをトリミング</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {selectedClip.name} ({fmt(selectedClip.fullDuration)})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">イン</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={selectedClip.outPoint}
                          value={selectedClip.inPoint.toFixed(1)}
                          onChange={(e) =>
                            updateClip(selectedClip.id, {
                              inPoint: Math.max(0, Math.min(parseFloat(e.target.value) || 0, selectedClip.outPoint)),
                            })
                          }
                          className="w-full rounded border bg-background px-2 py-1 text-[11px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">アウト</label>
                        <input
                          type="number"
                          step="0.1"
                          min={selectedClip.inPoint}
                          max={selectedClip.fullDuration}
                          value={selectedClip.outPoint.toFixed(1)}
                          onChange={(e) =>
                            updateClip(selectedClip.id, {
                              outPoint: Math.min(selectedClip.fullDuration, Math.max(parseFloat(e.target.value) || 0, selectedClip.inPoint)),
                            })
                          }
                          className="w-full rounded border bg-background px-2 py-1 text-[11px] font-mono"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      使用区間: {fmt(selectedClip.outPoint - selectedClip.inPoint)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Timeline ─────────────────────────── */}
          <div className="border-t bg-neutral-50 dark:bg-neutral-900/80">
            {/* Timeline header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                タイムライン
              </span>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                合計 {fmt(totalDuration)}
                {totalDuration > plat.maxDur && (
                  <span className="text-destructive ml-1">
                    ({plat.label}上限 {plat.maxDur}秒 超過)
                  </span>
                )}
              </span>
            </div>

            {/* Video track */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground w-6 shrink-0">V</span>
                <div className="flex-1 min-w-0 overflow-x-auto">
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
                        <div className="flex gap-1">
                          {clips.map((clip, i) => (
                            <SortableClip
                              key={clip.id}
                              clip={clip}
                              index={i}
                              isSelected={clip.id === selectedId}
                              totalDuration={totalDuration}
                              onClick={() => setSelectedId(clip.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="h-14 rounded-md border border-dashed border-border/50 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground/50">
                        動画クリップをここに配置
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Audio track */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground w-6 shrink-0">A</span>
                <div className="flex-1 min-w-0 overflow-x-auto">
                  {bgmFile && needsBgm ? (
                    <div
                      className="h-8 rounded-md bg-purple-500/30 border border-purple-500/40 flex items-center px-2"
                      style={{
                        width: `${Math.max(totalDuration * TIMELINE_PX_PER_SEC, 64)}px`,
                      }}
                    >
                      <Music className="h-3 w-3 text-purple-400 shrink-0 mr-1" />
                      <span className="text-[10px] text-purple-300 truncate">{bgmName}</span>
                    </div>
                  ) : audioMode === "keep" && clips.length > 0 ? (
                    <div
                      className="h-8 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center px-2"
                      style={{
                        width: `${Math.max(totalDuration * TIMELINE_PX_PER_SEC, 64)}px`,
                      }}
                    >
                      <Volume2 className="h-3 w-3 text-emerald-400 shrink-0 mr-1" />
                      <span className="text-[10px] text-emerald-400">元の音声</span>
                    </div>
                  ) : audioMode === "mute" ? (
                    <div className="h-8 rounded-md border border-dashed border-border/30 flex items-center px-2">
                      <VolumeX className="h-3 w-3 text-muted-foreground/40 shrink-0 mr-1" />
                      <span className="text-[10px] text-muted-foreground/40">ミュート</span>
                    </div>
                  ) : needsBgm && !bgmFile ? (
                    <button
                      onClick={() => bgmInputRef.current?.click()}
                      className="h-8 rounded-md border border-dashed border-purple-500/30 flex items-center px-2 hover:bg-purple-500/5 transition-colors"
                    >
                      <Plus className="h-3 w-3 text-purple-400 shrink-0 mr-1" />
                      <span className="text-[10px] text-purple-400">BGMを追加</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Text overlay indicator on timeline */}
              {overlays.filter((o) => o.text.trim()).length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold text-muted-foreground w-6 shrink-0">T</span>
                  <div
                    className="h-6 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center px-2"
                    style={{
                      width: `${Math.max(totalDuration * TIMELINE_PX_PER_SEC, 64)}px`,
                    }}
                  >
                    <Type className="h-3 w-3 text-amber-400 shrink-0 mr-1" />
                    <span className="text-[10px] text-amber-400 truncate">
                      テロップ ×{overlays.filter((o) => o.text.trim()).length}
                    </span>
                  </div>
                </div>
              )}

              {/* Time ruler */}
              {totalDuration > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="w-6 shrink-0" />
                  <div className="flex-1 flex items-end text-[9px] text-muted-foreground/50 font-mono">
                    <span>0:00</span>
                    <span className="flex-1" />
                    {totalDuration > 10 && <span>{fmt(totalDuration / 2)}</span>}
                    <span className="flex-1" />
                    <span>{fmt(totalDuration)}</span>
                  </div>
                </div>
              )}
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
