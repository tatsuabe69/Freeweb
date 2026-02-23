"use client";

import { useState, useRef, useCallback } from "react";
import { fetchFile } from "@ffmpeg/util";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { FFmpegLoader } from "@/components/ffmpeg-loader";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Smartphone, ArrowLeft } from "lucide-react";
import Link from "next/link";

/* ── Platform presets ─────────────────────────────── */

const platforms = [
  {
    id: "tiktok",
    label: "TikTok",
    width: 1080,
    height: 1920,
    maxDuration: 600,
    note: "15〜60秒が推奨",
  },
  {
    id: "reels",
    label: "Instagram Reels",
    width: 1080,
    height: 1920,
    maxDuration: 90,
    note: "最大90秒",
  },
  {
    id: "shorts",
    label: "YouTube Shorts",
    width: 1080,
    height: 1920,
    maxDuration: 60,
    note: "最大60秒",
  },
] as const;

const cropPositions = [
  { label: "中央", value: "center" },
  { label: "上部", value: "top" },
  { label: "下部", value: "bottom" },
] as const;

const audioModes = [
  { label: "元の音声を保持", value: "keep" },
  { label: "BGMで置換", value: "replace" },
  { label: "BGMをミックス", value: "mix" },
  { label: "ミュート（無音）", value: "mute" },
] as const;

const qualityPresets = [
  { label: "高画質", value: "high", videoBitrate: "8000k", audioBitrate: "192k" },
  { label: "標準", value: "standard", videoBitrate: "4000k", audioBitrate: "128k" },
  { label: "軽量", value: "compact", videoBitrate: "2000k", audioBitrate: "96k" },
] as const;

/* ── Component ────────────────────────────────────── */

