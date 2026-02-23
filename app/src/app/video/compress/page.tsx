"use client";

import { useState } from "react";
import { fetchFile } from "@ffmpeg/util";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { FFmpegLoader } from "@/components/ffmpeg-loader";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Minimize2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const presets = [
  { label: "Discord (< 8 MB)", targetMB: 8, id: "discord" },
  { label: "LINE (< 50 MB)", targetMB: 50, id: "line" },
  { label: "Twitter (< 512 MB)", targetMB: 512, id: "twitter" },
  { label: "カスタム", targetMB: 0, id: "custom" },
] as const;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function VideoCompressPage() {
  const { load, loaded, loading, loadProgress, progress, exec, writeFile, readFile } =
    useFFmpeg();
  const [files, setFiles] = useState<File[]>([]);
  const [preset, setPreset] = useState<string>("discord");
  const [customMB, setCustomMB] = useState<number>(10);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [originalSize, setOriginalSize] = useState(0);

  const getTargetMB = () => {
    if (preset === "custom") return customMB;
    return presets.find((p) => p.id === preset)?.targetMB ?? 8;
  };

  const handleCompress = async () => {
    if (files.length === 0) return;
    setProcessing(true);

    try {
      const file = files[0];
      setOriginalSize(file.size);
      const inputName = "input" + getExtension(file.name);
      const outputName = "output.mp4";

      await writeFile(inputName, await fetchFile(file));

      const targetMB = getTargetMB();
      const targetBytes = targetMB * 1024 * 1024;
      // Calculate target bitrate: target_size_bits / duration
      // We estimate duration by doing a first pass or use a reasonable bitrate
      const targetBitrate = Math.max(
        100,
        Math.floor((targetBytes * 8) / estimateDuration(file.size))
      );
      const videoBitrate = `${Math.max(100, targetBitrate - 128)}k`;
      const audioBitrate = "128k";

      await exec([
        "-i", inputName,
        "-c:v", "libx264",
        "-b:v", videoBitrate,
        "-maxrate", videoBitrate,
        "-bufsize", `${Math.max(200, (targetBitrate - 128) * 2)}k`,
        "-c:a", "aac",
        "-b:a", audioBitrate,
        "-preset", "fast",
        "-movflags", "+faststart",
        outputName,
      ]);

      const data = await readFile(outputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}_compressed.mp4` });
    } catch (error) {
      console.error("Compression failed:", error);
      alert("動画の圧縮に失敗しました。別のファイルをお試しください。");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setOriginalSize(0);
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
          <Minimize2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">動画圧縮</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Discord・LINE・Twitter向けやカスタムサイズに動画を圧縮します。すべての処理はブラウザ内で完結します。
      </p>

      <FFmpegLoader
        loaded={loaded}
        loading={loading}
        loadProgress={loadProgress}
        onLoad={load}
      />

      {loaded && !result && (
        <div className="space-y-6">
          <FileDropzone
            accept="video/*,.mp4,.mov,.avi,.webm,.mkv"
            files={files}
            onFilesChange={setFiles}
            label="動画ファイルをここにドロップ"
            description="MP4・MOV・AVI・WebMに対応"
          />

          {files.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  目標サイズプリセット
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={`rounded-lg border p-3 text-sm text-left transition-colors ${
                        preset === p.id
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {preset === "custom" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    目標サイズ（MB）
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={2048}
                    value={customMB}
                    onChange={(e) => setCustomMB(Number(e.target.value))}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          )}

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
            disabled={files.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing
              ? "圧縮中..."
              : `${getTargetMB()} MB以下に圧縮`}
          </Button>
        </div>
      )}

      {result && (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-2">圧縮が完了しました！</p>
            <div className="text-sm text-muted-foreground mb-4 space-y-1">
              <p>元のサイズ: {formatFileSize(originalSize)}</p>
              <p>圧縮後: {formatFileSize(result.blob.size)}</p>
              <p className="text-primary font-medium">
                削減率{" "}
                {Math.round(
                  ((originalSize - result.blob.size) / originalSize) * 100
                )}
                %
              </p>
            </div>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              圧縮済み動画をダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他の動画を圧縮する
          </Button>
        </div>
      )}
    </div>
  );
}

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : ".mp4";
}

function estimateDuration(fileSize: number): number {
  // Rough estimate: assume 1MB/sec for typical video
  return Math.max(5, fileSize / (1024 * 1024));
}
