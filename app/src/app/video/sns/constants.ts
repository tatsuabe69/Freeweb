import { Volume2, Music, VolumeX } from "lucide-react";

/* ================================================================
   SNS Video Creator — Constants
   ================================================================ */

export const PLATFORMS = [
  { id: "tiktok", label: "TikTok", w: 1080, h: 1920, maxDur: 600, note: "15〜60秒推奨" },
  { id: "reels", label: "Reels", w: 1080, h: 1920, maxDur: 90, note: "最大90秒" },
  { id: "shorts", label: "Shorts", w: 1080, h: 1920, maxDur: 60, note: "最大60秒" },
] as const;

export const CROP_POSITIONS = [
  { label: "上", value: "top" },
  { label: "中央", value: "center" },
  { label: "下", value: "bottom" },
] as const;

export const AUDIO_MODES = [
  { label: "元音声を保持", value: "keep", icon: Volume2 },
  { label: "BGMで置換", value: "replace", icon: Music },
  { label: "BGMをミックス", value: "mix", icon: Volume2 },
  { label: "ミュート", value: "mute", icon: VolumeX },
] as const;

export const QUALITY = [
  { label: "高画質", value: "high", vBit: "8000k", aBit: "192k", buf: "16000k" },
  { label: "標準", value: "standard", vBit: "4000k", aBit: "128k", buf: "8000k" },
  { label: "軽量", value: "compact", vBit: "2000k", aBit: "96k", buf: "4000k" },
] as const;

export const CLIP_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-lime-500",
];

export const TIMELINE_PX_PER_SEC = 8;

export const TEXT_SIZES: Record<string, number> = { s: 36, m: 52, l: 72 };

export const TEXT_COLORS = [
  { label: "白", value: "#ffffff" },
  { label: "黒", value: "#000000" },
  { label: "黄", value: "#ffff00" },
  { label: "赤", value: "#ff3333" },
];

export const TEXT_PREVIEW_SIZES: Record<string, number> = { s: 10, m: 14, l: 19 };
