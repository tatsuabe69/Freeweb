"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download, Search, Music, ArrowLeft, ArrowRight, AlertCircle,
  ExternalLink, Youtube, Instagram,
} from "lucide-react";
import Link from "next/link";

type Platform = "tiktok" | "youtube" | "instagram";

const platforms: { id: Platform; label: string; icon: typeof Youtube; color: string; placeholder: string; hint: string }[] = [
  { id: "tiktok", label: "TikTok", icon: ExternalLink, color: "#06b6d4", placeholder: "https://www.tiktok.com/@user/video/...", hint: "短縮URL（vm.tiktok.com）にも対応" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "#ff0000", placeholder: "https://www.youtube.com/watch?v=... または https://youtu.be/...", hint: "短縮URL（youtu.be）やモバイルURLにも対応" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#e1306c", placeholder: "https://www.instagram.com/reel/... または /p/...", hint: "公開されたリール・動画投稿のURLに対応" },
];

interface TikTokMusic { title: string; author: string; duration: number; coverUrl: string; playUrl: string }
interface GenericMusic { title: string; author: string; blob: Blob; ext?: string }

type MusicResult =
  | { platform: "tiktok"; data: TikTokMusic }
  | { platform: "youtube" | "instagram"; data: GenericMusic };

export default function SoundPage() {
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [music, setMusic] = useState<MusicResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlatform = platforms.find((p) => p.id === platform)!;
  const PlatformIcon = currentPlatform.icon;

  const handleSearch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setMusic(null);

    try {
      if (platform === "tiktok") {
        const res = await fetch("/api/tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "音源の取得に失敗しました"); return; }
        setMusic({ platform: "tiktok", data: data.music });
      } else if (platform === "youtube") {
        const res = await fetch("/api/youtube/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "音源の取得に失敗しました");
          return;
        }
        const ct = res.headers.get("Content-Type") ?? "";
        if (ct.includes("application/json")) {
          const data = await res.json() as { redirect?: string; title?: string; author?: string; error?: string };
          if (data.error) { setError(data.error); return; }
          if (data.redirect) {
            const dlRes = await fetch(data.redirect);
            if (!dlRes.ok) { setError("音源のダウンロードに失敗しました"); return; }
            const blob = await dlRes.blob();
            const dlCt = dlRes.headers.get("Content-Type") ?? "audio/mpeg";
            const ext = dlCt.includes("webm") ? ".webm" : dlCt.includes("mp4") ? ".m4a" : ".mp3";
            setMusic({ platform: "youtube", data: { title: data.title ?? "YouTube音源", author: data.author ?? "不明", blob, ext } });
            return;
          }
        }
        const title = decodeURIComponent(res.headers.get("X-Music-Title") ?? "YouTube音源");
        const author = decodeURIComponent(res.headers.get("X-Music-Author") ?? "不明");
        const ext = ct.includes("webm") ? ".webm" : ct.includes("mpeg") ? ".mp3" : ".m4a";
        const blob = await res.blob();
        setMusic({ platform: "youtube", data: { title, author, blob, ext } });
      } else {
        const res = await fetch("/api/instagram/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "音源の取得に失敗しました");
          return;
        }
        const title = decodeURIComponent(res.headers.get("X-Music-Title") ?? "Instagram音源");
        const author = decodeURIComponent(res.headers.get("X-Music-Author") ?? "不明");
        const blob = await res.blob();
        setMusic({ platform: "instagram", data: { title, author, blob } });
      }
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!music) return;
    if (music.platform === "tiktok") {
      setDownloading(true);
      try {
        const res = await fetch("/api/tiktok/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: music.data.playUrl, filename: `${music.data.title} - ${music.data.author}` }),
        });
        if (!res.ok) { setError("ダウンロードに失敗しました"); return; }
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${music.data.title} - ${music.data.author}.mp3`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch { setError("ダウンロード中にエラーが発生しました"); }
      finally { setDownloading(false); }
    } else {
      const d = music.data;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(d.blob);
      const ext = music.platform === "youtube" ? (d.ext ?? ".m4a") : ".mp4";
      a.download = `${d.title} - ${d.author}${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  const reset = () => {
    setUrl("");
    setMusic(null);
    setError(null);
  };

  const switchPlatform = (p: Platform) => {
    setPlatform(p);
    setUrl("");
    setMusic(null);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <Music className="h-5 w-5" style={{ color: currentPlatform.color }} />
        <h1 className="text-xl font-semibold tracking-tight">音源取得</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        SNS動画のリンクから音源（BGM・楽曲・ナレーション）を取得します。
      </p>

      {/* Platform tabs */}
      <div className="flex gap-2 mb-8">
        {platforms.map((p) => {
          const PIco = p.icon;
          const active = platform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => switchPlatform(p.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                active
                  ? "border-current bg-card shadow-md"
                  : "border-border/30 bg-card/30 text-muted-foreground hover:text-foreground hover:bg-card/60"
              }`}
              style={active ? { color: p.color, borderColor: p.color + "40" } : undefined}
            >
              <PIco className="h-4 w-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* URL input */}
      {!music && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{currentPlatform.label}動画のURL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleSearch(); }}
                placeholder={currentPlatform.placeholder}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60"
                disabled={loading}
              />
              <Button onClick={handleSearch} disabled={!url.trim() || loading} className="gap-2 shrink-0">
                <Search className="h-4 w-4" />
                {loading ? "取得中..." : "音源を取得"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{currentPlatform.hint}</p>
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-1.5 animate-pulse" />
              <p className="text-sm text-muted-foreground text-center">
                {currentPlatform.label}から音源を取得中...
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {music && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-start gap-4">
              {music.platform === "tiktok" && music.data.coverUrl ? (
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={music.data.coverUrl} alt={music.data.title} className="w-20 h-20 rounded-lg object-cover" />
                </div>
              ) : (
                <div className="shrink-0 w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: currentPlatform.color + "15" }}>
                  <Music className="h-7 w-7" style={{ color: currentPlatform.color }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-medium truncate">
                  {music.platform === "tiktok" ? music.data.title : music.data.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {music.platform === "tiktok" ? music.data.author : music.data.author}
                </p>
                {music.platform === "tiktok" && music.data.duration > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor(music.data.duration / 60)}:{String(music.data.duration % 60).padStart(2, "0")}
                  </p>
                )}
                {music.platform !== "tiktok" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {(music.data.blob.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <Button onClick={handleDownload} disabled={downloading} size="lg" className="w-full gap-2">
                <Download className="h-5 w-5" />
                {downloading ? "ダウンロード中..." : "音源をダウンロード"}
              </Button>
            </div>
          </div>

          {/* Next steps */}
          <div className="rounded-xl border p-5 space-y-3">
            <p className="text-sm font-medium">この音源を使って動画を作成</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/video/sns" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  SNS動画クリエイター
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/video/audio" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  音声抽出（MP3/WAV）
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button variant="outline" onClick={reset}>
            別の動画から音源を取得する
          </Button>
        </div>
      )}
    </div>
  );
}
