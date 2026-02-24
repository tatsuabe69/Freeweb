"use client";

import { useCallback, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { TimelineClip } from "../types";
import { CLIP_COLORS } from "../constants";
import { fmt } from "../helpers";

/* ================================================================
   SortableClip — draggable clip block with trim handles
   ================================================================ */

export function SortableClip({
  clip,
  index,
  isSelected,
  pxPerSec,
  onClick,
  onTrimIn,
  onTrimOut,
}: {
  clip: TimelineClip;
  index: number;
  isSelected: boolean;
  totalDuration: number;
  pxPerSec?: number;
  onClick: () => void;
  onTrimIn?: (clipId: string, delta: number) => void;
  onTrimOut?: (clipId: string, delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clip.id,
  });

  const clipDur = clip.outPoint - clip.inPoint;
  const scale = pxPerSec ?? 8;
  const widthPx = Math.max(clipDur * scale, 48);
  const color = CLIP_COLORS[index % CLIP_COLORS.length];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${widthPx}px`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  // ── Trim handle drag logic ──────────────────────────
  const trimRef = useRef<{
    side: "in" | "out";
    startX: number;
  } | null>(null);

  const handleTrimPointerDown = useCallback(
    (e: React.PointerEvent, side: "in" | "out") => {
      e.stopPropagation();
      e.preventDefault();
      trimRef.current = { side, startX: e.clientX };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handleTrimPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!trimRef.current) return;
      const dx = e.clientX - trimRef.current.startX;
      const dtSec = dx / scale;
      if (Math.abs(dtSec) < 0.05) return;

      if (trimRef.current.side === "in" && onTrimIn) {
        onTrimIn(clip.id, dtSec);
      } else if (trimRef.current.side === "out" && onTrimOut) {
        onTrimOut(clip.id, dtSec);
      }
      trimRef.current.startX = e.clientX;
    },
    [clip.id, scale, onTrimIn, onTrimOut],
  );

  const handleTrimPointerUp = useCallback(() => {
    trimRef.current = null;
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        group/clip relative flex-shrink-0 h-14 rounded-md cursor-pointer select-none overflow-visible
        border-2 transition-colors
        ${isSelected ? "border-white ring-1 ring-white/30" : "border-transparent hover:border-white/40"}
      `}
      {...attributes}
    >
      {/* Color bar + thumbnail background */}
      <div className={`absolute inset-0 rounded-[4px] ${color} opacity-80`} />
      {clip.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clip.thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity rounded-[4px]"
        />
      )}

      {/* ── Left trim handle (In point) ── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-20 group/handle flex items-center"
        onPointerDown={(e) => handleTrimPointerDown(e, "in")}
        onPointerMove={handleTrimPointerMove}
        onPointerUp={handleTrimPointerUp}
        title={`In: ${fmt(clip.inPoint)}`}
      >
        <div className="w-1 h-8 bg-white/40 rounded-full group-hover/handle:bg-white/80 group-hover/handle:h-10 transition-all mx-auto" />
      </div>

      {/* ── Right trim handle (Out point) ── */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-20 group/handle flex items-center"
        onPointerDown={(e) => handleTrimPointerDown(e, "out")}
        onPointerMove={handleTrimPointerMove}
        onPointerUp={handleTrimPointerUp}
        title={`Out: ${fmt(clip.outPoint)}`}
      >
        <div className="w-1 h-8 bg-white/40 rounded-full group-hover/handle:bg-white/80 group-hover/handle:h-10 transition-all mx-auto" />
      </div>

      {/* Content */}
      <div className="relative flex items-center h-full px-3 gap-1.5">
        <div {...listeners} className="cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="h-3.5 w-3.5 text-white/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-white truncate leading-tight">{clip.name}</p>
          <p className="text-[9px] text-white/70 leading-tight">{fmt(clipDur)}</p>
        </div>
      </div>
    </div>
  );
}
