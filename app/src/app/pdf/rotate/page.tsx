"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, RotateCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PdfRotatePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [rotation, setRotation] = useState(90);
  const [rotateAll, setRotateAll] = useState(true);
  const [pageInput, setPageInput] = useState("");
  const [totalPages, setTotalPages] = useState(0);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    if (newFiles.length === 1) {
      try {
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        setTotalPages(pdf.getPageCount());
      } catch {
        setTotalPages(0);
      }
    } else {
      setTotalPages(0);
    }
  };

  const parsePages = (input: string, max: number): number[] => {
    const pages = new Set<number>();
    input.split(",").forEach((part) => {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map((n) => parseInt(n.trim()));
        for (let i = Math.max(1, start); i <= Math.min(end, max); i++) {
          pages.add(i - 1);
        }
      } else {
        const n = parseInt(trimmed);
        if (n >= 1 && n <= max) pages.add(n - 1);
      }
    });
    return Array.from(pages);
  };

  const handleRotate = async () => {
    if (files.length !== 1) return;
    setProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pageCount = pdf.getPageCount();
      setProgress(30);

      const pagesToRotate = rotateAll
        ? Array.from({ length: pageCount }, (_, i) => i)
        : parsePages(pageInput, pageCount);

      pagesToRotate.forEach((pageIndex) => {
        const page = pdf.getPage(pageIndex);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotation));
      });
      setProgress(70);

      const pdfBytes = await pdf.save();
      setResult(pdfBytes);
      setProgress(100);
    } catch (error) {
      console.error("Rotation failed:", error);
      alert("PDFの回転に失敗しました。ファイルを確認してもう一度お試しください。");
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
    a.download = "rotated.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setProgress(0);
    setTotalPages(0);
  };

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
          <RotateCw className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">PDF 回転</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        PDFのページを90°・180°・270°に回転します。すべての処理はブラウザ内で完結します。
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept=".pdf,application/pdf"
            files={files}
            onFilesChange={handleFilesChange}
            label="PDFファイルをここにドロップ"
            description="またはクリックして選択"
          />

          {totalPages > 0 && (
            <div className="space-y-4 rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {totalPages}ページを検出
              </p>

              <div>
                <label className="text-sm font-medium">回転角度</label>
                <div className="flex gap-2 mt-1">
                  {[90, 180, 270].map((deg) => (
                    <Button
                      key={deg}
                      variant={rotation === deg ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRotation(deg)}
                    >
                      {deg}°
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">回転するページ</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={rotateAll ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRotateAll(true)}
                  >
                    すべてのページ
                  </Button>
                  <Button
                    variant={!rotateAll ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRotateAll(false)}
                  >
                    ページ指定
                  </Button>
                </div>
                {!rotateAll && (
                  <input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    placeholder="例: 1, 3-5, 8"
                    className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                )}
              </div>
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                回転中... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleRotate}
            disabled={files.length !== 1 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "回転中..." : "PDFを回転"}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">回転が完了しました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              回転済みPDFをダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他のファイルを回転する
          </Button>
        </div>
      )}
    </div>
  );
}
