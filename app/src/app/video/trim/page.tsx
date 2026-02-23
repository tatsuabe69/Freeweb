"use client";

import { useState, useRef, useCallback } from "react";
import { fetchFile } from "@ffmpeg/util";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { FFmpegLoader } from "@/components/ffmpeg-loader";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Scissors, ArrowLeft } from "lucide-react";
import Link from "next/link";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

export default function VideoTrimPage() {
  const { load, loaded, loading, loadProgress, progress, exec, writeFile, readFile } =
    useFFmpeg();
  const [files, setFiles] = useState<File[]>([]);
  const [startTime, setStartTime] = useState("0");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");

  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    if (newFiles.length > 0) {
      const url = URL.createObjectURL(newFiles[0]);
      setVideoUrl(url);
    } else {
      setVideoUrl("");
    }
  }, []);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setEndTime(dur.toFixed(1));
    }
  };

  const handleTrim = async () => {
    if (files.length === 0) return;
    setProcessing(true);

    try {
      const file = files[0];
      const ext = getExtension(file.name);
      const inputName = "input" + ext;
      const outputName = "output" + ext;

      await writeFile(inputName, await fetchFile(file));

      const args = [
        "-ss", startTime,
        ...(endTime ? ["-to", endTime] : []),
        "-i", inputName,
        "-c", "copy",
        "-avoid_negative_ts", "make_zero",
        outputName,
      ];

      await exec(args);

      const data = await readFile(outputName);
      const mimeType = ext === ".webm" ? "video/webm" : "video/mp4";
      const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}_trimmed${ext}` });
    } catch (error) {
      console.error("Trim failed:", error);
      alert("動画のトリミングに失敗しました。もう一度お試しください。");
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
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFiles([]);
    setResult(null);
    setVideoUrl("");
    setDuration(0);
    setStartTime("0");
    setEndTime("");
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
          <Scissors className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">動画トリミング</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        開始・終了時間を指定して動画をカットします。すべての処理はブラウザ内で完結します。
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
            onFilesChange={handleFilesChange}
            label="動画ファイルをここにドロップ"
            description="MP4・MOV・AVI・WebMに対応"
          />

          {videoUrl && (
            <div className="space-y-4">
              <div className="rounded-xl border overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  onLoadedMetadata={handleVideoLoaded}
                  className="w-full max-h-[400px]"
                />
              </div>

              {duration > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  再生時間: {formatTime(duration)}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    開始時間（秒）
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={duration || undefined}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    終了時間（秒）
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={duration || undefined}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                トリミング中... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleTrim}
            disabled={files.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "トリミング中..." : "動画をトリミング"}
          </Button>
        </div>
      )}

      {result && (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">トリミングが完了しました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              トリミング済み動画をダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他の動画をトリミングする
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
