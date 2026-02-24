/* ================================================================
   SNS Video Creator — Helper Functions
   ================================================================ */

import type { TimelineClip } from "./types";

/** Compute cumulative start time for each clip on the timeline */
export function getClipStartTimes(clips: TimelineClip[]): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const c of clips) {
    starts.push(t);
    t += c.outPoint - c.inPoint;
  }
  return starts;
}

/** Convert a global timeline position (seconds) to { clipIndex, localTime } */
export function globalToLocal(
  globalTime: number,
  clips: TimelineClip[],
): { clipIndex: number; localTime: number } | null {
  let t = 0;
  for (let i = 0; i < clips.length; i++) {
    const dur = clips[i].outPoint - clips[i].inPoint;
    if (globalTime < t + dur) {
      return { clipIndex: i, localTime: clips[i].inPoint + (globalTime - t) };
    }
    t += dur;
  }
  return clips.length > 0
    ? { clipIndex: clips.length - 1, localTime: clips[clips.length - 1].outPoint }
    : null;
}

/** Generate tick marks for the timeline ruler */
export function generateRulerTicks(
  totalDuration: number,
  pxPerSec: number,
): { time: number; major: boolean }[] {
  if (totalDuration <= 0) return [];

  // Choose interval based on zoom level
  let interval: number;
  if (pxPerSec >= 30) interval = 1;
  else if (pxPerSec >= 15) interval = 2;
  else if (pxPerSec >= 8) interval = 5;
  else if (pxPerSec >= 4) interval = 10;
  else interval = 30;

  const majorInterval = interval * 5;
  const ticks: { time: number; major: boolean }[] = [];

  for (let t = 0; t <= totalDuration; t += interval) {
    ticks.push({ time: t, major: t % majorInterval === 0 });
  }
  return ticks;
}

let _idCounter = 0;

export function uid(): string {
  return `clip-${Date.now()}-${_idCounter++}`;
}

export function ext(name: string): string {
  const m = name.match(/\.[^.]+$/);
  return m ? m[0] : ".mp4";
}

export function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

export function fmtSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + u[i];
}

export async function loadClipMeta(
  file: File,
): Promise<{ duration: number; thumb: string; url: string }> {
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
export async function renderTextPng(
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
