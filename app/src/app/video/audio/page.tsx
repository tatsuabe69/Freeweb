"use client";

import { useState } from "react";
import { fetchFile } from "@ffmpeg/util";
import { useFFmpeg } from "@/hooks/use-ffmpeg";
import { FFmpegLoader } from "@/components/ffmpeg-loader";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Music, ArrowLeft } from "lucide-react";
import Link from "next/link";

const formatOptions = [
  { label: "MP3", value: "mp3", mime: "audio/mpeg", codec: "libmp3lame" },
  { label: "WAV", value: "wav", mime: "audio/wav", codec: "pcm_s16le" },
  { label: "AAC", value: "aac", mime: "audio/aac", codec: "aac" },
] as const;

const bitrateOptions = [
  { label: "128 kbps", value: "128k" },
  { label: "192 kbps", value: "192k" },
  { label: "256 kbps", value: "256k" },
  { label: "320 kbps", value: "320k" },
] as const;

export default function AudioExtractPage() {
  const { load, loaded, loading, loadProgress, progress, exec, writeFile, readFile } =
    useFFmpeg();
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<string>("mp3");
  const [bitrate, setBitrate] = useState("192k");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  const handleExtract = async () => {
    if (files.length === 0) return;
    setProcessing(true);

    try {
      const file = files[0];
      const inputName = "input" + getExtension(file.name);
      const fmt = formatOptions.find((f) => f.value === format)!;
      const outputName = `output.${fmt.value}`;

      await writeFile(inputName, await fetchFile(file));

      const args = [
        "-i", inputName,
        "-vn", // no video
        "-c:a", fmt.codec,
      ];

      // WAV doesn't use bitrate
      if (format !== "wav") {
        args.push("-b:a", bitrate);
      }

      args.push("-y", outputName);

      await exec(args);

      const data = await readFile(outputName);
      const blob = new Blob([data.buffer as ArrayBuffer], { type: fmt.mime });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setResult({ blob, name: `${baseName}.${fmt.value}` });
    } catch (error) {
      console.error("Audio extraction failed:", error);
      alert("音声の抽出に失敗しました。もう一度お試しください。");
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
        <Music className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">音声抽出</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        動画ファイルからMP3・WAV・AACとして音声を抽出します。すべての処理はブラウザ内で完結します。
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
                  出力形式
                </label>
                <div className="flex gap-2">
                  {formatOptions.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setFormat(fmt.value)}
                      className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
                        format === fmt.value
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {format !== "wav" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    ビットレート
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {bitrateOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setBitrate(opt.value)}
                        className={`rounded-lg border p-2 text-sm transition-colors ${
                          bitrate === opt.value
                            ? "border-primary bg-primary/10 font-medium"
                            : "hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                音声抽出中... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleExtract}
            disabled={files.length === 0 || processing}
            className="w-full"
            size="lg"
          >
            {processing
              ? "抽出中..."
              : `${format.toUpperCase()}として音声を抽出`}
          </Button>
        </div>
      )}

      {result && (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">音声の抽出が完了しました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              {format.toUpperCase()}をダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他の動画から抽出する
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