export default function SnsCreatorPage() {
  const { load, loaded, loading, loadProgress, progress, error, exec, writeFile, readFile } =
    useFFmpeg();

  // Files
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [bgmFiles, setBgmFiles] = useState<File[]>([]);

  // Settings
  const [platform, setPlatform] = useState<string>("tiktok");
  const [cropPosition, setCropPosition] = useState("center");
  const [startTime, setStartTime] = useState("0");
  const [endTime, setEndTime] = useState("");
  const [audioMode, setAudioMode] = useState<string>("keep");
  const [originalVolume, setOriginalVolume] = useState(30);
  const [bgmVolume, setBgmVolume] = useState(70);
  const [quality, setQuality] = useState<string>("standard");

  // Video preview
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Process state
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  const selectedPlatform = platforms.find((p) => p.id === platform)!;
  const selectedQuality = qualityPresets.find((q) => q.value === quality)!;
  const needsBgm = audioMode === "replace" || audioMode === "mix";

  const handleVideoChange = useCallback((files: File[]) => {
    setVideoFiles(files);
    setResult(null);
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setVideoUrl(url);
    } else {
      setVideoUrl("");
      setDuration(0);
      setEndTime("");
    }
  }, []);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      if (!endTime) setEndTime(dur.toFixed(1));
    }
  };

  /* ── Build & run FFmpeg command ─────────────────── */

  const handleProcess = async () => {
    if (videoFiles.length === 0) return;
    if (needsBgm && bgmFiles.length === 0) return;
    setProcessing(true);

    try {
      const video = videoFiles[0];
      const inputVideo = "input" + getExtension(video.name);
      const outputName = "output.mp4";

      await writeFile(inputVideo, await fetchFile(video));

      // Write BGM if needed
      let inputBgm = "";
      if (needsBgm && bgmFiles.length > 0) {
        inputBgm = "bgm" + getExtension(bgmFiles[0].name);
        await writeFile(inputBgm, await fetchFile(bgmFiles[0]));
      }

      const args: string[] = [];

      // Trim: seek before input for speed
      const ss = parseFloat(startTime) || 0;
      const to = parseFloat(endTime) || 0;
      if (ss > 0) args.push("-ss", String(ss));
      if (to > 0 && to > ss) args.push("-to", String(to));

      // Input files
      args.push("-i", inputVideo);
      if (inputBgm) args.push("-i", inputBgm);

      // Video filter: scale + crop to 9:16
      let cropY = "(in_h-out_h)/2";
      if (cropPosition === "top") cropY = "0";
      if (cropPosition === "bottom") cropY = "in_h-out_h";
      const vf = `scale=${selectedPlatform.width}:${selectedPlatform.height}:force_original_aspect_ratio=increase,crop=${selectedPlatform.width}:${selectedPlatform.height}:(in_w-out_w)/2:${cropY}`;
      args.push("-vf", vf);

      // Audio handling
      if (audioMode === "mute") {
        args.push("-an");
      } else if (audioMode === "replace" && inputBgm) {
        args.push("-map", "0:v", "-map", "1:a", "-shortest");
      } else if (audioMode === "mix" && inputBgm) {
        const origVol = (originalVolume / 100).toFixed(2);
        const bgmVol = (bgmVolume / 100).toFixed(2);
        args.push(
          "-filter_complex",
          `[0:a]volume=${origVol}[a0];[1:a]volume=${bgmVol}[a1];[a0][a1]amix=inputs=2:duration=first[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
        );
      }
      // "keep" → no special audio args, FFmpeg copies original

      // Encoding
      args.push(
        "-c:v", "libx264",
        "-preset", "fast",
        "-b:v", selectedQuality.videoBitrate,
        "-maxrate", selectedQuality.videoBitrate,
      );

      if (audioMode !== "mute") {
        args.push("-c:a", "aac", "-b:a", selectedQuality.audioBitrate);
      }

      args.push("-movflags", "+faststart", "-y", outputName);

      await exec(args);

      const data = await readFile(outputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      const baseName = video.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}_${platform}.mp4` });
    } catch (err) {
      console.error("SNS video creation failed:", err);
      alert("動画の作成に失敗しました。もう一度お試しください。");
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
    setVideoFiles([]);
    setBgmFiles([]);
    setResult(null);
    setVideoUrl("");
    setDuration(0);
    setStartTime("0");
    setEndTime("");
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
        <Smartphone className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">SNS動画クリエイター</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        TikTok・Instagram Reels・YouTube Shorts向けの縦動画を作成。クロップ・トリミング・BGM追加をまとめて処理します。すべてブラウザ内で完結。
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
          {/* ── Platform ──────────────────────────── */}
          <div>
            <label className="text-sm font-medium mb-2 block">プラットフォーム</label>
            <div className="grid grid-cols-3 gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    platform === p.id
                      ? "border-primary bg-primary/10"
                      : "hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.width}x{p.height} ・ {p.note}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Video file ────────────────────────── */}
          <FileDropzone
            accept="video/*,.mp4,.mov,.avi,.webm,.mkv"
            files={videoFiles}
            onFilesChange={handleVideoChange}
            label="動画ファイルをここにドロップ"
            description="MP4・MOV・AVI・WebMに対応"
          />

          {/* ── Video preview ─────────────────────── */}
          {videoUrl && (
            <div className="rounded-xl border overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={handleVideoLoaded}
                className="w-full max-h-[360px]"
              />
            </div>
          )}

          {videoFiles.length > 0 && (
            <div className="space-y-6">
              {/* ── Crop position ─────────────────── */}
              <div>
                <label className="text-sm font-medium mb-2 block">クロップ位置</label>
                <div className="flex gap-2">
                  {cropPositions.map((pos) => (
                    <button
                      key={pos.value}
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

              {/* ── Trim ──────────────────────────── */}
              {duration > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    トリミング
                    <span className="text-xs text-muted-foreground ml-2">
                      再生時間: {formatTime(duration)} / {selectedPlatform.note}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        開始（秒）
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
                      <label className="text-xs text-muted-foreground mb-1 block">
                        終了（秒）
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
                  {parseFloat(endTime) - parseFloat(startTime) > selectedPlatform.maxDuration && (
                    <p className="text-xs text-destructive mt-1">
                      {selectedPlatform.label}の上限（{selectedPlatform.maxDuration}秒）を超えています
                    </p>
                  )}
                </div>
              )}

              {/* ── Audio ─────────────────────────── */}
              <div>
                <label className="text-sm font-medium mb-2 block">オーディオ</label>
                <div className="grid grid-cols-2 gap-2">
                  {audioModes.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setAudioMode(m.value)}
                      className={`rounded-lg border p-2.5 text-sm transition-colors ${
                        audioMode === m.value
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── BGM upload ────────────────────── */}
              {needsBgm && (
                <div>
                  <label className="text-sm font-medium mb-2 block">BGM / 音声ファイル</label>
                  <FileDropzone
                    accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg,.flac"
                    files={bgmFiles}
                    onFilesChange={setBgmFiles}
                    label="音声ファイルをここにドロップ"
                    description="MP3・WAV・AAC・M4A・OGG・FLACに対応"
                  />
                </div>
              )}

              {/* ── Volume mix ────────────────────── */}
              {audioMode === "mix" && bgmFiles.length > 0 && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">音量バランス</p>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>元の音声</span>
                      <span className="text-muted-foreground">{originalVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={originalVolume}
                      onChange={(e) => setOriginalVolume(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>BGM</span>
                      <span className="text-muted-foreground">{bgmVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgmVolume}
                      onChange={(e) => setBgmVolume(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              )}

              {/* ── Quality ──────────────────────── */}
              <div>
                <label className="text-sm font-medium mb-2 block">画質</label>
                <div className="flex gap-2">
                  {qualityPresets.map((q) => (
                    <button
                      key={q.value}
                      onClick={() => setQuality(q.value)}
                      className={`flex-1 rounded-lg border p-2 text-sm transition-colors ${
                        quality === q.value
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Progress ─────────────────────────── */}
          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                動画を作成中... {progress}%
              </p>
            </div>
          )}

          {/* ── Submit ───────────────────────────── */}
          <Button
            onClick={handleProcess}
            disabled={
              videoFiles.length === 0 ||
              (needsBgm && bgmFiles.length === 0) ||
              processing
            }
            className="w-full"
            size="lg"
          >
            {processing
              ? "処理中..."
              : `${selectedPlatform.label}用の動画を作成`}
          </Button>
        </div>
      )}

      {/* ── Result ──────────────────────────────── */}
      {result && (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">
              {selectedPlatform.label}用の動画が完成しました！
            </p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              動画をダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他の動画を作成する
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────── */

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : ".mp4";
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}
