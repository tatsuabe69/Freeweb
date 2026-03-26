"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/file-dropzone";
import { Download, Droplets, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function OpacityPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(100);
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<{ url: string; name: string } | null>(
    null,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultUrlRef = useRef<string | null>(null);

  const handleFilesChange = (f: File[]) => {
    setFiles(f);
    setResult(null);
    setOpacity(100);
    setLoadedImg(null);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    if (f.length > 0) {
      const url = URL.createObjectURL(f[0]);
      setPreview(url);

      const img = new Image();
      img.onload = () => {
        setLoadedImg(img);
      };
      img.src = url;
    } else {
      setPreview(null);
    }
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = loadedImg;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image with specified opacity
    ctx.globalAlpha = opacity / 100;
    ctx.drawImage(img, 0, 0);
    ctx.globalAlpha = 1;
  }, [opacity, loadedImg]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderCanvas();

    canvas.toBlob((blob) => {
      if (!blob) return;
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      const baseName = files[0]?.name.replace(/\.[^.]+$/, "") ?? "image";
      setResult({ url, name: `${baseName}_opacity${opacity}.png` });
    }, "image/png");
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.name;
    a.click();
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setPreview(null);
    setOpacity(100);
    setLoadedImg(null);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
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
        <Droplets className="h-5 w-5 text-[#0891b2]" />
        <h1 className="text-xl font-semibold tracking-tight">画像透明度調整</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        画像の透明度（不透明度）をスライダーで調整。PNG形式で出力するため透明度が保持されます。
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept="image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif"
            files={files}
            onFilesChange={handleFilesChange}
            label="画像ファイルをここにドロップ"
            description="PNG・JPG・WebP・BMP・GIFに対応（出力はPNG）"
          />

          {preview && loadedImg && (
            <>
              {/* Opacity slider */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    不透明度: {opacity}%
                  </label>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setOpacity(100)}
                    className="gap-1 text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    リセット
                  </Button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#0891b2]"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0% (完全透明)</span>
                  <span>100% (不透明)</span>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-2">プレビュー</p>
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    className="max-h-96 w-full object-contain mx-auto"
                    style={{ imageRendering: "auto" }}
                  />
                </div>
              </div>

              <Button
                onClick={handleApply}
                disabled={files.length === 0}
                className="w-full"
                size="lg"
              >
                透明度を適用してPNGに変換
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <p className="text-lg font-medium text-center mb-4">
              透明度の調整が完了しました！
            </p>

            {/* Before/After */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  元画像
                </p>
                <div className="rounded-lg border overflow-hidden bg-muted/30">
                  {preview && (
                    <img
                      src={preview}
                      alt="original"
                      className="w-full max-h-64 object-contain"
                    />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  透明度 {opacity}% 適用後
                </p>
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  <img
                    src={result.url}
                    alt="result"
                    className="w-full max-h-64 object-contain"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleDownload} size="lg" className="w-full gap-2">
              <Download className="h-5 w-5" />
              PNG画像をダウンロード
            </Button>
          </div>

          <Button variant="outline" onClick={reset} className="w-full">
            別の画像で試す
          </Button>
        </div>
      )}
    </div>
  );
}
