"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { Shield, Zap, Globe } from "lucide-react";
import { tools, getCategoryTools } from "@/lib/tools";

const ARC_RADIUS = 320;
const ITEM_SPACING = 26;
const VISIBLE_RANGE = 5;
const STORAGE_KEY = "freeweb-tool-index";

export default function DesignDial() {
  const savedIdx = typeof window !== "undefined"
    ? Number(localStorage.getItem(STORAGE_KEY) ?? 0)
    : 0;

  const [scrollOffset, setScrollOffset] = useState(savedIdx * ITEM_SPACING);
  const [velocity, setVelocity] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startOffset: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const totalItems = tools.length;
  const maxOffset = (totalItems - 1) * ITEM_SPACING;

  const centerIdx = Math.round(Math.max(0, Math.min(scrollOffset, maxOffset)) / ITEM_SPACING);
  const centerItem = tools[Math.max(0, Math.min(centerIdx, totalItems - 1))];
  const categoryTools = getCategoryTools(centerItem.category);

  // Persist selected tool index
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(centerIdx));
  }, [centerIdx]);

  // Snap animation
  useEffect(() => {
    if (isDragging) return;

    const snapTarget = Math.round(scrollOffset / ITEM_SPACING) * ITEM_SPACING;
    const clampedTarget = Math.max(0, Math.min(snapTarget, maxOffset));

    if (Math.abs(velocity) > 0.3) {
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
    setVelocity((-dy * 0.05) / 1);
    dragRef.current = null;
  };

  const CenterIcon = centerItem.icon;

  /* ── Cyber grid nodes (deterministic positions) ── */
  const cyberNodes = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      x: ((i * 127 + 30) % 90) + 5,
      y: ((i * 89 + 15) % 85) + 5,
      delay: (i * 0.7) % 3,
      dur: 2.5 + (i * 0.4) % 2,
    })),
  []);

  return (
    <div className="min-h-[calc(100vh-60px)] flex justify-center overflow-hidden relative">
      {/* ── Cyber Grid Background ── */}
      <div className="design-bg design-bg-cyber" aria-hidden="true">
        <div className="cyber-grid" />
        <div className="cyber-floor" />
        <div className="cyber-glow cyber-glow-1" />
        <div className="cyber-glow cyber-glow-2" />
        <div className="cyber-scan" />
        {cyberNodes.map((n, i) => (
          <div
            key={i}
            className="cyber-node"
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`,
              animationDelay: `${n.delay}s`,
              animationDuration: `${n.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="flex items-stretch w-full max-w-6xl">
        {/* ── Left: Half-circle dial ── */}
        <div
          ref={containerRef}
          className="relative select-none touch-none cursor-grab active:cursor-grabbing shrink-0"
          style={{ width: ARC_RADIUS + 80 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className="absolute rounded-full border border-border/20 pointer-events-none shadow-[0_0_80px_rgba(0,0,0,0.03)]"
            style={{
              width: ARC_RADIUS * 2,
              height: ARC_RADIUS * 2,
              left: -ARC_RADIUS + 50,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />

          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none z-30"
            style={{ width: 60, height: 2 }}
          >
            <div className="h-full w-full" style={{ background: `linear-gradient(to right, transparent, ${centerItem.color})` }} />
          </div>

          {Array.from({ length: 36 }).map((_, i) => {
            const tickAngle = (i * 10 - 180) * (Math.PI / 180);
            const r = ARC_RADIUS - 4;
            const xPos = 50 + Math.cos(tickAngle) * r;
            const y = Math.sin(tickAngle) * r;
            if (xPos < -10) return null;
            return (
              <div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  width: i % 3 === 0 ? 6 : 3,
                  height: 1,
                  backgroundColor: "var(--color-border)",
                  opacity: 0.2,
                  left: xPos,
                  top: `calc(50% + ${y}px)`,
                }}
              />
            );
          })}

          {tools.map((item, i) => {
            const angleDeg = i * ITEM_SPACING - scrollOffset;
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
                  left: 50 + x - 24,
                  top: `calc(50% + ${y}px - 24px)`,
                  transform: `scale(${scale})`,
                  opacity,
                  zIndex: isCenter ? 20 : 10 - Math.round(proximity * 10),
                }}
              >
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-all duration-300 backdrop-blur-md"
                  style={{
                    backgroundColor: isCenter ? item.color : "var(--color-muted)",
                    boxShadow: isCenter ? `0 0 24px ${item.color}50, 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)` : "0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  <Icon
                    className="h-5 w-5 transition-colors duration-200"
                    style={{ color: isCenter ? "#fff" : "var(--color-muted-foreground)" }}
                  />
                </div>
              </Link>
            );
          })}

          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/30 tracking-widest font-light whitespace-nowrap">
            scroll or drag
          </p>
        </div>

        {/* ── Right: Content area ── */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-10 py-10 min-w-0">
          <div className="h-px w-full mb-6 transition-colors duration-500" style={{ backgroundColor: centerItem.color + "25" }} />

          {/* ── 上段: タイトル ── */}
          <div className="transition-all duration-300">
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

            <h2
              className="text-2xl lg:text-3xl font-light tracking-tight mb-3 transition-colors duration-300 whitespace-nowrap"
              style={{ color: centerItem.color }}
            >
              {centerItem.title}
            </h2>

            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-4">
              {centerItem.description}
            </p>

            <Link
              href={centerItem.href}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
              style={{ backgroundColor: centerItem.color }}
            >
              <CenterIcon className="h-4 w-4" />
              使ってみる
            </Link>
          </div>

          {/* ── 中段: 使い方 + 関連ツール ── */}
          <div className="mt-6 flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10 transition-all duration-300">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-3">
                使い方
              </p>
              <div className="flex gap-4">
                {centerItem.steps.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                    <span
                      className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold"
                      style={{ backgroundColor: centerItem.color + "15", color: centerItem.color }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-light leading-snug text-center">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {centerItem.related.length > 0 && (
              <div className="shrink-0">
                <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-2">
                  関連ツール
                </p>
                <div className="flex flex-wrap gap-2">
                  {centerItem.related.map((idx) => {
                    const rel = tools[idx];
                    if (!rel) return null;
                    const RelIcon = rel.icon;
                    return (
                      <Link
                        key={rel.href}
                        href={rel.href}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/30 bg-card/30 hover:bg-card/60 hover:border-border hover:shadow-md transition-all duration-200 group"
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-200"
                          style={{ backgroundColor: rel.color + "15" }}
                        >
                          <RelIcon className="h-3 w-3" style={{ color: rel.color }} />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          {rel.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
                        ? "border-current bg-card/50 shadow-md"
                        : "border-border/30 bg-card/20 hover:bg-card/50 hover:border-border hover:shadow-md"
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

          <div className="mt-6 flex items-center gap-6">
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
        </div>
      </div>
    </div>
  );
}
