"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  ArrowLeft,
  Loader2,
  Undo2,
  Trash2,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// Normalized coordinates (0–1 ratio relative to canvas display)
interface RedactRect {
  pageIndex: number;
  nx: number;
  ny: number;
  nw: number;
  nh: number;
}

export default function PdfRedactPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [rects, setRects] = useState<RedactRect[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [drawCurrent, setDrawCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pageRendering, setPageRendering] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfjsRef = useRef<typeof import("pdfjs-dist") | null>(null);
  const pdfDocRef = useRef<Awaited<
    ReturnType<typeof import("pdfjs-dist")["getDocument"]>["promise"]
  > | null>(null);

  const loadPdfjs = useCallback(async () => {
    if (pdfjsRef.current) return pdfjsRef.current;
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfjsRef.current = pdfjs;
    return pdfjs;
  }, []);

  const renderPage = useCallback(
    async (pageIndex: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;
      setPageRendering(true);
      try {
        const page = await pdfDocRef.current.getPage(pageIndex + 1);
        const container = containerRef.current;
        const maxWidth = container ? container.clientWidth : 800;
        const viewport = page.getViewport({ scale: 1 });
        const scale = maxWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
          canvas,
        } as Parameters<typeof page.render>[0]).promise;

        // Setup overlay canvas
        const overlay = overlayRef.current;
        if (overlay) {
          overlay.width = canvas.width;
          overlay.height = canvas.height;
        }

        drawOverlay();
      } finally {
        setPageRendering(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rects, currentPage]
  );

  // Draw existing rects on overlay
  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    if (!overlay || !canvas) return;
    const ctx = overlay.getContext("2d")!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const pageRects = rects.filter((r) => r.pageIndex === currentPage);

    for (const rect of pageRects) {
      const px = rect.nx * overlay.width;
      const py = rect.ny * overlay.height;
      const pw = rect.nw * overlay.width;
      const ph = rect.nh * overlay.height;
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, pw, ph);
    }

    // Draw current drawing rect
    if (drawStart && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [rects, currentPage, drawStart, drawCurrent]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    setLoaded(false);
    setRects([]);
    setCurrentPage(0);
    if (newFiles.length === 1) {
      try {
        const pdfjs = await loadPdfjs();
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);
        setLoaded(true);
      } catch {
        setPageCount(0);
        pdfDocRef.current = null;
      }
    } else {
      setPageCount(0);
      pdfDocRef.current = null;
    }
  };

  useEffect(() => {
    if (loaded && pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [loaded, currentPage, renderPage]);

  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const baseCanvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!baseCanvas || !overlay) return null;
    const rect = baseCanvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    // Clamp to canvas bounds
    const rx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const ry = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return {
      x: rx * overlay.width,
      y: ry * overlay.height,
    };
  };

  const handlePointerDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setDrawing(true);
    setDrawStart(coords);
    setDrawCurrent(coords);
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!drawing) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setDrawCurrent(coords);
  };

  const handlePointerUp = () => {
    if (!drawing || !drawStart || !drawCurrent) {
      setDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    const overlay = overlayRef.current;
    if (!overlay) {
      setDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);

    // Ignore tiny rects (accidental clicks)
    if (w > 3 && h > 3) {
      setRects((prev) => [
        ...prev,
        {
          pageIndex: currentPage,
          nx: x / overlay.width,
          ny: y / overlay.height,
          nw: w / overlay.width,
          nh: h / overlay.height,
        },
      ]);
    }

    setDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const undoLast = useCallback(() => {
    setRects((prev) => {
      const pageRects = prev.filter((r) => r.pageIndex === currentPage);
      if (pageRects.length === 0) return prev;
      const lastRect = pageRects[pageRects.length - 1];
      return prev.filter((r) => r !== lastRect);
    });
  }, [currentPage]);

  const clearPage = useCallback(() => {
    setRects((prev) => prev.filter((r) => r.pageIndex !== currentPage));
  }, [currentPage]);

  const handleApply = async () => {
    if (files.length !== 1 || rects.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();

      // Group rects by page
      const rectsByPage = new Map<number, RedactRect[]>();
      for (const rect of rects) {
        const list = rectsByPage.get(rect.pageIndex) || [];
        list.push(rect);
        rectsByPage.set(rect.pageIndex, list);
      }

      let done = 0;
      const total = rectsByPage.size;

      for (const [pageIndex, pageRects] of rectsByPage) {
        const page = pages[pageIndex];
        if (!page) continue;
        const { width: pw, height: ph } = page.getSize();

        for (const rect of pageRects) {
          const rx = rect.nx * pw;
          const ry = rect.ny * ph;
          const rw = rect.nw * pw;
          const rh = rect.nh * ph;
          // PDF coordinates: origin at bottom-left, preview: origin at top-left
          page.drawRectangle({
            x: rx,
            y: ph - ry - rh,
            width: rw,
            height: rh,
            color: rgb(0, 0, 0),
          });
        }

        done++;
        setProgress(Math.round((done / total) * 100));
      }

      const pdfBytes = await pdf.save();
      setResult(pdfBytes);
    } catch (error) {
      console.error("Redact failed:", error);
      alert("黒塗り処理に失敗しました。ファイルを確認してもう一度お試しください。");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.buffer as ArrayBuffer], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redacted.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setPageCount(0);
    setCurrentPage(0);
    setLoaded(false);
    setRects([]);
    setProgress(0);
    pdfDocRef.current = null;
  };

  const currentPageRects = rects.filter((r) => r.pageIndex === currentPage);
  const totalRects = rects.length;

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <EyeOff className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">
          PDF 黒塗り（墨消し）
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        プレビュー上でドラッグして黒塗り範囲を指定。個人情報や機密情報を隠せます。すべての処理はブラウザ内で完結します。
      </p>

      {!result ? (
        <div className="space-y-6">
          {!loaded && (
            <FileDropzone
              accept=".pdf,application/pdf"
              files={files}
              onFilesChange={handleFilesChange}
              label="PDFファイルをここにドロップ"
              description="またはクリックして選択"
            />
          )}

          {loaded && pageCount > 0 && (
            <div className="space-y-4">
              {/* Page navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[80px] text-center">
                    {currentPage + 1} / {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === pageCount - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {currentPageRects.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={undoLast}
                        className="gap-1"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        戻す
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearPage}
                        className="gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        このページをクリア
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>ドラッグで黒塗り範囲を指定してください</p>
                <p>
                  このページ: {currentPageRects.length}箇所 / 全体:{" "}
                  {totalRects}箇所
                </p>
              </div>

              {/* Canvas area */}
              <div
                ref={containerRef}
                className="relative mx-auto border rounded-lg overflow-hidden bg-muted"
              >
                {pageRendering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="block w-full h-auto"
                />
                <canvas
                  ref={overlayRef}
                  className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
              </div>

              {/* Page thumbnails */}
              {pageCount > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {Array.from({ length: pageCount }, (_, i) => {
                    const hasRects = rects.some((r) => r.pageIndex === i);
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          currentPage === i
                            ? "bg-primary text-primary-foreground border-primary"
                            : hasRects
                              ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                              : "bg-card hover:bg-muted border-border"
                        }`}
                      >
                        P{i + 1}
                        {hasRects && " ●"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                黒塗り処理中... {progress}%
              </p>
            </div>
          )}

          {loaded && (
            <Button
              onClick={handleApply}
              disabled={totalRects === 0 || processing}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {processing ? (
                "処理中..."
              ) : totalRects === 0 ? (
                "黒塗り範囲をドラッグで指定してください"
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  {totalRects}箇所を黒塗りして保存
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-6 lg:p-8">
            <p className="text-lg font-medium mb-2">
              黒塗り処理が完了しました！
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {totalRects}箇所を黒塗りしました
            </p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              黒塗り済みPDFをダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他のファイルを処理する
          </Button>
        </div>
      )}
    </div>
  );
}
