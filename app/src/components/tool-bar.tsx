"use client";

import Link from "next/link";
import { Star, Clock } from "lucide-react";
import { tools } from "@/lib/tools";

interface ToolBarProps {
  favorites: string[];
  history: { href: string; timestamp: number }[];
  onNavigate?: (href: string) => void;
}

export function ToolBar({ favorites, history, onNavigate }: ToolBarProps) {
  const favTools = tools.filter((t) => favorites.includes(t.href));
  const histTools = history
    .map((h) => tools.find((t) => t.href === h.href))
    .filter(Boolean) as typeof tools;

  if (favTools.length === 0 && histTools.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-4 sm:px-6 lg:px-12 pt-3 pb-1">
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row gap-3">
        {favTools.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium shrink-0 uppercase tracking-widest">
              <Star className="h-3 w-3 fill-amber-500" />
            </span>
            {favTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => onNavigate?.(tool.href)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/30 bg-card/40 hover:bg-card/70 hover:border-border/50 transition-all duration-200 shrink-0"
                >
                  <Icon className="h-3 w-3" style={{ color: tool.color }} />
                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                    {tool.title}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        {histTools.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-medium shrink-0 uppercase tracking-widest">
              <Clock className="h-3 w-3" />
            </span>
            {histTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => onNavigate?.(tool.href)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/20 bg-card/20 hover:bg-card/50 hover:border-border/40 transition-all duration-200 shrink-0"
                >
                  <Icon className="h-3 w-3" style={{ color: tool.color }} />
                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                    {tool.title}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
