"use client";

import { useState } from "react";
import { fetchFile } from "@ffmpeg/util";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { FFmpegLoader } from "@/components/ffmpeg-loader";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Film, ArrowLeft } from "lucide-react";
import Link from "next/link";

const profiles = [
  { label: "Baseline", value: "baseline", desc: "最大互換性（Zoom推奨）" },
  { label: "Main", value: "main", desc: "バランス型" },
  { label: "High", value: "high", desc: "高画質" },
] as const;

const qualityPresets = [
  { label: "高画質", crf: 18, id: "high" },
  { label: "バランス", crf: 23, id: "balanced" },
  { label: "軽量", crf: 28, id: "light" },
] as const;

const speedPresets = [
  { label: "高速", value: "fast" },
  { label: "標準", value: "medium" },
  { label: "高圧縮", value: "slow" },
] as const;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : ".mp4";
}

export default function H264ConvertPage() {
  const { load, loaded, loading, loadProgress, progress, error, exec, writeFile, readFile } =
    useFFmpeg();
  const [files, setFiles] = useState<File[]>([]);
  const [profile, setProfile] = useState("baseline");
  const [quality, setQuality] = useState("balanced");
  const [speed, setSpeed] = useState("fast");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [originalSize, setOriginalSize] = useState(0);

  const getCrf = () => qualityPresets.find((q) => q.id === quality)?.crf ?? 23;

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);

    try {
      const file = files[0];
      setOriginalSize(file.size);
      const inputName = "input" + getExtension(file.name);
      const outputName = "output.mp4";

      await writeFile(inputName, await fetchFile(file));

      await exec([
        "-i", inputName,
        "-c:v", "libx264",
        "-profile:v", profile,
        "-level", "4.0",
        "-crf", String(getCrf()),
        "-preset", speed,
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        outputName,
      ]);

      const data = await readFile(outputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}_h264.mp4` });
    } catch (err) {
      console.error("H.264 conversion failed:", err);
      alert("変換に失敗しました。別のファイルをお試しください。");
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
    <div className="mx-auto max-w-screen-xl px-6 lg:px-10 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <Film className="h-5 w-5 text-[#7c3aed]" />
        <h1 className="text-xl font-semibold tracking-tight">H.264 動画変換</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        動画をH.264（MP4）に変換。Zoom画面共有・プレゼン・互換性が必要な場面に。ブラウザ内で完結。
      </p>

      <FFmpegLoader
        loaded={loaded}
        loading={loading}
        loadProgress={loadProgress}
        error={error}
        onLoad={load}
      />

      {loaded && !result && (
        <div className="space-y-6">
          <FileDropzone
            accept="video/*,.mp4,.mov,.avi,.webm,.mkv,.flv,.wmv,.ts"
            files={files}
            onFilesChange={setFiles}
            label="動画ファイルをここにドロップ"
            description="MP4・MOV・AVI・WebM・MKV・FLV・WMV・TSに対応"
          />

          {files.length > 0 && (
            <div className="space-y-4">
              {/* Profile */}
              <div>
                <label className="text-sm font-medium mb-2 block">H.264プロファイル</label>
                <div className="grid grid-cols-3 gap-2">
                  {profiles.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setProfile(p.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        profile === p.value
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <span className="text-sm font-medium block">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="text-sm font-medium mb-2 block">画質</label>
                <div className="grid grid-cols-3 gap-2">
                  {qualityPresets.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setQuality(q.id)}
                      className={`rounded-lg border p-3 text-sm transition-colors ${
                        quality === q.id
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {q.label}
                      <span className="block text-xs text-muted-foreground mt-0.5">CRF {q.crf}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed */}
              <div>
                <label className="text-sm font-medium mb-2 block">エンコード速度</label>
                <div className="grid grid-cols-3 gap-2">
                  {speedPresets.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSpeed(s.value)}
                      className={`rounded-lg border p-3 text-sm transition-colors ${
                        speed === s.value
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {s.label}
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
            {processing ? "変換中..." : "H.264に変換"}
          </Button>
        </div>
      )}

      {result && (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-2">変換が完了しました！</p>
            <div className="text-sm text-muted-foreground mb-4 space-y-1">
              <p>元のサイズ: {formatFileSize(originalSize)}</p>
              <p>変換後: {formatFileSize(result.blob.size)}</p>
            </div>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              H.264動画をダウンロード
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
