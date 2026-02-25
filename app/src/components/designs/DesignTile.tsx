"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Zap, Globe } from "lucide-react";
import { tools } from "@/lib/tools";

const categories = [...new Set(tools.map((t) => t.category))];

export default function DesignTile() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const filtered = activeCat ? tools.filter((t) => t.category === activeCat) : tools;

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col relative">
      {/* ── Background ── */}
      <div className="design-bg dbg-tile" aria-hidden="true">
        <div className="design-orb" />
        <div className="design-orb design-orb-2" />
      </div>

      {/* ── Header ── */}
      <div className="px-6 lg:px-12 pt-10 pb-2">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl lg:text-4xl font-light tracking-tight mb-1 text-foreground">
            ツール一覧
          </h1>
          <p className="text-sm text-muted-foreground font-light mb-6">
            すべてブラウザ内で完結。データはどこにも送信されません。
          </p>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCat(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                !activeCat
                  ? "bg-foreground/90 text-background shadow-md"
                  : "bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card/70"
              }`}
            >
              すべて
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeCat === cat
                    ? "bg-foreground/90 text-background shadow-md"
                    : "bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card/70"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tile Grid ── */}
      <div className="flex-1 px-6 lg:px-12 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group rounded-xl border border-border/30 bg-card/40 hover:bg-card/70 hover:border-border/60 hover:shadow-lg p-5 flex flex-col items-center gap-3 text-center transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{
                      backgroundColor: tool.color + "15",
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: tool.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-0.5">
                      {tool.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-light leading-snug">
                      {tool.description}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: tool.color + "12", color: tool.color }}
                  >
                    {tool.category}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
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
