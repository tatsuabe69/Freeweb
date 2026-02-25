"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "@/components/file-dropzone";
import { Download, Eraser, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BgRemovePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const handleFilesChange = (f: File[]) => {
    setFiles(f);
    setResult(null);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    if (f.length > 0) {
      const url = URL.createObjectURL(f[0]);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleRemove = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setStatusMsg("AIモデルを読み込み中...");

    try {
      const { removeBackground } = await import("@imgly/background-removal");

      const blob = await removeBackground(files[0], {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setProgress(pct);
          }
          if (key.includes("fetch")) setStatusMsg("AIモデルをダウンロード中...");
          else if (key.includes("compute")) setStatusMsg("背景を削除中...");
        },
      });

      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      const baseName = files[0].name.replace(/\.[^.]+$/, "");
      setResult({ url, name: `${baseName}_nobg.png` });
    } catch (err) {
      console.error("Background removal failed:", err);
      alert("背景削除に失敗しました。別の画像をお試しください。");
    } finally {
      setProcessing(false);
      setStatusMsg("");
    }
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
    setProgress(0);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  };

  return (
    <div className="mx-auto max-w-screen-xl px-6 lg:px-10 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <Eraser className="h-5 w-5 text-[#ec4899]" />
        <h1 className="text-xl font-semibold tracking-tight">AI背景削除</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        ブラウザ内AIが画像の背景を自動削除。サーバーへのアップロード不要、完全ローカル処理。
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept="image/*,.png,.jpg,.jpeg,.webp"
            files={files}
            onFilesChange={handleFilesChange}
            label="画像ファイルをここにドロップ"
            description="PNG・JPG・WebPに対応"
          />

          {preview && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-2">プレビュー</p>
              <img
                src={preview}
                alt="preview"
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {statusMsg} {progress > 0 && `${progress}%`}
              </p>
              <p className="text-xs text-muted-foreground/60 text-center">
                初回はAIモデルのダウンロード（約40MB）に時間がかかります
              </p>
            </div>
          )}

          <Button
            onClick={handleRemove}
            disabled={files.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "処理中..." : "背景を削除"}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <p className="text-lg font-medium text-center mb-4">背景削除が完了しました！</p>

            {/* Before/After */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">元画像</p>
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
                <p className="text-xs text-muted-foreground mb-2 text-center">背景削除後</p>
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
