"use client";

import { useState } from "react";
import { fetchFile } from "@ffmpeg/util";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { FFmpegLoader } from "@/components/ffmpeg-loader";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Ratio, ArrowLeft } from "lucide-react";
import Link from "next/link";

const aspectPresets = [
  { label: "TikTok / Reels", ratio: "9:16", width: 1080, height: 1920, id: "tiktok" },
  { label: "Instagram", ratio: "1:1", width: 1080, height: 1080, id: "instagram" },
  { label: "YouTube", ratio: "16:9", width: 1920, height: 1080, id: "youtube" },
  { label: "Twitter", ratio: "16:9", width: 1280, height: 720, id: "twitter" },
] as const;

const cropPositions = [
  { label: "中央", value: "center", id: "center" },
  { label: "上部", value: "top", id: "top" },
  { label: "下部", value: "bottom", id: "bottom" },
] as const;

export default function VideoAspectPage() {
  const { load, loaded, loading, loadProgress, progress, exec, writeFile, readFile } =
    useFFmpeg();
  const [files, setFiles] = useState<File[]>([]);
  const [preset, setPreset] = useState("tiktok");
  const [cropPosition, setCropPosition] = useState("center");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);

    try {
      const file = files[0];
      const inputName = "input" + getExtension(file.name);
      const outputName = "output.mp4";
      const selected = aspectPresets.find((p) => p.id === preset)!;

      await writeFile(inputName, await fetchFile(file));

      // Build crop filter based on position
      let cropY = "(in_h-out_h)/2"; // center
      if (cropPosition === "top") cropY = "0";
      if (cropPosition === "bottom") cropY = "in_h-out_h";

      const filter = `scale=${selected.width}:${selected.height}:force_original_aspect_ratio=increase,crop=${selected.width}:${selected.height}:(in_w-out_w)/2:${cropY}`;

      await exec([
        "-i", inputName,
        "-vf", filter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-c:a", "aac",
        "-movflags", "+faststart",
        "-y", outputName,
      ]);

      const data = await readFile(outputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}_${selected.id}.mp4` });
    } catch (error) {
      console.error("Aspect ratio conversion failed:", error);
      alert("アスペクト比の変換に失敗しました。もう一度お試しください。");
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
  };

  return (
    <div className="mx-auto max-w-screen-xl px-6 lg:px-10 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ツール一覧
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <Ratio className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">SNSアスペクト比</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        TikTok・Instagram・YouTube・Twitter向けに動画をリサイズします。すべての処理はブラウザ内で完結します。
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
                  プラットフォーム / アスペクト比
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {aspectPresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        preset === p.id
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.ratio} ({p.width}x{p.height})
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  クロップ位置
                </label>
                <div className="flex gap-2">
                  {cropPositions.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setCropPosition(pos.value)}
                      className={`flex-1 rounded-lg border p-2 text-sm transition-colors ${
                        cropPosition === pos.value
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {pos.label}
                    </button>
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
            disabled={files.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing
              ? "変換中..."
              : `${
                  aspectPresets.find((p) => p.id === preset)?.ratio
                }に変換`}
          </Button>
        </div>
      )}

      {result && (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">変換が完了しました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              動画をダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他の動画を変換する
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
