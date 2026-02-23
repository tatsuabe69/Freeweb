"use client";

import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Image as ImageIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";

type ImageFormat = "png" | "jpeg" | "webp";
type DPI = 72 | 150 | 300;

export default function PdfToImagePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [dpi, setDpi] = useState<DPI>(150);
  const [done, setDone] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const pdfjsRef = useRef<typeof import("pdfjs-dist") | null>(null);

  useEffect(() => {
    import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
      pdfjsRef.current = pdfjs;
    });
  }, []);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setDone(false);
    if (newFiles.length === 1 && pdfjsRef.current) {
      try {
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const pdf = await pdfjsRef.current.getDocument({ data: arrayBuffer })
          .promise;
        setTotalPages(pdf.numPages);
      } catch {
        setTotalPages(0);
      }
    } else {
      setTotalPages(0);
    }
  };

  const handleConvert = async () => {
    if (files.length !== 1 || !pdfjsRef.current) return;
    setProcessing(true);
    setProgress(0);

    try {
      const pdfjs = pdfjsRef.current;
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const zip = new JSZip();
      const scale = dpi / 72;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;

        const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
        const quality = format === "jpeg" ? 0.92 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(",")[1];
        const ext = format === "jpeg" ? "jpg" : format;
        zip.file(`page_${i}.${ext}`, base64, { base64: true });

        setProgress(Math.round((i / numPages) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "pdf_images.zip");
      setDone(true);
    } catch (error) {
      console.error("Conversion failed:", error);
      alert("PDFの変換に失敗しました。ファイルを確認してもう一度お試しください。");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setDone(false);
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
          <ImageIcon className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">PDF → 画像</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        PDFの各ページをJPG・PNG・WebP画像に変換します。すべての処理はブラウザ内で完結します。
      </p>

      {!done ? (
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
                <label className="text-sm font-medium">画像形式</label>
                <div className="flex gap-2 mt-1">
                  {(["png", "jpeg", "webp"] as ImageFormat[]).map((f) => (
                    <Button
                      key={f}
                      variant={format === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormat(f)}
                    >
                      {f === "jpeg" ? "JPG" : f.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">解像度</label>
                <div className="flex gap-2 mt-1">
                  {([72, 150, 300] as DPI[]).map((d) => (
                    <Button
                      key={d}
                      variant={dpi === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDpi(d)}
                    >
                      {d} DPI
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                変換中... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleConvert}
            disabled={files.length !== 1 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "変換中..." : "画像に変換"}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-2">変換が完了しました！</p>
            <p className="text-sm text-muted-foreground">
              ZIPファイルがダウンロードされました。
            </p>
          </div>
          <Button variant="outline" onClick={reset}>
            他のファイルを変換する
          </Button>
        </div>
      )}
    </div>
  );
}
