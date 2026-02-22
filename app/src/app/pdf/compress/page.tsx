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
        "Failed to compress PDF. Please check your file and try again."
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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tools
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg bg-primary/10 p-2">
          <Minimize2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">PDF Compress</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Reduce PDF file size by removing unused objects and optimizing the
        structure. All processing happens in your browser.
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept=".pdf,application/pdf"
            files={files}
            onFilesChange={setFiles}
            label="Drop a PDF file here"
            description="or click to browse"
          />

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Compressing... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleCompress}
            disabled={files.length !== 1 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "Compressing..." : "Compress PDF"}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8 space-y-4">
            <p className="text-lg font-medium">Compression complete!</p>
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <p className="text-muted-foreground">Original</p>
                <p className="font-semibold">{formatSize(originalSize)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Compressed</p>
                <p className="font-semibold">{formatSize(result.length)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Savings</p>
                <p className="font-semibold text-green-600">{savings}%</p>
              </div>
            </div>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              Download Compressed PDF
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            Compress another file
          </Button>
        </div>
      )}
    </div>
  );
}
