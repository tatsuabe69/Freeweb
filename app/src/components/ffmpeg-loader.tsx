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
    <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Download className="h-4 w-4 text-primary/70" />
        <div>
          <h3 className="text-sm font-medium">動画処理エンジン</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            FFmpegをブラウザに読み込みます（初回のみ 約25 MB）
          </p>
        </div>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <Progress value={loadProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            読み込み中... {loadProgress}%
          </p>
        </div>
      ) : (
        <Button onClick={onLoad} size="sm">
          エンジンを読み込む
        </Button>
      )}
    </div>
  );
}
