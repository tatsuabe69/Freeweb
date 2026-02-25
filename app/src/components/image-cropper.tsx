"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Crop, RotateCcw, Check, X } from "lucide-react";

interface CropArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageCropperProps {
  /** Image source – data URL or object URL */
  src: string;
  /** Called with the cropped data URL (same format as input) */
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
  /** Output mime type, defaults to image/png */
  mimeType?: string;
  quality?: number;
}

export function ImageCropper({ src, onCrop, onCancel, mimeType = "image/png", quality }: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0, offsetX: 0, offsetY: 0 });
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });

  // Load image to get natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = src;
  }, [src]);

  // Calculate display size to fit container
  useEffect(() => {
    if (!containerRef.current || imgSize.w === 0) return;
    const container = containerRef.current;
    const maxW = container.clientWidth;
    const maxH = 400;
    const scale = Math.min(maxW / imgSize.w, maxH / imgSize.h, 1);
    const w = imgSize.w * scale;
    const h = imgSize.h * scale;
    setDisplaySize({ w, h, offsetX: (maxW - w) / 2, offsetY: 0 });
  }, [imgSize]);

  const toImageCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left - displaySize.offsetX, displaySize.w));
      const y = Math.max(0, Math.min(clientY - rect.top - displaySize.offsetY, displaySize.h));
      return { x, y };
    },
    [displaySize]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    const pos = toImageCoords(e.clientX, e.clientY);
    startRef.current = pos;
    setCrop({ x: pos.x, y: pos.y, w: 0, h: 0 });
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const pos = toImageCoords(e.clientX, e.clientY);
    const x = Math.min(startRef.current.x, pos.x);
    const y = Math.min(startRef.current.y, pos.y);
    const w = Math.abs(pos.x - startRef.current.x);
    const h = Math.abs(pos.y - startRef.current.y);
    setCrop({ x, y, w, h });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const applyCrop = () => {
    if (!crop || !imgRef.current || crop.w < 5 || crop.h < 5) return;

    const scaleX = imgSize.w / displaySize.w;
    const scaleY = imgSize.h / displaySize.h;

    const sx = crop.x * scaleX;
    const sy = crop.y * scaleY;
    const sw = crop.w * scaleX;
    const sh = crop.h * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    onCrop(canvas.toDataURL(mimeType, quality));
  };

  const resetCrop = () => setCrop(null);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative rounded-lg border bg-muted/30 overflow-hidden cursor-crosshair select-none"
        style={{ minHeight: 200 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {displaySize.w > 0 && (
          <div style={{ position: "relative", width: displaySize.w, height: displaySize.h, marginLeft: displaySize.offsetX }}>
            <img
              src={src}
              alt="crop target"
              draggable={false}
              style={{ width: displaySize.w, height: displaySize.h, display: "block" }}
            />
            {/* Dark overlay outside crop */}
            {crop && crop.w > 2 && crop.h > 2 && (
              <>
                <div
                  className="absolute inset-0 bg-black/50 pointer-events-none"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 100% 0%, 100% 100%, 0% 100%,
                      0% 0%,
                      ${crop.x}px ${crop.y}px,
                      ${crop.x}px ${crop.y + crop.h}px,
                      ${crop.x + crop.w}px ${crop.y + crop.h}px,
                      ${crop.x + crop.w}px ${crop.y}px,
                      ${crop.x}px ${crop.y}px
                    )`,
                  }}
                />
                <div
                  className="absolute border-2 border-white/80 border-dashed pointer-events-none"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.w,
                    height: crop.h,
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {crop && crop.w > 5 && crop.h > 5
            ? `選択範囲: ${Math.round((crop.w / displaySize.w) * imgSize.w)} × ${Math.round((crop.h / displaySize.h) * imgSize.h)} px`
            : "ドラッグでトリミング範囲を選択"}
        </p>
        <div className="flex gap-2">
          {crop && crop.w > 5 && (
            <Button variant="ghost" size="sm" onClick={resetCrop} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> リセット
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1">
            <X className="h-3.5 w-3.5" /> キャンセル
          </Button>
          <Button
            size="sm"
            onClick={applyCrop}
            disabled={!crop || crop.w < 5 || crop.h < 5}
            className="gap-1"
          >
            <Check className="h-3.5 w-3.5" /> 適用
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Thumbnail with a crop button */
export function CroppableImage({
  src,
  index,
  onCropped,
  mimeType,
  quality,
}: {
  src: string;
  index: number;
  onCropped: (index: number, croppedDataUrl: string) => void;
  mimeType?: string;
  quality?: number;
}) {
  const [cropping, setCropping] = useState(false);

  if (cropping) {
    return (
      <ImageCropper
        src={src}
        mimeType={mimeType}
        quality={quality}
        onCrop={(url) => {
          onCropped(index, url);
          setCropping(false);
        }}
        onCancel={() => setCropping(false)}
      />
    );
  }

  return (
    <div className="relative group rounded-lg border overflow-hidden bg-muted/30">
      <img src={src} alt={`image ${index + 1}`} className="w-full max-h-48 object-contain" />
      <button
        onClick={() => setCropping(true)}
        className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-background/90 border text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
      >
        <Crop className="h-3 w-3" /> トリミング
      </button>
    </div>
  );
}
