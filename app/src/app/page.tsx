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
}

const items: DialItem[] = [
  { title: "PDF 結合",       href: "/pdf/merge",         icon: Merge,        color: "#8b5cf6", category: "PDF" },
  { title: "PDF 分割",       href: "/pdf/split",         icon: Scissors,     color: "#3b82f6", category: "PDF" },
  { title: "PDF 圧縮",       href: "/pdf/compress",      icon: Minimize2,    color: "#10b981", category: "PDF" },
  { title: "PDF 回転",       href: "/pdf/rotate",        icon: RotateCw,     color: "#f59e0b", category: "PDF" },
  { title: "PDF → 画像",     href: "/pdf/to-image",      icon: Image,        color: "#f43f5e", category: "PDF" },
  { title: "画像 → PDF",     href: "/pdf/from-image",    icon: FileImage,    color: "#6366f1", category: "PDF" },
  { title: "PDF 並び替え",   href: "/pdf/reorder",        icon: ArrowUpDown,  color: "#d946ef", category: "PDF" },
  { title: "動画圧縮",       href: "/video/compress",    icon: Minimize2,    color: "#0ea5e9", category: "動画" },
  { title: "動画 → GIF",     href: "/video/to-gif",      icon: Film,         color: "#84cc16", category: "動画" },
  { title: "動画トリミング", href: "/video/trim",         icon: Scissors,     color: "#f97316", category: "動画" },
  { title: "SNSアスペクト比", href: "/video/aspect",      icon: Ratio,        color: "#14b8a6", category: "動画" },
  { title: "音声抽出",       href: "/video/audio",       icon: Music,        color: "#ec4899", category: "動画" },
  { title: "SNS動画作成",    href: "/video/sns",         icon: Smartphone,   color: "#6b7280", category: "動画" },
  { title: "BGM追加",        href: "/video/bgm",         icon: Volume2,      color: "#a855f7", category: "動画" },
  { title: "TikTok音源取得", href: "/video/tiktok-sound", icon: ExternalLink, color: "#06b6d4", category: "動画" },
];

/* ================================================================
   Half-circle dial on the left edge
   ================================================================ */

const ARC_RADIUS = 340;           // radius of the half-circle
const ITEM_SPACING = 28;          // degrees between items
const VISIBLE_RANGE = 5;          // items visible above/below center

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

  return (
    <div className="min-h-[calc(100vh-60px)] flex overflow-hidden">
      {/* ── Left: Half-circle dial ─────────────────── */}
      <div
        ref={containerRef}
        className="relative select-none touch-none cursor-grab active:cursor-grabbing shrink-0"
        style={{ width: ARC_RADIUS + 80 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Arc background — subtle semicircle */}
        <div
          className="absolute rounded-full border border-border/20 pointer-events-none"
          style={{
            width: ARC_RADIUS * 2,
            height: ARC_RADIUS * 2,
            left: -ARC_RADIUS + 60,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />

        {/* Center indicator line */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none z-30"
          style={{ width: 60, height: 2 }}
        >
          <div className="h-full w-full" style={{ background: `linear-gradient(to right, transparent, ${centerItem.color})` }} />
        </div>

        {/* Tick marks on the arc */}
        {Array.from({ length: 36 }).map((_, i) => {
          const tickAngle = (i * 10 - 180) * (Math.PI / 180);
          const r = ARC_RADIUS - 4;
          const x = 60 + Math.cos(tickAngle) * r;
          const y = Math.sin(tickAngle) * r;
          if (x < -10) return null;
          return (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{
                width: i % 3 === 0 ? 6 : 3,
                height: 1,
                backgroundColor: "var(--color-border)",
                opacity: 0.3,
                left: 60 + Math.cos(tickAngle) * r,
                top: `calc(50% + ${y}px)`,
              }}
            />
          );
        })}

        {/* Items placed on the arc */}
        {items.map((item, i) => {
          // Angle from center (in degrees). 0 = center, positive = above
          const angleDeg = (i * ITEM_SPACING - scrollOffset);

          // Only render items within visible range for performance
          if (Math.abs(angleDeg) > (VISIBLE_RANGE + 1) * ITEM_SPACING) return null;

          const angleRad = (angleDeg * Math.PI) / 180;
          const x = Math.cos(angleRad) * ARC_RADIUS;
          const y = -Math.sin(angleRad) * ARC_RADIUS;

          // Proximity to center: 0=center, 1=far
          const proximity = Math.min(Math.abs(angleDeg) / (ITEM_SPACING * 2.5), 1);
          const isCenter = i === centerIdx;
          const scale = isCenter ? 1.15 : 1 - proximity * 0.35;
          const opacity = isCenter ? 1 : Math.max(0.15, 1 - proximity * 0.9);

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
              className="absolute flex items-center gap-3 pointer-events-auto transition-transform duration-150"
              style={{
                left: 60 + x - 24,
                top: `calc(50% + ${y}px - 24px)`,
                transform: `scale(${scale})`,
                opacity,
                zIndex: isCenter ? 20 : 10 - Math.round(proximity * 10),
              }}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-all duration-300"
                style={{
                  backgroundColor: isCenter ? item.color : "var(--color-muted)",
                  boxShadow: isCenter ? `0 0 20px ${item.color}50` : "none",
                }}
              >
                <Icon
                  className="h-5 w-5 transition-colors duration-200"
                  style={{ color: isCenter ? "#fff" : "var(--color-muted-foreground)" }}
                />
              </div>

              {/* Label — only visible near center */}
              {proximity < 0.6 && (
                <span
                  className="text-sm font-semibold whitespace-nowrap transition-all duration-200"
                  style={{
                    color: isCenter ? item.color : "var(--color-muted-foreground)",
                    opacity: isCenter ? 1 : 0.4,
                    fontSize: isCenter ? 16 : 13,
                  }}
                >
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Right: Content area ───────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12">
        {/* Title */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none mb-3">
          Anything.
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mb-12">
          PDF・動画・画像 — なんでも、ブラウザだけで。
        </p>

        {/* Selected tool detail */}
        <div className="transition-all duration-300">
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors duration-300"
              style={{ backgroundColor: centerItem.color + "20", color: centerItem.color }}
            >
              {centerItem.category}
            </span>
          </div>

          {/* Tool name */}
          <h2
            className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 transition-colors duration-300"
            style={{ color: centerItem.color }}
          >
            {centerItem.title}
          </h2>

          {/* CTA */}
          <Link
            href={centerItem.href}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
            style={{ backgroundColor: centerItem.color }}
          >
            <centerItem.icon className="h-4 w-4" />
            使ってみる
          </Link>
        </div>

        {/* Scroll hint */}
        <p className="mt-16 text-xs text-muted-foreground/50">
          左のダイヤルをスクロール or ドラッグで選択
        </p>
      </div>
    </div>
  );
}
