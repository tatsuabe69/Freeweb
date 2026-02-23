"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface FirstPageResult {
  thumbnails: Map<string, string>;
  loading: boolean;
}

export function usePdfFirstPages(
  files: File[],
  maxWidth = 100
): FirstPageResult {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const pdfjsRef = useRef<typeof import("pdfjs-dist") | null>(null);

  const loadPdfjs = useCallback(async () => {
    if (pdfjsRef.current) return pdfjsRef.current;
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfjsRef.current = pdfjs;
    return pdfjs;
  }, []);

  useEffect(() => {
    if (files.length === 0) {
      setThumbnails(new Map());
      return;
    }

    let cancelled = false;

    const generate = async () => {
      setLoading(true);
      try {
        const pdfjs = await loadPdfjs();

        for (const file of files) {
          if (cancelled) return;
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1 });
            const scale = maxWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            const ctx = canvas.getContext("2d")!;

            await page.render({
              canvasContext: ctx,
              viewport: scaledViewport,
              canvas,
            } as Parameters<typeof page.render>[0]).promise;

            if (!cancelled) {
              const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
              setThumbnails((prev) => {
                const next = new Map(prev);
                next.set(key, dataUrl);
                return next;
              });
            }
          } catch {
            // Skip files that can't be rendered
          }
        }
      } catch (error) {
        console.error("Failed to generate first page thumbnails:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [files, maxWidth, loadPdfjs]);

  return { thumbnails, loading };
}
