"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "@/components/file-dropzone";
import { Download, Eraser, UserRoundX, ArrowLeft, RotateCcw, Image as ImageIcon, Film } from "lucide-react";
import Link from "next/link";

type Mode = "image" | "video";
type BgMode = "transparent" | "green" | "white";

export default function BgRemovePage() {
  const [mode, setMode] = useState<Mode>("image");

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <Eraser className="h-5 w-5 text-[#ec4899]" />
        <h1 className="text-xl font-semibold tracking-tight">AI背景透過</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        ブラウザ内AIが背景を自動削除。サーバー送信なし、完全ローカル処理。
      </p>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setMode("image")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
            mode === "image"
              ? "border-[#ec4899]/40 bg-card shadow-md text-[#ec4899]"
              : "border-border/30 bg-card/30 text-muted-foreground hover:text-foreground hover:bg-card/60"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          画像
        </button>
        <button
          onClick={() => setMode("video")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
            mode === "video"
              ? "border-[#8b5cf6]/40 bg-card shadow-md text-[#8b5cf6]"
              : "border-border/30 bg-card/30 text-muted-foreground hover:text-foreground hover:bg-card/60"
          }`}
        >
          <Film className="h-4 w-4" />
          動画
        </button>
      </div>

      {mode === "image" ? <ImageBgRemove /> : <VideoBgRemove />}
    </div>
  );
}

/* ─── Image Background Removal ─── */
function ImageBgRemove() {
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
    if (resultUrlRef.current) { URL.revokeObjectURL(resultUrlRef.current); resultUrlRef.current = null; }
    if (f.length > 0) { setPreview(URL.createObjectURL(f[0])); } else { setPreview(null); }
  };

  const handleRemove = async () => {
    if (files.length === 0) return;
    setProcessing(true); setProgress(0); setStatusMsg("AIモデルを読み込み中...");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(files[0], {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) setProgress(Math.round((current / total) * 100));
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
    } finally { setProcessing(false); setStatusMsg(""); }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a"); a.href = result.url; a.download = result.name; a.click();
  };

  const reset = () => {
    setFiles([]); setResult(null); setPreview(null); setProgress(0);
    if (resultUrlRef.current) { URL.revokeObjectURL(resultUrlRef.current); resultUrlRef.current = null; }
  };

  return !result ? (
    <div className="space-y-6">
      <FileDropzone accept="image/*,.png,.jpg,.jpeg,.webp" files={files} onFilesChange={handleFilesChange} label="画像ファイルをここにドロップ" description="PNG・JPG・WebPに対応" />
      {preview && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-2">プレビュー</p>
          <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-lg object-contain" />
        </div>
      )}
      {processing && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground text-center">{statusMsg} {progress > 0 && `${progress}%`}</p>
          <p className="text-xs text-muted-foreground/60 text-center">初回はAIモデルのダウンロード（約40MB）に時間がかかります</p>
        </div>
      )}
      <Button onClick={handleRemove} disabled={files.length === 0 || processing} className="w-full" size="lg">
        {processing ? "処理中..." : "背景を削除"}
      </Button>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <p className="text-lg font-medium text-center mb-4">背景削除が完了しました！</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2 text-center">元画像</p>
            <div className="rounded-lg border overflow-hidden bg-muted/30">
              {preview && <img src={preview} alt="original" className="w-full max-h-64 object-contain" />}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 text-center">背景削除後</p>
            <div className="rounded-lg border overflow-hidden" style={{ backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)", backgroundSize: "16px 16px" }}>
              <img src={result.url} alt="result" className="w-full max-h-64 object-contain" />
            </div>
          </div>
        </div>
        <Button onClick={handleDownload} size="lg" className="w-full gap-2">
          <Download className="h-5 w-5" /> PNG画像をダウンロード
        </Button>
      </div>
      <Button variant="outline" onClick={reset} className="w-full">別の画像で試す</Button>
    </div>
  );
}

/* ─── Video Background Removal ─── */
function VideoBgRemove() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<BgMode>("green");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef(false);

  const handleFilesChange = (f: File[]) => {
    setFiles(f); setResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f.length > 0) { setPreviewUrl(URL.createObjectURL(f[0])); } else { setPreviewUrl(null); }
  };

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); if (result) URL.revokeObjectURL(result); };
  }, []);

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true); setProgress(0); abortRef.current = false;
    setStatusMsg("AIモデルを読み込み中...");

    try {
      const { ImageSegmenter, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      const segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite", delegate: "GPU" },
        runningMode: "VIDEO", outputCategoryMask: true,
      });

      setStatusMsg("動画を解析中...");
      const video = videoRef.current!;
      video.src = URL.createObjectURL(files[0]);
      video.muted = true; video.playsInline = true;
      await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve(); });

      const w = video.videoWidth, h = video.videoHeight, duration = video.duration, fps = 30;
      const canvas = canvasRef.current!; canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const outputCanvas = outputCanvasRef.current!; outputCanvas.width = w; outputCanvas.height = h;
      const outCtx = outputCanvas.getContext("2d", { willReadFrequently: true })!;

      const bgColor: [number, number, number, number] =
        bgMode === "green" ? [0, 177, 64, 255] : bgMode === "white" ? [255, 255, 255, 255] : [0, 0, 0, 0];

      const stream = outputCanvas.captureStream(fps);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const resultPromise = new Promise<string>((resolve) => {
        recorder.onstop = () => { resolve(URL.createObjectURL(new Blob(chunks, { type: mimeType }))); };
      });

      recorder.start();
      const totalFrames = Math.ceil(duration * fps);
      setStatusMsg("背景を削除中...");

      for (let i = 0; i < totalFrames; i++) {
        if (abortRef.current) break;
        const time = i / fps;
        video.currentTime = time;
        await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });
        ctx.drawImage(video, 0, 0, w, h);
        const timestamp = Math.round(time * 1000);
        const segResult = segmenter.segmentForVideo(canvas, timestamp);
        const imageData = ctx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
        const mask = segResult.categoryMask?.getAsFloat32Array();
        if (mask) {
          for (let j = 0; j < mask.length; j++) {
            const pixIdx = j * 4;
            if (mask[j] < 0.5) { pixels[pixIdx] = bgColor[0]; pixels[pixIdx + 1] = bgColor[1]; pixels[pixIdx + 2] = bgColor[2]; pixels[pixIdx + 3] = bgColor[3]; }
          }
        }
        segResult.close();
        outCtx.putImageData(imageData, 0, 0);
        setProgress(Math.round(((i + 1) / totalFrames) * 100));
      }

      recorder.stop(); segmenter.close();
      const resultUrl = await resultPromise;
      setResult(resultUrl); setStatusMsg("");
      URL.revokeObjectURL(video.src);
    } catch (err) {
      console.error("Video background removal failed:", err);
      alert("背景削除に失敗しました。動画が短すぎるか、ブラウザがサポートされていない可能性があります。");
    } finally { setProcessing(false); }
  }, [files, bgMode]);

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a"); a.href = result;
    a.download = `${files[0]?.name.replace(/\.[^.]+$/, "") ?? "video"}_nobg.webm`; a.click();
  };

  const reset = () => {
    abortRef.current = true; setFiles([]); setProcessing(false); setProgress(0); setStatusMsg("");
    if (result) URL.revokeObjectURL(result); setResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null);
  };

  const bgModes: { id: BgMode; label: string; desc: string }[] = [
    { id: "green", label: "グリーンバック", desc: "動画編集ソフトで合成" },
    { id: "transparent", label: "透過", desc: "WebM (VP9 alpha)" },
    { id: "white", label: "白背景", desc: "プレゼン・資料用" },
  ];

  return (
    <>
      {!result ? (
        <div className="space-y-6">
          <FileDropzone accept="video/*,.mp4,.mov,.webm,.avi" files={files} onFilesChange={handleFilesChange} label="動画ファイルをここにドロップ" description="MP4・MOV・WebM・AVIに対応（人物が映った動画推奨）" />
          {previewUrl && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-2">プレビュー</p>
              <video src={previewUrl} controls playsInline className="w-full max-h-64 rounded-lg object-contain bg-black" />
            </div>
          )}
          {files.length > 0 && !processing && (
            <div>
              <label className="text-sm font-medium mb-2 block">背景モード</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {bgModes.map((m) => (
                  <button key={m.id} onClick={() => setBgMode(m.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${bgMode === m.id ? "border-primary bg-primary/10" : "hover:border-primary/50"}`}>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">{statusMsg} {progress > 0 && `${progress}%`}</p>
              <p className="text-xs text-muted-foreground/60 text-center">動画の長さに応じて処理時間がかかります</p>
            </div>
          )}
          <Button onClick={handleProcess} disabled={files.length === 0 || processing} className="w-full" size="lg">
            {processing ? "処理中..." : "背景を削除"}
          </Button>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>注意:</strong> 人物特化のAIモデルを使用しているため、人が映った動画で最も効果的です。商品や動物の背景削除には対応していません。
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 sm:p-6 lg:p-8">
            <p className="text-lg font-medium text-center mb-4">背景削除が完了しました！</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">元動画</p>
                <div className="rounded-lg border overflow-hidden bg-black">
                  {previewUrl && <video src={previewUrl} controls playsInline muted className="w-full max-h-64 object-contain" />}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">背景削除後</p>
                <div className="rounded-lg border overflow-hidden" style={{
                  backgroundImage: bgMode === "transparent" ? "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)" : undefined,
                  backgroundSize: "16px 16px",
                  backgroundColor: bgMode === "green" ? "#00b140" : bgMode === "white" ? "#fff" : undefined,
                }}>
                  <video src={result} controls playsInline muted loop className="w-full max-h-64 object-contain" />
                </div>
              </div>
            </div>
            <Button onClick={handleDownload} size="lg" className="w-full gap-2">
              <Download className="h-5 w-5" /> WebM動画をダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset} className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> 別の動画で試す
          </Button>
        </div>
      )}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={outputCanvasRef} className="hidden" />
    </>
  );
}
