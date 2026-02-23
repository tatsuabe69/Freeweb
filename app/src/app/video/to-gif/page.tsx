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

const fpsOptions = [
  { label: "10 fps", value: 10 },
  { label: "15 fps", value: 15 },
  { label: "24 fps", value: 24 },
];

const widthOptions = [
  { label: "320px", value: 320 },
  { label: "480px", value: 480 },
  { label: "640px", value: 640 },
  { label: "元のサイズ", value: -1 },
];

export default function VideoToGifPage() {
  const { load, loaded, loading, loadProgress, progress, exec, writeFile, readFile } =
    useFFmpeg();
  const [files, setFiles] = useState<File[]>([]);
  const [startTime, setStartTime] = useState("0");
  const [endTime, setEndTime] = useState("");
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);

    try {
      const file = files[0];
      const inputName = "input" + getExtension(file.name);
      const paletteName = "palette.png";
      const outputName = "output.gif";

      await writeFile(inputName, await fetchFile(file));

      const scaleFilter =
        width === -1
          ? `fps=${fps}`
          : `fps=${fps},scale=${width}:-1:flags=lanczos`;

      const timeArgs: string[] = [];
      if (startTime && startTime !== "0") {
        timeArgs.push("-ss", startTime);
      }
      if (endTime) {
        timeArgs.push("-to", endTime);
      }

      // Two-pass approach for better quality GIF
      await exec([
        ...timeArgs,
        "-i", inputName,
        "-vf", `${scaleFilter},palettegen=stats_mode=diff`,
        "-y", paletteName,
      ]);

      await exec([
        ...timeArgs,
        "-i", inputName,
        "-i", paletteName,
        "-lavfi", `${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
        "-y", outputName,
      ]);

      const data = await readFile(outputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "image/gif" });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}.gif` });
    } catch (error) {
      console.error("GIF conversion failed:", error);
      alert("GIF変換に失敗しました。もう一度お試しください。");
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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> ツール一覧に戻る
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg bg-primary/10 p-2">
          <Film className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">動画 → GIF</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        動画をアニメーションGIFに変換します。フレームレート・サイズ・時間を調整可能。すべての処理はブラウザ内で完結します。
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    開始時間（秒）
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    終了時間（秒）
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="動画の最後まで"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  フレームレート
                </label>
                <div className="flex gap-2">
                  {fpsOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFps(opt.value)}
                      className={`flex-1 rounded-lg border p-2 text-sm transition-colors ${
                        fps === opt.value
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">幅</label>
                <div className="grid grid-cols-4 gap-2">
                  {widthOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setWidth(opt.value)}
                      className={`rounded-lg border p-2 text-sm transition-colors ${
                        width === opt.value
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
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
                GIFに変換中... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleConvert}
            disabled={files.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "変換中..." : "GIFに変換"}
          </Button>
        </div>
      )}

      {result && (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">GIFが作成されました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              GIFをダウンロード
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
