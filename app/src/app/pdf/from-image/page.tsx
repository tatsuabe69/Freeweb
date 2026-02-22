"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, FileImage, ArrowLeft } from "lucide-react";
import Link from "next/link";

type PageSize = "fit" | "a4" | "letter";

export default function ImageToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>("fit");

  const pageSizes: Record<string, { width: number; height: number } | null> = {
    fit: null,
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612, height: 792 },
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const pdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        let image;
        const type = file.type.toLowerCase();
        if (type === "image/png") {
          image = await pdf.embedPng(bytes);
        } else {
          image = await pdf.embedJpg(bytes);
        }

        const size = pageSizes[pageSize];
        if (size) {
          const page = pdf.addPage([size.width, size.height]);
          const scale = Math.min(
            size.width / image.width,
            size.height / image.height
          );
          const scaledWidth = image.width * scale;
          const scaledHeight = image.height * scale;
          page.drawImage(image, {
            x: (size.width - scaledWidth) / 2,
            y: (size.height - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
          });
        } else {
          const page = pdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        }

        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const pdfBytes = await pdf.save();
      setResult(pdfBytes);
    } catch (error) {
      console.error("Conversion failed:", error);
      alert(
        "Failed to convert images. Please use JPG or PNG files."
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
    a.download = "images.pdf";
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
          <FileImage className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Image to PDF</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Convert JPG and PNG images into a PDF document. All processing happens in
        your browser.
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
            multiple
            files={files}
            onFilesChange={setFiles}
            label="Drop images here"
            description="JPG and PNG supported — add multiple images to create a multi-page PDF"
          />

          {files.length > 0 && (
            <div className="space-y-4 rounded-xl border bg-card p-4">
              <div>
                <label className="text-sm font-medium">Page size</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant={pageSize === "fit" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPageSize("fit")}
                  >
                    Fit to image
                  </Button>
                  <Button
                    variant={pageSize === "a4" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPageSize("a4")}
                  >
                    A4
                  </Button>
                  <Button
                    variant={pageSize === "letter" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPageSize("letter")}
                  >
                    Letter
                  </Button>
                </div>
              </div>
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Converting... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleConvert}
            disabled={files.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing
              ? "Converting..."
              : `Convert ${files.length} image${files.length !== 1 ? "s" : ""} to PDF`}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">Conversion complete!</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              Download PDF
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            Convert more images
          </Button>
        </div>
      )}
    </div>
  );
}
