"use client";

import { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { FileDropzone } from "@/components/file-dropzone";
import { CroppableImage } from "@/components/image-cropper";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, FileImage, ArrowLeft } from "lucide-react";
import Link from "next/link";

type PageSize = "fit" | "a4" | "letter";

export default function ImageToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>("fit");

  const pageSizes: Record<string, { width: number; height: number } | null> = {
    fit: null,
    a4: { width: 595.28, height: 841.89 },
    letter: { width: 612, height: 792 },
  };

  // Generate previews when files change
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const handleCropped = (index: number, croppedDataUrl: string) => {
    setPreviews((prev) => {
      const next = [...prev];
      next[index] = croppedDataUrl;
      return next;
    });
  };

  const handleConvert = async () => {
    if (previews.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const pdf = await PDFDocument.create();

      for (let i = 0; i < previews.length; i++) {
        const src = previews[i];
        let bytes: Uint8Array;
        let isPng: boolean;

        if (src.startsWith("data:")) {
          // Cropped image – data URL
          isPng = src.startsWith("data:image/png");
          const base64 = src.split(",")[1];
          const binary = atob(base64);
          bytes = new Uint8Array(binary.length);
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        } else {
          // Original file – object URL
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();
          bytes = new Uint8Array(arrayBuffer);
          isPng = file.type.toLowerCase() === "image/png";
        }

        const image = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

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

        setProgress(Math.round(((i + 1) / previews.length) * 100));
      }

      const pdfBytes = await pdf.save();
      setResult(pdfBytes);
    } catch (error) {
      console.error("Conversion failed:", error);
      alert(
        "画像の変換に失敗しました。JPGまたはPNGファイルをご使用ください。"
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
    setPreviews([]);
    setResult(null);
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
        <FileImage className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">画像 → PDF</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        JPG・PNG画像をPDFドキュメントに変換します。変換前にトリミングも可能。すべての処理はブラウザ内で完結します。
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
            multiple
            files={files}
            onFilesChange={setFiles}
            label="画像をここにドロップ"
            description="JPG・PNGに対応 — 複数の画像で複数ページのPDFを作成できます"
          />

          {previews.length > 0 && (
            <>
              <div className="space-y-4 rounded-xl border bg-card p-4">
                <div>
                  <label className="text-sm font-medium">ページサイズ</label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant={pageSize === "fit" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPageSize("fit")}
                    >
                      画像に合わせる
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

              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  画像にホバーして「トリミング」で切り抜きできます
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {previews.map((src, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground mb-1">{files[i]?.name ?? `画像 ${i + 1}`}</p>
                      <CroppableImage
                        src={src}
                        index={i}
                        onCropped={handleCropped}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
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
            disabled={files.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing
              ? "変換中..."
              : `${files.length}枚の画像をPDFに変換`}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-6 lg:p-8">
            <p className="text-lg font-medium mb-4">変換が完了しました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              PDFをダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他の画像を変換する
          </Button>
        </div>
      )}
    </div>
  );
}
