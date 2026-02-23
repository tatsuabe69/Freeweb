"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";

interface FFmpegLoaderProps {
  loaded: boolean;
  loading: boolean;
  loadProgress: number;
  onLoad: () => void;
}

export function FFmpegLoader({
  loaded,
  loading,
  loadProgress,
  onLoad,
}: FFmpegLoaderProps) {
  if (loaded) return null;

  return (
    <div className="rounded-xl border bg-card p-6 text-center space-y-4">
      <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
        <Download className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold mb-1">動画処理エンジン</h3>
        <p className="text-sm text-muted-foreground">
          FFmpegがブラウザ内で動作します。初回のみダウンロード（約25 MB）が必要です。
        </p>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Progress value={loadProgress} />
          <p className="text-sm text-muted-foreground">
            エンジン読み込み中... {loadProgress}%
          </p>
        </div>
      ) : (
        <Button onClick={onLoad} size="lg">
          動画エンジンを読み込む
        </Button>
      )}
    </div>
  );
}
