"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Merge,
  Scissors,
  Minimize2,
  RotateCw,
  Image,
  FileImage,
  ArrowUpDown,
  Film,
  Ratio,
  Music,
  Smartphone,
  Volume2,
  ExternalLink,
  Shield,
  Zap,
  Globe,
  type LucideIcon,
} from "lucide-react";

/* ================================================================
   All tools in a single flat list for the dial
   ================================================================ */

interface DialItem {
  title: string;
  href: string;
  icon: LucideIcon;
  color: string;  // hex accent
  category: string;
  description: string;
  related: number[];  // indices of related tools
  steps: string[];    // usage steps
}

const items: DialItem[] = [
  { title: "PDF 結合",       href: "/pdf/merge",         icon: Merge,        color: "#8b5cf6", category: "PDF",  description: "複数のPDFファイルを1つに結合。ページ順の並び替えも可能。", related: [1, 6], steps: ["結合したいPDFをドロップ", "ドラッグで順番を調整", "結合してダウンロード"] },
  { title: "PDF 分割",       href: "/pdf/split",         icon: Scissors,     color: "#3b82f6", category: "PDF",  description: "PDFを指定ページで分割。不要なページを削除して軽量化。", related: [0, 6], steps: ["PDFファイルをアップロード", "分割するページ範囲を指定", "分割してダウンロード"] },
  { title: "PDF 圧縮",       href: "/pdf/compress",      icon: Minimize2,    color: "#10b981", category: "PDF",  description: "画質を保ちながらファイルサイズを削減。メール添付に最適。", related: [0, 1], steps: ["PDFをドロップ", "圧縮レベルを選択", "軽量化してダウンロード"] },
  { title: "PDF 回転",       href: "/pdf/rotate",        icon: RotateCw,     color: "#f59e0b", category: "PDF",  description: "スキャンしたPDFの向きを90°/180°/270°で修正。", related: [6, 4], steps: ["PDFをアップロード", "回転角度を選択", "修正してダウンロード"] },
  { title: "PDF → 画像",     href: "/pdf/to-image",      icon: Image,        color: "#f43f5e", category: "PDF",  description: "PDFの各ページをPNG/JPEG画像に変換。SNS投稿にも。", related: [5, 2], steps: ["PDFをアップロード", "出力形式を選択", "画像をダウンロード"] },
  { title: "画像 → PDF",     href: "/pdf/from-image",    icon: FileImage,    color: "#6366f1", category: "PDF",  description: "複数の画像をまとめて1つのPDFドキュメントに変換。", related: [4, 0], steps: ["画像ファイルを追加", "順番を調整", "PDFに変換"] },
  { title: "PDF 並び替え",   href: "/pdf/reorder",       icon: ArrowUpDown,  color: "#d946ef", category: "PDF",  description: "ドラッグ&ドロップでPDFのページ順を自由に変更。", related: [0, 1], steps: ["PDFをアップロード", "ページをドラッグで並び替え", "保存してダウンロード"] },
  { title: "動画圧縮",       href: "/video/compress",    icon: Minimize2,    color: "#0ea5e9", category: "動画", description: "画質を維持しつつファイルサイズを大幅圧縮。共有しやすく。", related: [9, 12], steps: ["動画をアップロード", "圧縮品質を選択", "圧縮してダウンロード"] },
  { title: "動画 → GIF",     href: "/video/to-gif",      icon: Film,         color: "#84cc16", category: "動画", description: "動画の一部をアニメーションGIFに変換。チャットやSNSに。", related: [9, 7], steps: ["動画をアップロード", "切り出す範囲を選択", "GIFに変換"] },
  { title: "動画トリミング", href: "/video/trim",        icon: Scissors,     color: "#f97316", category: "動画", description: "開始・終了時間を指定して動画の不要部分をカット。", related: [12, 7], steps: ["動画をアップロード", "開始・終了をスライダーで指定", "トリミングしてダウンロード"] },
  { title: "SNSアスペクト比", href: "/video/aspect",     icon: Ratio,        color: "#14b8a6", category: "動画", description: "TikTok・Reels・Shorts向けに9:16等のアスペクト比に変換。", related: [12, 9], steps: ["動画をアップロード", "プラットフォームを選択", "変換してダウンロード"] },
  { title: "音声抽出",       href: "/video/audio",       icon: Music,        color: "#ec4899", category: "動画", description: "動画からMP3/WAV/AAC形式で音声だけを抽出・保存。", related: [13, 14], steps: ["動画をアップロード", "音声形式を選択", "音声をダウンロード"] },
  { title: "SNS動画作成",    href: "/video/sns",         icon: Smartphone,   color: "#6b7280", category: "動画", description: "複数クリップ編集・テロップ・BGMを1画面で。SNS投稿用の縦動画を作成。", related: [10, 13], steps: ["動画クリップを追加", "テロップ・BGMを設定", "SNS向けに書き出し"] },
  { title: "BGM追加",        href: "/video/bgm",         icon: Volume2,      color: "#a855f7", category: "動画", description: "動画に音楽を追加。元音声とのミックスや置換も対応。", related: [12, 11], steps: ["動画をアップロード", "音楽ファイルを追加", "ミックスしてダウンロード"] },
  { title: "TikTok音源取得", href: "/video/tiktok-sound", icon: ExternalLink, color: "#06b6d4", category: "動画", description: "TikTok動画のURLから使用されている音源を取得・保存。", related: [13, 12], steps: ["TikTokのURLを貼り付け", "音源情報を確認", "MP3でダウンロード"] },
];

