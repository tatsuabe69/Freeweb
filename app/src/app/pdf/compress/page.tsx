"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Minimize2, ArrowLeft } from "lucide-react";
import Link from "next/link";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function PdfCompressPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [originalSize, setOriginalSize] = useState(0);

  const handleCompress = async () => {
    if (files.length !== 1) return;
    setProcessing(true);
    setProgress(0);
    setOriginalSize(files[0].size);

    try {
      setProgress(20);
      const arrayBuffer = await files[0].arrayBuffer();
      setProgress(40);

      const sourcePdf = await PDFDocument.load(arrayBuffer);
      setProgress(60);

      // Rebuild PDF without unused objects (basic compression via pdf-lib)
      const compressedPdf = await PDFDocument.create();
      const pages = await compressedPdf.copyPages(
        sourcePdf,
        sourcePdf.getPageIndices()
      );
      pages.forEach((page) => compressedPdf.addPage(page));
      setProgress(80);

      const pdfBytes = await compressedPdf.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      setResult(pdfBytes);
      setProgress(100);
    } catch (error) {
      console.error("Compression failed:", error);
      alert(
        "PDFの圧縮に失敗しました。ファイルを確認してもう一度お試しください。"
      );
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
    a.download = "compressed.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setProgress(0);
    setOriginalSize(0);
  };

  const savings = result
    ? Math.max(0, Math.round((1 - result.length / originalSize) * 100))
    : 0;

  return (
    <div className="mx-auto max-w-screen-xl px-6 lg:px-10 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <Minimize2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">PDF 圧縮</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        不要なオブジェクトの削除と構造の最適化によりPDFのファイルサイズを縮小します。すべての処理はブラウザ内で完結します。
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept=".pdf,application/pdf"
            files={files}
            onFilesChange={setFiles}
            label="PDFファイルをここにドロップ"
            description="またはクリックして選択"
          />

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                圧縮中... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleCompress}
            disabled={files.length !== 1 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "圧縮中..." : "PDFを圧縮"}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8 space-y-4">
            <p className="text-lg font-medium">圧縮が完了しました！</p>
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <p className="text-muted-foreground">元のサイズ</p>
                <p className="font-semibold">{formatSize(originalSize)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">圧縮後</p>
                <p className="font-semibold">{formatSize(result.length)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">削減率</p>
                <p className="font-semibold text-green-600">{savings}%</p>
              </div>
            </div>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              圧縮済みPDFをダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他のファイルを圧縮する
          </Button>
        </div>
      )}
    </div>
  );
}
