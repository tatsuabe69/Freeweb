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
        <h3 className="font-semibold mb-1">Video Processing Engine</h3>
        <p className="text-sm text-muted-foreground">
          FFmpeg runs entirely in your browser. A one-time download (~25 MB) is
          required.
        </p>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Progress value={loadProgress} />
          <p className="text-sm text-muted-foreground">
            Loading engine... {loadProgress}%
          </p>
        </div>
      ) : (
        <Button onClick={onLoad} size="lg">
          Load Video Engine
        </Button>
      )}
    </div>
  );
}
