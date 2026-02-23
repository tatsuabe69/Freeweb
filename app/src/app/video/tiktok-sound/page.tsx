"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Search, Music, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

interface MusicInfo {
  title: string;
  author: string;
  duration: number;
  coverUrl: string;
  playUrl: string;
}

export default function TikTokSoundPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [music, setMusic] = useState<MusicInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setMusic(null);

    try {
      const res = await fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "音源の取得に失敗しました");
        return;
      }

      setMusic(data.music);
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!music) return;
    setDownloading(true);

    try {
      const res = await fetch("/api/tiktok/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: music.playUrl,
          filename: `${music.title} - ${music.author}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "ダウンロードに失敗しました");
        return;
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${music.title} - ${music.author}.mp3`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError("ダウンロード中にエラーが発生しました");
    } finally {
      setDownloading(false);
    }
  };

  const reset = () => {
    setUrl("");
    setMusic(null);
    setError(null);
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
        <Music className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">TikTok音源取得</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        TikTok動画のリンクから使われている音源（BGM/サウンド）を取得します。取得した音源はそのままBGM追加やSNS動画クリエイターで利用できます。
      </p>

      {/* URL入力 */}
      {!music && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">TikTok動画のURL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleSearch();
                }}
                placeholder="https://www.tiktok.com/@user/video/..."
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60"
                disabled={loading}
              />
              <Button onClick={handleSearch} disabled={!url.trim() || loading} className="gap-2">
                <Search className="h-4 w-4" />
                {loading ? "検索中..." : "音源を検索"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              短縮URL（vm.tiktok.com）にも対応しています
            </p>
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-1.5 animate-pulse" />
              <p className="text-sm text-muted-foreground text-center">
                TikTokから音源情報を取得中...
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

      {/* 音源情報 + ダウンロード */}
      {music && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-start gap-4">
              {/* カバー画像 */}
              {music.coverUrl && (
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={music.coverUrl}
                    alt={music.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                </div>
              )}
              {/* メタデータ */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-medium truncate">{music.title}</h2>
                <p className="text-sm text-muted-foreground">{music.author}</p>
                {music.duration > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor(music.duration / 60)}:{String(music.duration % 60).padStart(2, "0")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                size="lg"
                className="gap-2 flex-1"
              >
                <Download className="h-5 w-5" />
                {downloading ? "ダウンロード中..." : "音源をダウンロード"}
              </Button>
            </div>
          </div>

          {/* 次のステップへの導線 */}
          <div className="rounded-xl border p-5 space-y-3">
            <p className="text-sm font-medium">この音源を使って動画を作成</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/video/sns" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  SNS動画クリエイター
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/video/bgm" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  BGM追加
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
