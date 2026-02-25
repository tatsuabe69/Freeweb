"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Zap, Globe, ArrowRight } from "lucide-react";
import { tools } from "@/lib/tools";

const STORAGE_KEY = "freeweb-tool-index";
const categories = [...new Set(tools.map((t) => t.category))];

export default function DesignBento() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeCat, setActiveCat] = useState(categories[0]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const idx = Number(saved);
      setActiveIdx(idx);
      setActiveCat(tools[idx]?.category ?? categories[0]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(activeIdx));
  }, [activeIdx]);

  const item = tools[activeIdx];
  const Icon = item.icon;
  const catTools = tools.filter((t) => t.category === activeCat);

  const handleSelect = (idx: number) => {
    setActiveIdx(idx);
  };

  const handleCatChange = (cat: string) => {
    setActiveCat(cat);
    const first = tools.findIndex((t) => t.category === cat);
    if (first >= 0) setActiveIdx(first);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col relative">
      {/* ── Holographic Background ── */}
      <div className="design-bg design-bg-holo" aria-hidden="true">
        <div className="holo-geo" />
        <div className="holo-band holo-band-1" />
        <div className="holo-band holo-band-2" />
        <div className="holo-band holo-band-3" />
        <div className="holo-orb holo-orb-1" />
        <div className="holo-orb holo-orb-2" />
      </div>

      {/* Header */}
      <div className="px-6 lg:px-12 pt-8 pb-2">
        <div className="flex items-baseline justify-end max-w-6xl mx-auto">
          {/* Category tabs */}
          <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCatChange(cat)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeCat === cat
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="flex-1 px-6 lg:px-12 py-6">
        <div className="max-w-6xl mx-auto grid grid-cols-4 grid-rows-3 gap-3 h-full" style={{ minHeight: "calc(100vh - 240px)" }}>
          {/* Featured card (spans 2 cols, 3 rows) */}
          <div
            className="col-span-2 row-span-3 rounded-2xl border p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-500 group"
            style={{
              background: `linear-gradient(135deg, ${item.color}12, ${item.color}06, transparent)`,
              borderColor: item.color + "30",
              boxShadow: `0 8px 32px ${item.color}10, 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.1)`,
            }}
          >
            {/* Background glow */}
            <div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 transition-all duration-700"
              style={{ backgroundColor: item.color }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 8px 30px ${item.color}40`,
                  }}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span
                    className="text-[10px] font-medium uppercase tracking-widest"
                    style={{ color: item.color }}
                  >
                    {item.category}
                  </span>
                  <h2 className="text-3xl font-light tracking-tight" style={{ color: item.color }}>
                    {item.title}
                  </h2>
                </div>
              </div>

              <p className="text-base text-muted-foreground font-light leading-relaxed mb-8 max-w-md">
                {item.description}
              </p>

              {/* Steps */}
              <div className="space-y-3 mb-8">
                {item.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: item.color + "15", color: item.color }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10">
              <Link
                href={item.href}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ backgroundColor: item.color }}
              >
                <Icon className="h-4 w-4" />
                使ってみる
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Tool grid cards (2 cols x 3 rows) */}
          {catTools.map((tool, i) => {
            const ToolIcon = tool.icon;
            const globalIdx = tools.indexOf(tool);
            const isActive = globalIdx === activeIdx;

            return (
              <button
                key={tool.href}
                onClick={() => handleSelect(globalIdx)}
                className={`rounded-xl border p-4 flex flex-col justify-between text-left transition-all duration-300 group relative overflow-hidden ${
                  isActive
                    ? "border-border/60 bg-card shadow-lg"
                    : "border-border/20 bg-card/30 hover:bg-card/60 hover:border-border/40 hover:shadow-md"
                }`}
                style={isActive ? { borderColor: tool.color + "40" } : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-300"
                    style={{ backgroundColor: tool.color }}
                  />
                )}

                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0"
                    style={{
                      backgroundColor: isActive ? tool.color : tool.color + "15",
                      boxShadow: isActive ? `0 4px 12px ${tool.color}30` : "none",
                    }}
                  >
                    <ToolIcon
                      className="h-4 w-4 transition-colors duration-200"
                      style={{ color: isActive ? "#fff" : tool.color }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-sm font-medium truncate transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                      {tool.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {tool.description.slice(0, 30)}...
                    </p>
                  </div>
                </div>

                {/* Quick action on hover */}
                <div className={`mt-2 transition-all duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <Link
                    href={tool.href}
                    className="text-[10px] font-medium inline-flex items-center gap-1 transition-colors"
                    style={{ color: tool.color }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    開く <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer features */}
      <div className="flex justify-center gap-8 pb-6 pt-2">
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
