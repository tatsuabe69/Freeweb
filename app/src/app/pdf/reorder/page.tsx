"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  ArrowUpDown,
  ArrowLeft,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";

interface PageInfo {
  index: number;
  label: string;
  deleted: boolean;
}

export default function PdfReorderPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    setLoaded(false);
    if (newFiles.length === 1) {
      try {
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const count = pdf.getPageCount();
        setPages(
          Array.from({ length: count }, (_, i) => ({
            index: i,
            label: `ページ ${i + 1}`,
            deleted: false,
          }))
        );
        setLoaded(true);
      } catch {
        setPages([]);
      }
    } else {
      setPages([]);
    }
  };

  const movePage = useCallback(
    (from: number, direction: "up" | "down") => {
      const to = direction === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= pages.length) return;
      const newPages = [...pages];
      [newPages[from], newPages[to]] = [newPages[to], newPages[from]];
      setPages(newPages);
    },
    [pages]
  );

  const toggleDelete = useCallback(
    (index: number) => {
      const newPages = [...pages];
      newPages[index] = { ...newPages[index], deleted: !newPages[index].deleted };
      setPages(newPages);
    },
    [pages]
  );

  const handleSave = async () => {
    if (files.length !== 1) return;
    setProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      const activePages = pages.filter((p) => !p.deleted);
      for (let i = 0; i < activePages.length; i++) {
        const [page] = await newPdf.copyPages(sourcePdf, [
          activePages[i].index,
        ]);
        newPdf.addPage(page);
        setProgress(Math.round(((i + 1) / activePages.length) * 100));
      }

      const pdfBytes = await newPdf.save();
      setResult(pdfBytes);
    } catch (error) {
      console.error("Reorder failed:", error);
      alert("PDFの並び替えに失敗しました。ファイルを確認してもう一度お試しください。");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reordered.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setPages([]);
    setLoaded(false);
    setProgress(0);
  };

  const activeCount = pages.filter((p) => !p.deleted).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> ツール一覧に戻る
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg bg-primary/10 p-2">
          <ArrowUpDown className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">PDF 並び替え</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        PDFのページを並び替え・削除します。すべての処理はブラウザ内で完結します。
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

          {loaded && pages.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {pages.length}ページ — 矢印で並び替え、ゴミ箱で削除
              </p>
              {pages.map((page, idx) => (
                <div
                  key={`${page.index}-${idx}`}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-opacity ${
                    page.deleted ? "opacity-40" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span
                    className={`flex-1 text-sm font-medium ${
                      page.deleted ? "line-through" : ""
                    }`}
                  >
                    {page.label}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => movePage(idx, "up")}
                      disabled={idx === 0 || page.deleted}
                      aria-label="上に移動"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => movePage(idx, "down")}
                      disabled={idx === pages.length - 1 || page.deleted}
                      aria-label="下に移動"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleDelete(idx)}
                      aria-label={page.deleted ? "ページを復元" : "ページを削除"}
                    >
                      <Trash2
                        className={`h-4 w-4 ${
                          page.deleted
                            ? "text-muted-foreground"
                            : "text-destructive"
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              ))}
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
            <Button
              onClick={handleSave}
              disabled={activeCount === 0 || processing}
              className="w-full"
              size="lg"
            >
              {processing
                ? "処理中..."
                : `PDFを保存（${activeCount}ページ）`}
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">並び替えが完了しました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              並び替え済みPDFをダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他のファイルを並び替える
          </Button>
        </div>
      )}
    </div>
  );
}
