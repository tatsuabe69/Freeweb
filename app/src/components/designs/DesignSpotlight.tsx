"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, Shield, Zap, Globe } from "lucide-react";
import { tools } from "@/lib/tools";

const STORAGE_KEY = "freeweb-tool-index";

export default function DesignSpotlight() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setActiveIdx(Number(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(activeIdx));
  }, [activeIdx]);

  const goTo = useCallback(
    (idx: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIdx(idx);
        setTimeout(() => setIsTransitioning(false), 400);
      }, 200);
    },
    [isTransitioning],
  );

  const prev = () => goTo(activeIdx <= 0 ? tools.length - 1 : activeIdx - 1);
  const next = () => goTo(activeIdx >= tools.length - 1 ? 0 : activeIdx + 1);

  // Keyboard + wheel navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") prev();
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next();
    };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) > 30) {
        if (e.deltaY > 0) next();
        else prev();
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("wheel", handleWheel);
    };
  });

  const item = tools[activeIdx];
  const Icon = item.icon;

  // Adjacent items for the side list
  const getAdjacentIndices = () => {
    const indices: number[] = [];
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      let idx = activeIdx + i;
      if (idx < 0) idx += tools.length;
      if (idx >= tools.length) idx -= tools.length;
      indices.push(idx);
    }
    return indices;
  };

  const adjacent = getAdjacentIndices();

  return (
    <div
      className="min-h-[calc(100vh-60px)] flex flex-col relative overflow-hidden transition-colors duration-700"
    >
      {/* Ambient background */}
      <div
        className="absolute inset-0 transition-all duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${item.color}12 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000 pointer-events-none"
        style={{ backgroundColor: item.color + "08" }}
      />

      {/* Main content */}
      <div className="flex-1 flex relative z-10">
        {/* Left: side tool list */}
        <div className="hidden lg:flex flex-col items-end justify-center gap-1 w-48 pr-6 shrink-0">
          {adjacent.slice(0, 3).map((idx) => {
            const t = tools[idx];
            const TIcon = t.icon;
            return (
              <button
                key={t.href}
                onClick={() => goTo(idx)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/30 transition-all group text-right w-full justify-end"
              >
                <span className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground transition-colors truncate">
                  {t.title}
                </span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                  style={{ backgroundColor: t.color + "15" }}
                >
                  <TIcon className="h-3.5 w-3.5" style={{ color: t.color }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Center: spotlight content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Up arrow */}
          <button
            onClick={prev}
            className="mb-6 w-8 h-8 rounded-full border border-border/30 flex items-center justify-center hover:bg-muted/30 transition-all"
          >
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Tool showcase */}
          <div
            className={`flex flex-col items-center text-center transition-all duration-500 ${
              isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
            }`}
          >
            {/* Giant icon */}
            <div
              className="w-24 h-24 md:w-28 md:h-28 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500"
              style={{
                backgroundColor: item.color,
                boxShadow: `0 20px 60px ${item.color}40, 0 0 120px ${item.color}15`,
              }}
            >
              <Icon className="h-10 w-10 md:h-12 md:w-12 text-white" />
            </div>

            {/* Category badge */}
            <span
              className="inline-block px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-[0.2em] mb-3 transition-colors duration-500"
              style={{ backgroundColor: item.color + "12", color: item.color }}
            >
              {item.category}
            </span>

            {/* Tool name */}
            <h2
              className="text-4xl md:text-5xl font-light tracking-tight mb-3 transition-colors duration-500"
              style={{ color: item.color }}
            >
              {item.title}
            </h2>

            {/* Description */}
            <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-lg mb-6">
              {item.description}
            </p>

            {/* Steps — horizontal */}
            <div className="flex items-center gap-6 mb-8">
              {item.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: item.color + "15", color: item.color }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-xs text-muted-foreground font-light whitespace-nowrap">
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link
              href={item.href}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-medium text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                backgroundColor: item.color,
                boxShadow: `0 8px 30px ${item.color}30`,
              }}
            >
              <Icon className="h-4 w-4" />
              使ってみる
            </Link>

            {/* Counter */}
            <span className="mt-4 text-[10px] text-muted-foreground/40 font-mono tracking-widest">
              {String(activeIdx + 1).padStart(2, "0")} / {String(tools.length).padStart(2, "0")}
            </span>
          </div>

          {/* Down arrow */}
          <button
            onClick={next}
            className="mt-6 w-8 h-8 rounded-full border border-border/30 flex items-center justify-center hover:bg-muted/30 transition-all"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Right: side tool list */}
        <div className="hidden lg:flex flex-col items-start justify-center gap-1 w-48 pl-6 shrink-0">
          {adjacent.slice(3).map((idx) => {
            const t = tools[idx];
            const TIcon = t.icon;
            return (
              <button
                key={t.href}
                onClick={() => goTo(idx)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/30 transition-all group w-full"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                  style={{ backgroundColor: t.color + "15" }}
                >
                  <TIcon className="h-3.5 w-3.5" style={{ color: t.color }} />
                </div>
                <span className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground transition-colors truncate">
                  {t.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: progress dots + features */}
      <div className="relative z-10 pb-6 pt-2 flex flex-col items-center gap-4">
        <div className="flex gap-1">
          {tools.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: idx === activeIdx ? 20 : 4,
                height: 4,
                backgroundColor: idx === activeIdx ? item.color : "var(--color-border)",
              }}
            />
          ))}
        </div>
        <div className="flex gap-8">
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
  );
}
