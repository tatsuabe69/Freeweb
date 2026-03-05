"use client";

import { useState } from "react";
import Link from "next/link";
import { tools } from "@/lib/tools";
import { FileText, Camera, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ---------- Category definitions ---------- */
interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  filter: (t: (typeof tools)[number]) => boolean;
}

const CATEGORIES: Category[] = [
  {
    id: "pdf",
    label: "PDF",
    icon: FileText,
    color: "#8b5cf6",
    filter: (t) => t.category === "PDF",
  },
  {
    id: "media",
    label: "写真動画",
    icon: Camera,
    color: "#0ea5e9",
    filter: (t) => t.category === "動画" || t.category === "画像",
  },
  {
    id: "google",
    label: "Google",
    icon: Globe,
    color: "#fbbc04",
    filter: (t) => t.category === "Google",
  },
];

/* ---------- Fan geometry (5 o'clock → 7 o'clock) ---------- */
// Angles in degrees, clockwise from 12 o'clock
const ARC_START = 150; // 5 o'clock
const ARC_END = 210; // 7 o'clock
const FAN_RADIUS = 120; // px distance from center of category circle

function fanPosition(index: number, total: number) {
  // distribute items evenly across the arc
  const angle =
    total === 1
      ? (ARC_START + ARC_END) / 2
      : ARC_START + (index / (total - 1)) * (ARC_END - ARC_START);
  const rad = (angle * Math.PI) / 180;
  // screen coords: x = sin(angle)*r, y = cos(angle)*r  (y positive = down)
  return {
    x: Math.sin(rad) * FAN_RADIUS,
    y: Math.cos(rad) * FAN_RADIUS,
  };
}

/* ---------- CategoryOrb ---------- */
function CategoryOrb({ cat }: { cat: Category }) {
  const [hovered, setHovered] = useState(false);
  const items = tools.filter(cat.filter);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main category circle */}
      <button
        className="relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 border-2 transition-all duration-300 cursor-default select-none"
        style={{
          borderColor: cat.color,
          background: hovered ? cat.color + "18" : "var(--background)",
          boxShadow: hovered
            ? `0 0 24px ${cat.color}40, 0 4px 12px rgba(0,0,0,.1)`
            : "0 2px 8px rgba(0,0,0,.08)",
          transform: hovered ? "scale(1.08)" : "scale(1)",
        }}
      >
        <cat.icon className="h-6 w-6" style={{ color: cat.color }} />
        <span
          className="text-[10px] font-bold tracking-wide"
          style={{ color: cat.color }}
        >
          {cat.label}
        </span>
      </button>

      {/* Fan items */}
      {items.map((tool, i) => {
        const pos = fanPosition(i, items.length);
        const Icon = tool.icon;
        return (
          <Link
            key={tool.href}
            href={tool.href}
            className="absolute z-20 flex flex-col items-center gap-0.5 group"
            style={{
              left: `calc(50% + ${pos.x}px)`,
              top: `calc(50% + ${pos.y}px)`,
              transform: `translate(-50%, -50%) scale(${hovered ? 1 : 0.3})`,
              opacity: hovered ? 1 : 0,
              pointerEvents: hovered ? "auto" : "none",
              transition: `all 300ms cubic-bezier(.34,1.56,.64,1) ${i * 40}ms`,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border transition-transform group-hover:scale-110"
              style={{
                borderColor: tool.color,
                background: tool.color + "15",
                boxShadow: `0 2px 8px ${tool.color}30`,
              }}
            >
              <Icon className="h-4 w-4" style={{ color: tool.color }} />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground whitespace-nowrap transition-colors">
              {tool.title}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- Main Design ---------- */
export default function DesignOrbit() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <div className="flex gap-28 items-start">
        {CATEGORIES.map((cat) => (
          <CategoryOrb key={cat.id} cat={cat} />
        ))}
      </div>
    </div>
  );
}
