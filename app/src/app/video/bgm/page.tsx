"use client";

import { useState } from "react";
import { fetchFile } from "@ffmpeg/util";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { FFmpegLoader } from "@/components/ffmpeg-loader";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Volume2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const audioModes = [
  { label: "BGMで置換", value: "replace", description: "元の音声をBGMに入れ替え" },
  { label: "ミックス", value: "mix", description: "元の音声とBGMを合成" },
  { label: "BGMのみ", value: "bgm-only", description: "元の音声を消してBGMだけ" },
] as const;

export default function BgmPage() {
  const { load, loaded, loading, loadProgress, progress, error, exec, writeFile, readFile } =
    useFFmpeg();
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [audioMode, setAudioMode] = useState<string>("replace");
  const [originalVolume, setOriginalVolume] = useState(30);
  const [bgmVolume, setBgmVolume] = useState(70);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  const handleProcess = async () => {
    if (videoFiles.length === 0 || audioFiles.length === 0) return;
    setProcessing(true);

    try {
      const video = videoFiles[0];
      const audio = audioFiles[0];
      const inputVideo = "input" + getExtension(video.name);
      const inputAudio = "bgm" + getExtension(audio.name);
      const outputName = "output.mp4";

      await writeFile(inputVideo, await fetchFile(video));
      await writeFile(inputAudio, await fetchFile(audio));

      const args: string[] = ["-i", inputVideo, "-i", inputAudio];

      if (audioMode === "mix") {
        const origVol = (originalVolume / 100).toFixed(2);
        const bgmVol = (bgmVolume / 100).toFixed(2);
        args.push(
          "-filter_complex",
          `[0:a]volume=${origVol}[a0];[1:a]volume=${bgmVol}[a1];[a0][a1]amix=inputs=2:duration=first[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
        );
      } else {
        // replace or bgm-only: use BGM audio track
        args.push("-map", "0:v", "-map", "1:a", "-shortest");
      }

      args.push(
        "-c:v", "libx264",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-y", outputName,
      );

      await exec(args);

      const data = await readFile(outputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      const baseName = video.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}_bgm.mp4` });
    } catch (err) {
      console.error("BGM addition failed:", err);
      alert("BGMの追加に失敗しました。もう一度お試しください。");
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
    setVideoFiles([]);
    setAudioFiles([]);
    setResult(null);
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
        <Volume2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">BGM追加</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        動画にBGMや音声ファイルを追加します。すべての処理はブラウザ内で完結します。
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
          <div>
            <label className="text-sm font-medium mb-2 block">動画ファイル</label>
            <FileDropzone
              accept="video/*,.mp4,.mov,.avi,.webm,.mkv"
              files={videoFiles}
              onFilesChange={setVideoFiles}
              label="動画ファイルをここにドロップ"
              description="MP4・MOV・AVI・WebMに対応"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">BGM / 音声ファイル</label>
            <FileDropzone
              accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg,.flac"
              files={audioFiles}
              onFilesChange={setAudioFiles}
              label="音声ファイルをここにドロップ"
              description="MP3・WAV・AAC・M4A・OGG・FLACに対応"
            />
          </div>

          {videoFiles.length > 0 && audioFiles.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">オーディオモード</label>
                <div className="grid grid-cols-3 gap-2">
                  {audioModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setAudioMode(mode.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        audioMode === mode.value
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{mode.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {mode.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {audioMode === "mix" && (
                <div className="space-y-3 rounded-lg border p-4">
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
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                BGM追加中... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleProcess}
            disabled={videoFiles.length === 0 || audioFiles.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "処理中..." : "BGMを追加する"}
          </Button>
        </div>
      )}

      {result && (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">BGMの追加が完了しました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              動画をダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他の動画にBGMを追加する
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
