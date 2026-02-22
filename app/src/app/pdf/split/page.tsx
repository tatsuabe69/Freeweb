"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Scissors, ArrowLeft } from "lucide-react";
import Link from "next/link";

type SplitMode = "range" | "every-page";

export default function PdfSplitPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [splitMode, setSplitMode] = useState<SplitMode>("every-page");
  const [rangeInput, setRangeInput] = useState("");
  const [done, setDone] = useState(false);

  const loadPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    setTotalPages(pdf.getPageCount());
    return pdf;
  };

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setDone(false);
    if (newFiles.length === 1) {
      try {
        await loadPdf(newFiles[0]);
      } catch {
        setTotalPages(0);
      }
    } else {
      setTotalPages(0);
    }
  };

  const parseRanges = (input: string, max: number): number[][] => {
    return input
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        if (part.includes("-")) {
          const [start, end] = part.split("-").map((n) => parseInt(n.trim()));
          const s = Math.max(1, Math.min(start, max));
          const e = Math.max(s, Math.min(end, max));
          return Array.from({ length: e - s + 1 }, (_, i) => s + i - 1);
        }
        const n = parseInt(part);
        if (n >= 1 && n <= max) return [n - 1];
        return [];
      })
      .filter((r) => r.length > 0);
  };

  const handleSplit = async () => {
    if (files.length !== 1) return;
    setProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const pageCount = sourcePdf.getPageCount();
      const zip = new JSZip();

      let groups: number[][];
      if (splitMode === "every-page") {
        groups = Array.from({ length: pageCount }, (_, i) => [i]);
      } else {
        groups = parseRanges(rangeInput, pageCount);
        if (groups.length === 0) {
          alert("Please enter valid page ranges.");
          setProcessing(false);
          return;
        }
      }

      for (let i = 0; i < groups.length; i++) {
        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(sourcePdf, groups[i]);
        pages.forEach((page) => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();
        const label =
          splitMode === "every-page"
            ? `page_${groups[i][0] + 1}`
            : `part_${i + 1}`;
        zip.file(`${label}.pdf`, pdfBytes);
        setProgress(Math.round(((i + 1) / groups.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "split_pdfs.zip");
      setDone(true);
    } catch (error) {
      console.error("Split failed:", error);
      alert("Failed to split PDF. Please check your file and try again.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setTotalPages(0);
    setDone(false);
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
          <Scissors className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">PDF Split</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Split a PDF into separate files. All processing happens in your browser.
      </p>

      {!done ? (
        <div className="space-y-6">
          <FileDropzone
            accept=".pdf,application/pdf"
            files={files}
            onFilesChange={handleFilesChange}
            label="Drop a PDF file here"
            description="or click to browse"
          />

          {totalPages > 0 && (
            <div className="space-y-4 rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {totalPages} pages detected
              </p>

              <div className="flex gap-2">
                <Button
                  variant={splitMode === "every-page" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSplitMode("every-page")}
                >
                  Every page
                </Button>
                <Button
                  variant={splitMode === "range" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSplitMode("range")}
                >
                  By range
                </Button>
              </div>

              {splitMode === "range" && (
                <div>
                  <label className="text-sm font-medium">
                    Page ranges (e.g. 1-3, 4-6, 7)
                  </label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="1-3, 4-6, 7"
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Splitting... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleSplit}
            disabled={files.length !== 1 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "Splitting..." : "Split PDF"}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-2">Split complete!</p>
            <p className="text-sm text-muted-foreground">
              Your ZIP file has been downloaded.
            </p>
          </div>
          <Button variant="outline" onClick={reset}>
            Split another file
          </Button>
        </div>
      )}
    </div>
  );
}