/* ================================================================
   Half-circle dial on the left edge — compact layout
   ================================================================ */

const ARC_RADIUS = 240;           // radius of the half-circle (compact)
const ITEM_SPACING = 24;          // degrees between items
const VISIBLE_RANGE = 5;          // items visible above/below center

/* Category tools for the grid */
function getCategoryTools(category: string): { title: string; href: string; icon: LucideIcon; color: string }[] {
  return items.filter((it) => it.category === category).map(({ title, href, icon, color }) => ({ title, href, icon, color }));
}

export default function HomePage() {
  const [scrollOffset, setScrollOffset] = useState(0); // in degrees
  const [velocity, setVelocity] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startOffset: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const totalItems = items.length;
  const maxOffset = (totalItems - 1) * ITEM_SPACING;

  // Current center item index
  const centerIdx = Math.round(Math.max(0, Math.min(scrollOffset, maxOffset)) / ITEM_SPACING);
  const centerItem = items[Math.max(0, Math.min(centerIdx, totalItems - 1))];
  const categoryTools = getCategoryTools(centerItem.category);

  // Snap animation
  useEffect(() => {
    if (isDragging) return;

    const snapTarget = Math.round(scrollOffset / ITEM_SPACING) * ITEM_SPACING;
    const clampedTarget = Math.max(0, Math.min(snapTarget, maxOffset));

    if (Math.abs(velocity) > 0.3) {
      // Momentum
      const id = requestAnimationFrame(() => {
        setScrollOffset((o) => {
          const next = o + velocity;
          return Math.max(-ITEM_SPACING, Math.min(next, maxOffset + ITEM_SPACING));
        });
        setVelocity((v) => v * 0.9);
      });
      animRef.current = id;
      return () => cancelAnimationFrame(id);
    }

    // Snap
    const diff = clampedTarget - scrollOffset;
    if (Math.abs(diff) > 0.3) {
      const id = requestAnimationFrame(() => {
        setScrollOffset((o) => o + diff * 0.18);
      });
      animRef.current = id;
      return () => cancelAnimationFrame(id);
    } else if (scrollOffset !== clampedTarget) {
      setScrollOffset(clampedTarget);
    }
  }, [scrollOffset, velocity, isDragging, maxOffset]);

  // Wheel handler
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setScrollOffset((o) => {
      const next = o + e.deltaY * 0.15;
      return Math.max(-ITEM_SPACING * 0.5, Math.min(next, maxOffset + ITEM_SPACING * 0.5));
    });
    setVelocity(0);
  }, [maxOffset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setVelocity(0);
    dragRef.current = { startY: e.clientY, startOffset: scrollOffset };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    setScrollOffset(dragRef.current.startOffset - dy * 0.3);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    setIsDragging(false);
    const dy = e.clientY - dragRef.current.startY;
    const dt = 1; // simplify
    setVelocity((-dy * 0.05) / dt);
    dragRef.current = null;
  };

  const CenterIcon = centerItem.icon;

  return (
    <div className="min-h-[calc(100vh-60px)] flex overflow-hidden">
      {/* ── Left: Half-circle dial (compact) ───── */}
      <div
        ref={containerRef}
        className="relative select-none touch-none cursor-grab active:cursor-grabbing shrink-0"
        style={{ width: ARC_RADIUS + 60 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Arc background — subtle semicircle */}
        <div
          className="absolute rounded-full border border-border/15 pointer-events-none"
          style={{
            width: ARC_RADIUS * 2,
            height: ARC_RADIUS * 2,
            left: -ARC_RADIUS + 40,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />

        {/* Center indicator line */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none z-30"
          style={{ width: 40, height: 2 }}
        >
          <div className="h-full w-full" style={{ background: `linear-gradient(to right, transparent, ${centerItem.color})` }} />
        </div>

        {/* Tick marks on the arc */}
        {Array.from({ length: 36 }).map((_, i) => {
          const tickAngle = (i * 10 - 180) * (Math.PI / 180);
          const r = ARC_RADIUS - 4;
          const x = 40 + Math.cos(tickAngle) * r;
          const y = Math.sin(tickAngle) * r;
          if (x < -10) return null;
          return (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                width: i % 3 === 0 ? 5 : 2,
                height: 1,
                backgroundColor: "var(--color-border)",
                opacity: 0.2,
                left: 40 + Math.cos(tickAngle) * r,
                top: `calc(50% + ${y}px)`,
              }}
            />
          );
        })}

        {/* Items placed on the arc — icons only, no text labels */}
        {items.map((item, i) => {
          const angleDeg = (i * ITEM_SPACING - scrollOffset);
          if (Math.abs(angleDeg) > (VISIBLE_RANGE + 1) * ITEM_SPACING) return null;

          const angleRad = (angleDeg * Math.PI) / 180;
          const x = Math.cos(angleRad) * ARC_RADIUS;
          const y = -Math.sin(angleRad) * ARC_RADIUS;

          const proximity = Math.min(Math.abs(angleDeg) / (ITEM_SPACING * 2.5), 1);
          const isCenter = i === centerIdx;
          const scale = isCenter ? 1.2 : 1 - proximity * 0.4;
          const opacity = isCenter ? 1 : Math.max(0.12, 1 - proximity * 0.95);

          const Icon = item.icon;

          return (
            <Link
              key={item.href + i}
              href={item.href}
              onClick={(e) => {
                if (!isCenter) {
                  e.preventDefault();
                  setScrollOffset(i * ITEM_SPACING);
                  setVelocity(0);
                }
              }}
              className="absolute pointer-events-auto transition-transform duration-150"
              style={{
                left: 40 + x - 20,
                top: `calc(50% + ${y}px - 20px)`,
                transform: `scale(${scale})`,
                opacity,
                zIndex: isCenter ? 20 : 10 - Math.round(proximity * 10),
              }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all duration-300"
                style={{
                  backgroundColor: isCenter ? item.color : "var(--color-muted)",
                  boxShadow: isCenter ? `0 0 24px ${item.color}40` : "none",
                }}
              >
                <Icon
                  className="h-4.5 w-4.5 transition-colors duration-200"
                  style={{ color: isCenter ? "#fff" : "var(--color-muted-foreground)" }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Right: Content area (expanded) ────── */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-14 xl:px-20 py-10 min-w-0">
        {/* Brand title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tight leading-none mb-1.5">
          Anything.
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground font-light mb-8 tracking-wide">
          PDF・動画・画像 — なんでも、ブラウザだけで。
        </p>

        {/* Thin divider */}
        <div className="h-px w-12 mb-6 transition-colors duration-500" style={{ backgroundColor: centerItem.color + "60" }} />

        {/* Selected tool detail */}
        <div className="transition-all duration-300 max-w-2xl">
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-widest transition-colors duration-300"
              style={{ backgroundColor: centerItem.color + "12", color: centerItem.color }}
            >
              {centerItem.category}
            </span>
            <span className="text-[10px] text-muted-foreground/40 font-mono">
              {String(centerIdx + 1).padStart(2, "0")} / {String(totalItems).padStart(2, "0")}
            </span>
          </div>

          {/* Tool name */}
          <h2
            className="text-2xl lg:text-3xl font-light tracking-tight mb-2 transition-colors duration-300"
            style={{ color: centerItem.color }}
          >
            {centerItem.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground font-light leading-relaxed mb-5 max-w-lg">
            {centerItem.description}
          </p>

          {/* Steps */}
          <div className="flex items-start gap-4 mb-6">
            {centerItem.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 min-w-0 flex-1">
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0 mt-0.5"
                  style={{ backgroundColor: centerItem.color + "15", color: centerItem.color }}
                >
                  {idx + 1}
                </span>
                <span className="text-xs text-muted-foreground font-light leading-snug">
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={centerItem.href}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
            style={{ backgroundColor: centerItem.color }}
          >
            <CenterIcon className="h-4 w-4" />
            使ってみる
          </Link>
        </div>

        {/* Category tools grid */}
        <div className="mt-8">
          <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-3">
            {centerItem.category}ツール一覧
          </p>
          <div className="flex flex-wrap gap-2">
            {categoryTools.map((tool) => {
              const ToolIcon = tool.icon;
              const isCurrent = tool.href === centerItem.href;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 group ${
                    isCurrent
                      ? "border-current bg-muted/40"
                      : "border-border/30 hover:border-border hover:bg-muted/20"
                  }`}
                  style={isCurrent ? { borderColor: tool.color + "40" } : undefined}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-200"
                    style={{ backgroundColor: tool.color + "15" }}
                  >
                    <ToolIcon className="h-3 w-3" style={{ color: tool.color }} />
                  </div>
                  <span className={`text-xs font-medium transition-colors ${
                    isCurrent ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`}>
                    {tool.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Features bar */}
        <div className="mt-8 flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-muted-foreground/50">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-[10px] font-light tracking-wide">データ送信なし</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground/50">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-[10px] font-light tracking-wide">高速処理</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground/50">
            <Globe className="h-3.5 w-3.5" />
            <span className="text-[10px] font-light tracking-wide">ブラウザ内完結</span>
          </div>
        </div>

        {/* Scroll hint */}
        <p className="mt-6 text-[10px] text-muted-foreground/30 tracking-widest font-light">
          scroll or drag the dial to explore
        </p>
      </div>
    </div>
  );
}
