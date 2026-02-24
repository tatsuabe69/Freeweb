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
  FileText,
  Video,
  ImageIcon,
  type LucideIcon,
} from "lucide-react";

/* ================================================================
   Tool definitions grouped by category
   ================================================================ */

interface Tool {
  title: string;
  href: string;
  icon: LucideIcon;
  accent: string; // tailwind gradient
}

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;   // ring / accent color
  tools: Tool[];
}

const categories: Category[] = [
  {
    id: "pdf",
    label: "PDF",
    icon: FileText,
    color: "#a78bfa",
    tools: [
      { title: "結合", href: "/pdf/merge", icon: Merge, accent: "from-violet-500 to-purple-600" },
      { title: "分割", href: "/pdf/split", icon: Scissors, accent: "from-blue-500 to-cyan-500" },
      { title: "圧縮", href: "/pdf/compress", icon: Minimize2, accent: "from-emerald-500 to-teal-500" },
      { title: "回転", href: "/pdf/rotate", icon: RotateCw, accent: "from-amber-500 to-orange-500" },
      { title: "→ 画像", href: "/pdf/to-image", icon: Image, accent: "from-rose-500 to-pink-500" },
      { title: "画像 → PDF", href: "/pdf/from-image", icon: FileImage, accent: "from-indigo-500 to-blue-600" },
      { title: "並び替え", href: "/pdf/reorder", icon: ArrowUpDown, accent: "from-fuchsia-500 to-purple-500" },
    ],
  },
  {
    id: "video",
    label: "動画",
    icon: Video,
    color: "#38bdf8",
    tools: [
      { title: "圧縮", href: "/video/compress", icon: Minimize2, accent: "from-sky-500 to-blue-500" },
      { title: "→ GIF", href: "/video/to-gif", icon: Film, accent: "from-lime-500 to-green-500" },
      { title: "トリミング", href: "/video/trim", icon: Scissors, accent: "from-orange-500 to-red-500" },
      { title: "SNSアスペクト比", href: "/video/aspect", icon: Ratio, accent: "from-teal-500 to-cyan-500" },
      { title: "音声抽出", href: "/video/audio", icon: Music, accent: "from-pink-500 to-rose-500" },
      { title: "SNS動画作成", href: "/video/sns", icon: Smartphone, accent: "from-gray-700 to-gray-900" },
      { title: "BGM追加", href: "/video/bgm", icon: Volume2, accent: "from-purple-500 to-indigo-600" },
      { title: "TikTok音源", href: "/video/tiktok-sound", icon: ExternalLink, accent: "from-cyan-500 to-teal-500" },
    ],
  },
  {
    id: "image",
    label: "画像",
    icon: ImageIcon,
    color: "#f472b6",
    tools: [
      { title: "画像 → PDF", href: "/pdf/from-image", icon: FileImage, accent: "from-indigo-500 to-blue-600" },
      { title: "PDF → 画像", href: "/pdf/to-image", icon: Image, accent: "from-rose-500 to-pink-500" },
    ],
  },
];

/* ================================================================
   Dial / Roulette component
   ================================================================ */

const DIAL_RADIUS = 140;
const ITEM_COUNT = categories.length;

