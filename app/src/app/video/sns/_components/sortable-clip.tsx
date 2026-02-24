"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Film } from "lucide-react";
import type { TimelineClip } from "../types";
import { CLIP_COLORS } from "../constants";
import { fmt } from "../helpers";

/* ================================================================
   SortableClip — draggable clip block on the timeline
   ================================================================ */

export function SortableClip({
  clip,
  index,
  isSelected,
  pxPerSec,
  onClick,
}: {
  clip: TimelineClip;
  index: number;
  isSelected: boolean;
  totalDuration: number;
  pxPerSec?: number;
  onClick: () => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        relative flex-shrink-0 h-14 rounded-md cursor-pointer select-none overflow-hidden
        border-2 transition-colors
        ${isSelected ? "border-white ring-1 ring-white/30" : "border-transparent hover:border-white/40"}
      `}
      {...attributes}
    >
      {/* Color bar + thumbnail background */}
      <div className={`absolute inset-0 ${color} opacity-80`} />
      {clip.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={clip.thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
        />
      )}
      {/* Content */}
      <div className="relative flex items-center h-full px-2 gap-1.5">
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
