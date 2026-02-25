"use client";

import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FileDropzone } from "@/components/file-dropzone";
import { CroppableImage } from "@/components/image-cropper";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Image as ImageIcon, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

type ImageFormat = "png" | "jpeg" | "webp";
type DPI = 72 | 150 | 300;

export default function PdfToImagePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [dpi, setDpi] = useState<DPI>(150);
  const [totalPages, setTotalPages] = useState(0);
  /** data URLs of converted pages (editable via crop) */
  const [pageImages, setPageImages] = useState<string[]>([]);
  const pdfjsRef = useRef<typeof import("pdfjs-dist") | null>(null);

  useEffect(() => {
    import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      pdfjsRef.current = pdfjs;
    });
  }, []);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setPageImages([]);
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
      const scale = dpi / 72;
      const images: string[] = [];

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
        images.push(canvas.toDataURL(mimeType, quality));

        setProgress(Math.round((i / numPages) * 100));
      }

      setPageImages(images);
    } catch (error) {
      console.error("Conversion failed:", error);
      alert("PDFの変換に失敗しました。ファイルを確認してもう一度お試しください。");
    } finally {
      setProcessing(false);
    }
  };

  const handleCropped = (index: number, croppedDataUrl: string) => {
    setPageImages((prev) => {
      const next = [...prev];
      next[index] = croppedDataUrl;
      return next;
    });
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    for (let i = 0; i < pageImages.length; i++) {
      const base64 = pageImages[i].split(",")[1];
      const ext = format === "jpeg" ? "jpg" : format;
      zip.file(`page_${i + 1}.${ext}`, base64, { base64: true });
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "pdf_images.zip");
  };

  const reset = () => {
    setFiles([]);
    setPageImages([]);
    setProgress(0);
    setTotalPages(0);
  };

  const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;

  return (
    <div className="mx-auto max-w-screen-xl px-6 lg:px-10 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <ImageIcon className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">PDF → 画像</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        PDFの各ページをJPG・PNG・WebP画像に変換します。変換後にトリミングも可能。すべての処理はブラウザ内で完結します。
      </p>

      {pageImages.length === 0 ? (
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
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {pageImages.length}ページの変換が完了。画像にホバーして「トリミング」で切り抜きできます。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pageImages.map((img, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground mb-1">ページ {i + 1}</p>
                <CroppableImage
                  src={img}
                  index={i}
                  onCropped={handleCropped}
                  mimeType={mimeType}
                  quality={format === "jpeg" ? 0.92 : undefined}
                />
              </div>
            ))}
          </div>

          <Button onClick={handleDownload} size="lg" className="w-full gap-2">
            <Download className="h-5 w-5" />
            ZIPでダウンロード
          </Button>

          <Button variant="outline" onClick={reset} className="w-full">
            他のファイルを変換する
          </Button>
        </div>
      )}
    </div>
  );
}
