"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Merge, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PdfMergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setProgress(0);

    try {
      const mergedPdf = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const arrayBuffer = await files[i].arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      const pdfBytes = await mergedPdf.save();
      setResult(pdfBytes);
    } catch (error) {
      console.error("Merge failed:", error);
      alert("Failed to merge PDFs. Please check your files and try again.");
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
    a.download = "merged.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setProgress(0);
  };

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
          <Merge className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">PDF Merge</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Combine multiple PDF files into a single document. Files are processed
        entirely in your browser.
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple
            files={files}
            onFilesChange={setFiles}
            label="Drop PDF files here"
            description="or click to browse — add 2 or more PDFs to merge"
          />

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Merging... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleMerge}
            disabled={files.length < 2 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "Merging..." : `Merge ${files.length} PDFs`}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">Merge complete!</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              Download Merged PDF
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            Merge more files
          </Button>
        </div>
      )}
    </div>
  );
}