function angleBetween(a: number, b: number) {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export default function HomePage() {
  const [angle, setAngle] = useState(0); // current rotation angle (degrees)
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const dragStart = useRef<{ y: number; angle: number; time: number } | null>(null);
  const lastDrag = useRef<{ y: number; time: number } | null>(null);
  const animRef = useRef<number>(0);
  const dialRef = useRef<HTMLDivElement>(null);

  const segmentAngle = 360 / ITEM_COUNT;

  // Snap to nearest item
  const snapToNearest = useCallback((currentAngle: number, vel: number) => {
    // find nearest snap
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < ITEM_COUNT; i++) {
      const target = i * segmentAngle;
      const dist = Math.abs(angleBetween(currentAngle, target));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }, [segmentAngle]);

  // Momentum + snap animation
  useEffect(() => {
    if (isDragging) return;
    if (Math.abs(velocity) < 0.1) {
      // Snap
      const idx = snapToNearest(angle, 0);
      const target = idx * segmentAngle;
      const diff = angleBetween(angle, target);
      if (Math.abs(diff) > 0.5) {
        setAngle((a) => a + diff * 0.2);
        animRef.current = requestAnimationFrame(() => {});
      } else {
        setAngle(target);
        setSelectedIdx(idx);
      }
      const id = requestAnimationFrame(() => {
        if (Math.abs(diff) > 0.5) {
          setVelocity(0.01); // trigger re-render
        }
      });
      return () => cancelAnimationFrame(id);
    }

    const tick = () => {
      setAngle((a) => a + velocity);
      setVelocity((v) => v * 0.92); // friction
    };
    const id = requestAnimationFrame(tick);
    animRef.current = id;
    return () => cancelAnimationFrame(id);
  }, [angle, velocity, isDragging, snapToNearest, segmentAngle]);

  // Mouse / touch handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setVelocity(0);
    dragStart.current = { y: e.clientY, angle, time: Date.now() };
    lastDrag.current = { y: e.clientY, time: Date.now() };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dy = e.clientY - dragStart.current.y;
    const newAngle = dragStart.current.angle - dy * 0.5;
    setAngle(newAngle);
    lastDrag.current = { y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (lastDrag.current && dragStart.current) {
      const dt = Date.now() - dragStart.current.time;
      if (dt > 0) {
        const dy = e.clientY - dragStart.current.y;
        const v = (-dy / dt) * 8;
        setVelocity(Math.abs(v) > 0.5 ? v : 0);
      }
    }
    dragStart.current = null;
  };

  // Wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setAngle((a) => a + e.deltaY * 0.3);
    setVelocity(0);
    // Debounced snap
    const idx = snapToNearest(angle + e.deltaY * 0.3, 0);
    setTimeout(() => {
      setSelectedIdx(idx);
    }, 150);
  }, [angle, snapToNearest]);

  useEffect(() => {
    const el = dialRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const selectedCategory = categories[selectedIdx];

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      {/* Hero + Dial */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-700"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${selectedCategory.color}15 0%, transparent 70%)`,
          }}
        />

        {/* Title */}
        <div className="text-center mb-10 relative z-10">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none">
            Anything.
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            PDF・動画・画像 — なんでも、ブラウザだけで。
          </p>
        </div>

        {/* Dial area */}
        <div className="relative z-10 flex items-center justify-center gap-8 md:gap-16">
          {/* Indicator line (left) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="h-px w-12 lg:w-20" style={{ backgroundColor: selectedCategory.color }} />
            <span
              className="text-xs font-semibold uppercase tracking-widest transition-colors duration-300"
              style={{ color: selectedCategory.color }}
            >
              {selectedCategory.label}
            </span>
          </div>

          {/* Dial */}
          <div
            ref={dialRef}
            className="relative select-none touch-none cursor-grab active:cursor-grabbing"
            style={{ width: DIAL_RADIUS * 2 + 40, height: DIAL_RADIUS * 2 + 40 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-border/30" />

            {/* Tick marks around the dial */}
            {Array.from({ length: 24 }).map((_, i) => {
              const tickAngle = (i * 15) * (Math.PI / 180);
              const r = DIAL_RADIUS + 14;
              return (
                <div
                  key={i}
                  className="absolute w-px bg-border/40"
                  style={{
                    height: i % 3 === 0 ? 8 : 4,
                    left: DIAL_RADIUS + 20 + Math.sin(tickAngle) * r,
                    top: DIAL_RADIUS + 20 - Math.cos(tickAngle) * r,
                    transform: `rotate(${i * 15}deg)`,
                    transformOrigin: "center top",
                  }}
                />
              );
            })}

            {/* Category items on the dial */}
            {categories.map((cat, i) => {
              const itemAngle = (i * segmentAngle - angle) * (Math.PI / 180);
              const x = Math.sin(itemAngle) * DIAL_RADIUS;
              const y = -Math.cos(itemAngle) * DIAL_RADIUS;
              const isActive = i === selectedIdx;
              const Icon = cat.icon;

              return (
                <button
                  key={cat.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = i * segmentAngle;
                    setAngle(target);
                    setSelectedIdx(i);
                    setVelocity(0);
                  }}
                  className="absolute flex flex-col items-center gap-1 transition-all duration-300 pointer-events-auto"
                  style={{
                    left: DIAL_RADIUS + 20 + x - 32,
                    top: DIAL_RADIUS + 20 + y - 32,
                    width: 64,
                    height: 64,
                    transform: `scale(${isActive ? 1.3 : 0.8})`,
                    opacity: isActive ? 1 : 0.4,
                    zIndex: isActive ? 10 : 1,
                  }}
                >
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300"
                    style={{
                      backgroundColor: isActive ? cat.color : "var(--color-muted)",
                      boxShadow: isActive ? `0 0 24px ${cat.color}40` : "none",
                    }}
                  >
                    <Icon
                      className="h-5 w-5 transition-colors duration-300"
                      style={{ color: isActive ? "#fff" : "var(--color-muted-foreground)" }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-bold tracking-wide transition-all duration-300 whitespace-nowrap"
                    style={{
                      color: isActive ? cat.color : "var(--color-muted-foreground)",
                      fontSize: isActive ? 13 : 10,
                    }}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}

            {/* Center dot */}
            <div
              className="absolute rounded-full transition-colors duration-500"
              style={{
                width: 8,
                height: 8,
                left: DIAL_RADIUS + 20 - 4,
                top: DIAL_RADIUS + 20 - 4,
                backgroundColor: selectedCategory.color,
                boxShadow: `0 0 12px ${selectedCategory.color}60`,
              }}
            />

            {/* Top pointer / indicator triangle */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 z-20"
              style={{
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: `8px solid ${selectedCategory.color}`,
              }}
            />
          </div>

          {/* Mobile label (below dial) */}
          <div className="md:hidden absolute -bottom-2 left-1/2 -translate-x-1/2">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: selectedCategory.color }}
            >
              {selectedCategory.label}
            </span>
          </div>

          {/* Indicator line (right) */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {selectedCategory.tools.length} tools
            </span>
            <div className="h-px w-12 lg:w-20 bg-border/40" />
          </div>
        </div>
      </section>

      {/* Tool list for selected category */}
      <section className="px-6 lg:px-10 pb-16 pt-4">
        <div className="mx-auto max-w-screen-lg">
          {/* Section header with line */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-border/40" />
            <h2
              className="text-lg font-bold tracking-tight transition-colors duration-300"
              style={{ color: selectedCategory.color }}
            >
              {selectedCategory.label}ツール
            </h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          {/* Tools grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {selectedCategory.tools.map((tool, i) => (
              <Link key={tool.href} href={tool.href}>
                <div
                  className="group relative flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3.5 cursor-pointer transition-all duration-300 hover:border-transparent hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 dark:hover:shadow-black/20"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${tool.accent} shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                    <tool.icon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <span className="text-sm font-medium">{tool.title}</span>
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${tool.accent} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none`} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
