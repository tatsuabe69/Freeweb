"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Zap, Globe, Star, Clock } from "lucide-react";
import { tools } from "@/lib/tools";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";

const categories = [...new Set(tools.map((t) => t.category))];

export default function DesignKaruta() {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const { favorites, toggle: toggleFav, isFavorite } = useFavorites();
  const { history, record } = useHistory();

  const favTools = tools.filter((t) => favorites.includes(t.href));
  const histTools = history
    .map((h) => tools.find((t) => t.href === h.href))
    .filter(Boolean) as typeof tools;

  const filtered = activeCat ? tools.filter((t) => t.category === activeCat) : tools;

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col relative">
      {/* ── Background ── */}
      <div className="design-bg dbg-tile" aria-hidden="true">
        <div className="design-orb" />
        <div className="design-orb design-orb-2" />
      </div>

      {/* ── Header ── */}
      <div className="px-4 sm:px-6 lg:px-12 pt-6 sm:pt-10 pb-2">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight mb-1 text-foreground">
            ツール一覧
          </h1>
          <p className="text-sm text-muted-foreground font-light mb-6">
            カードにカーソルを合わせると詳細が表示されます。
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

          {/* Favorites & History */}
          {(favTools.length > 0 || histTools.length > 0) && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {favTools.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
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
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
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
        </div>
      </div>

      {/* ── Karuta Grid ── */}
      <div className="flex-1 px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((tool) => {
              const Icon = tool.icon;
              const fav = isFavorite(tool.href);
              return (
                <div
                  key={tool.href}
                  className="group relative"
                  style={{ perspective: "600px" }}
                >
                  {/* Fav button */}
                  <button
                    onClick={() => toggleFav(tool.href)}
                    className="absolute top-2 right-2 z-20 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-muted/50"
                    title={fav ? "お気に入り解除" : "お気に入り登録"}
                  >
                    <Star className={`h-3.5 w-3.5 transition-colors ${fav ? "text-amber-500 fill-amber-500" : "text-muted-foreground/40"}`} />
                  </button>

                  {/* Card container - flips on hover */}
                  <div
                    className="relative w-full transition-transform duration-500 ease-out group-hover:[transform:rotateY(180deg)]"
                    style={{
                      transformStyle: "preserve-3d",
                      aspectRatio: "1 / 1.15",
                    }}
                  >
                    {/* ── Front face ── */}
                    <div
                      className="absolute inset-0 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: tool.color + "15" }}
                      >
                        <Icon className="h-7 w-7" style={{ color: tool.color }} />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground text-center leading-tight">
                        {tool.title}
                      </h3>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: tool.color + "12", color: tool.color }}
                      >
                        {tool.category}
                      </span>
                    </div>

                    {/* ── Back face ── */}
                    <div
                      className="absolute inset-0 rounded-xl border border-border/40 bg-card/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-4 text-center [transform:rotateY(180deg)]"
                      style={{
                        backfaceVisibility: "hidden",
                        borderColor: tool.color + "30",
                      }}
                    >
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {tool.description}
                      </p>

                      <div className="flex flex-col gap-1.5 w-full">
                        {tool.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                              style={{ backgroundColor: tool.color + "20", color: tool.color }}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-[10px] text-muted-foreground text-left">{step}</span>
                          </div>
                        ))}
                      </div>

                      <Link
                        href={tool.href}
                        onClick={() => record(tool.href)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 mt-1"
                        style={{ backgroundColor: tool.color }}
                      >
                        使ってみる
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-8 pb-6 pt-2">
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
