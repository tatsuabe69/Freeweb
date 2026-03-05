"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Shield, Zap, Globe, Star, Clock } from "lucide-react";
import { tools } from "@/lib/tools";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";

const STORAGE_KEY = "freeweb-tool-index";

export default function DesignCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(0); // -1 left, 1 right, 0 initial
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setActiveIdx(Number(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(activeIdx));
  }, [activeIdx]);

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setActiveIdx(idx);
  }, []);

  const prev = () => {
    const next = activeIdx <= 0 ? tools.length - 1 : activeIdx - 1;
    goTo(next, -1);
  };

  const next = () => {
    const nextIdx = activeIdx >= tools.length - 1 ? 0 : activeIdx + 1;
    goTo(nextIdx, 1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Mouse wheel horizontal scroll
  useEffect(() => {
    let lastWheel = 0;
    const handler = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 30) return;
      const now = Date.now();
      if (now - lastWheel < 300) return;
      lastWheel = now;
      e.preventDefault();
      if (delta > 0) next();
      else prev();
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  });

  const { favorites, toggle: toggleFav, isFavorite } = useFavorites();
  const { history, record } = useHistory();

  const favTools = tools.filter((t) => favorites.includes(t.href));
  const histTools = history
    .map((h) => tools.find((t) => t.href === h.href))
    .filter(Boolean) as typeof tools;

  const item = tools[activeIdx];
  const Icon = item.icon;

  // Get visible cards (5 around active)
  const getOffset = (idx: number) => {
    let diff = idx - activeIdx;
    if (diff > tools.length / 2) diff -= tools.length;
    if (diff < -tools.length / 2) diff += tools.length;
    return diff;
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col relative">
      {/* ── Background ── */}
      <div className="design-bg dbg-tile" aria-hidden="true">
        <div className="design-orb" />
        <div className="design-orb design-orb-2" />
      </div>

      {/* Carousel area */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-2 sm:px-4">
        {/* Navigation arrows */}
        <button
          onClick={prev}
          className="absolute left-1 sm:left-4 md:left-12 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border/30 bg-card/60 backdrop-blur-xl shadow-lg flex items-center justify-center hover:bg-muted/50 transition-all"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </button>
        <button
          onClick={next}
          className="absolute right-1 sm:right-4 md:right-12 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border/30 bg-card/60 backdrop-blur-xl shadow-lg flex items-center justify-center hover:bg-muted/50 transition-all"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </button>

        {/* 3D Card stack */}
        <div className="relative w-full max-w-4xl h-[320px] sm:h-[320px]" style={{ perspective: "1200px" }}>
          {tools.map((tool, idx) => {
            const offset = getOffset(idx);
            if (Math.abs(offset) > 3) return null;

            const isActive = offset === 0;
            const ToolIcon = tool.icon;

            const cardWidth = isMobile ? 260 : 260;
            const cardHeight = isMobile ? 300 : 300;
            const spacing = isMobile ? 180 : 220;

            const translateX = offset * spacing;
            const translateZ = isActive ? 0 : -120 - Math.abs(offset) * 60;
            const rotateY = offset * -8;
            const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(offset) * 0.3);
            const scale = isActive ? 1 : 0.85 - Math.abs(offset) * 0.05;

            return (
              <div
                key={tool.href}
                className="absolute left-1/2 top-1/2 transition-all duration-500 ease-out cursor-pointer"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  marginLeft: -cardWidth / 2,
                  marginTop: -cardHeight / 2,
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex: isActive ? 20 : 10 - Math.abs(offset),
                  pointerEvents: isActive ? "auto" : Math.abs(offset) <= 1 ? "auto" : "none",
                }}
                onClick={() => {
                  if (!isActive) goTo(idx, offset > 0 ? 1 : -1);
                }}
              >
                <div
                  className={`w-full h-full rounded-2xl border backdrop-blur-xl backdrop-saturate-150 p-4 sm:p-6 flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all duration-500 ${
                    isActive
                      ? "border-border/60 bg-card shadow-2xl"
                      : "border-border/20 bg-card/25"
                  }`}
                  style={isActive ? { boxShadow: `0 20px 60px ${tool.color}25, 0 0 40px ${tool.color}12, inset 0 1px 0 rgba(255,255,255,0.1)` } : { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-500"
                    style={{
                      backgroundColor: isActive ? tool.color : tool.color + "20",
                      boxShadow: isActive ? `0 8px 30px ${tool.color}40` : "none",
                    }}
                  >
                    <ToolIcon
                      className="h-7 w-7 transition-colors duration-300"
                      style={{ color: isActive ? "#fff" : tool.color }}
                    />
                  </div>

                  {/* Category */}
                  <span
                    className="text-[10px] font-medium uppercase tracking-widest transition-colors duration-300"
                    style={{ color: tool.color + (isActive ? "" : "80") }}
                  >
                    {tool.category}
                  </span>

                  {/* Title */}
                  <h3 className={`text-base sm:text-lg font-medium tracking-tight text-center transition-all duration-300 ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {tool.title}
                  </h3>

                  {/* Description (only on active) */}
                  <p className={`text-xs text-muted-foreground text-center leading-relaxed transition-all duration-300 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}>
                    {tool.description}
                  </p>

                  {/* CTA (only on active) */}
                  {isActive && (
                    <div className="flex items-center gap-2">
                      <Link
                        href={tool.href}
                        onClick={() => record(tool.href)}
                        className="mt-1 inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                        style={{ backgroundColor: tool.color }}
                      >
                        使ってみる
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFav(tool.href); }}
                        className="mt-1 p-1.5 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <Star className={`h-4 w-4 transition-colors ${isFavorite(tool.href) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/40 hover:text-amber-500/60"}`} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Steps */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 justify-center">
          {item.steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: item.color + "20", color: item.color }}
              >
                {idx + 1}
              </span>
              <span className="text-xs text-muted-foreground font-light">{step}</span>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="mt-6 flex gap-1.5">
          {tools.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx, idx > activeIdx ? 1 : -1)}
              className="transition-all duration-300"
              style={{
                width: idx === activeIdx ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: idx === activeIdx ? item.color : "var(--color-border)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Favorites & History */}
      {(favTools.length > 0 || histTools.length > 0) && (
        <div className="flex flex-col sm:flex-row justify-center gap-2 px-4 pb-2">
          {favTools.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide justify-center">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
              {favTools.map((tool) => {
                const FIcon = tool.icon;
                return (
                  <Link key={tool.href} href={tool.href} onClick={() => record(tool.href)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-200 shrink-0">
                    <FIcon className="h-3 w-3" style={{ color: tool.color }} />
                    <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{tool.title}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {histTools.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide justify-center">
              <Clock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              {histTools.map((tool) => {
                const HIcon = tool.icon;
                return (
                  <Link key={tool.href} href={tool.href} onClick={() => record(tool.href)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/20 bg-card/20 hover:bg-card/50 transition-all duration-200 shrink-0">
                    <HIcon className="h-3 w-3" style={{ color: tool.color }} />
                    <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{tool.title}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer features */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-8 pb-6 pt-4">
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
  );
}
