"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { usePdfThumbnails } from "@/hooks/use-pdf-thumbnails";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";

export default function PdfDeletePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { thumbnails, loading: thumbnailsLoading } = usePdfThumbnails(
    files.length === 1 ? files[0] : null,
    200
  );

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    setLoaded(false);
    setSelected(new Set());
    if (newFiles.length === 1) {
      try {
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const count = pdf.getPageCount();
        setPageCount(count);
        setLoaded(true);
      } catch {
        setPageCount(0);
      }
    } else {
      setPageCount(0);
    }
  };

  const togglePage = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  }, [pageCount]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleDelete = async () => {
    if (files.length !== 1 || selected.size === 0) return;
    if (selected.size === pageCount) {
      alert("すべてのページは削除できません。少なくとも1ページは残してください。");
      return;
    }
    setProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      const keepPages = Array.from({ length: pageCount }, (_, i) => i).filter(
        (i) => !selected.has(i)
      );

      for (let i = 0; i < keepPages.length; i++) {
        const [page] = await newPdf.copyPages(sourcePdf, [keepPages[i]]);
        newPdf.addPage(page);
        setProgress(Math.round(((i + 1) / keepPages.length) * 100));
      }

      const pdfBytes = await newPdf.save();
      setResult(pdfBytes);
    } catch (error) {
      console.error("Delete failed:", error);
      alert(
        "PDFの処理に失敗しました。ファイルを確認してもう一度お試しください。"
      );
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
    a.download = "deleted.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setPageCount(0);
    setLoaded(false);
    setSelected(new Set());
    setProgress(0);
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <Trash2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">
          PDF ページ削除
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        プレビューを見ながら不要なページを選択して削除します。すべての処理はブラウザ内で完結します。
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
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  {pageCount}ページ — 削除したいページをクリックして選択
                </p>
                <div className="flex items-center gap-2">
                  {thumbnailsLoading && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      プレビュー生成中...
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={
                      selected.size === pageCount ? deselectAll : selectAll
                    }
                  >
                    {selected.size === pageCount
                      ? "すべて解除"
                      : "すべて選択"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {Array.from({ length: pageCount }, (_, i) => {
                  const isSelected = selected.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => togglePage(i)}
                      className={`group relative flex flex-col items-center rounded-lg border p-2 transition-all ${
                        isSelected
                          ? "border-destructive bg-destructive/5 ring-2 ring-destructive/30"
                          : "border-border bg-card hover:shadow-md hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="relative w-full">
                        {thumbnails[i] ? (
                          <img
                            src={thumbnails[i]}
                            alt={`ページ ${i + 1}`}
                            className={`w-full rounded border bg-white object-contain transition-opacity ${
                              isSelected ? "opacity-40" : ""
                            }`}
                            draggable={false}
                          />
                        ) : (
                          <div className="flex aspect-[3/4] w-full items-center justify-center rounded border bg-muted">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Trash2 className="h-8 w-8 text-destructive" />
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            isSelected
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          ページ {i + 1}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                処理中... {progress}%
              </p>
            </div>
          )}

          {loaded && (
            <div className="space-y-2">
              {selected.size > 0 && (
                <p className="text-sm text-center text-destructive font-medium">
                  {selected.size}ページを削除 → {pageCount - selected.size}
                  ページが残ります
                </p>
              )}
              <Button
                onClick={handleDelete}
                disabled={
                  selected.size === 0 ||
                  selected.size === pageCount ||
                  processing
                }
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {processing ? (
                  "処理中..."
                ) : selected.size === 0 ? (
                  "削除するページを選択してください"
                ) : selected.size === pageCount ? (
                  "すべてのページは削除できません"
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    選択した{selected.size}ページを削除
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-6 lg:p-8">
            <p className="text-lg font-medium mb-4">
              ページ削除が完了しました！
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {selected.size}ページを削除 → {pageCount - selected.size}
              ページのPDFを作成しました
            </p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              PDFをダウンロード
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
