"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ThumbnailResult {
  thumbnails: string[];
  pageCount: number;
  loading: boolean;
}

export function usePdfThumbnails(
  file: File | null,
  maxWidth = 150
): ThumbnailResult {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pdfjsRef = useRef<typeof import("pdfjs-dist") | null>(null);

  const loadPdfjs = useCallback(async () => {
    if (pdfjsRef.current) return pdfjsRef.current;
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    pdfjsRef.current = pdfjs;
    return pdfjs;
  }, []);

  useEffect(() => {
    if (!file) {
      setThumbnails([]);
      setPageCount(0);
      return;
    }

    let cancelled = false;

    const generateThumbnails = async () => {
      setLoading(true);
      try {
        const pdfjs = await loadPdfjs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const count = pdf.numPages;
        setPageCount(count);

        const results: string[] = [];
        for (let i = 1; i <= count; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
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

          results.push(canvas.toDataURL("image/jpeg", 0.7));
        }

        if (!cancelled) {
          setThumbnails(results);
        }
      } catch (error) {
        console.error("Failed to generate thumbnails:", error);
        if (!cancelled) {
          setThumbnails([]);
          setPageCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    generateThumbnails();

    return () => {
      cancelled = true;
    };
  }, [file, maxWidth, loadPdfjs]);

  return { thumbnails, pageCount, loading };
}
