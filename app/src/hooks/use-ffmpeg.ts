"use client";

import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    setLoadProgress(0);
    setError(null);

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      ffmpeg.on("log", ({ message }) => {
        setLogMessages((prev) => [...prev.slice(-50), message]);
      });

      // Load from local public/ffmpeg/ (same-origin, no CORS issues)
      const coreURL = await toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript");
      setLoadProgress(50);
      const wasmURL = await toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm");
      setLoadProgress(90);

      await ffmpeg.load({ coreURL, wasmURL });
      setLoadProgress(100);
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load FFmpeg:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        `動画エンジンの読み込みに失敗しました: ${msg}`
      );
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  const exec = useCallback(
    async (args: string[]) => {
      if (!ffmpegRef.current) throw new Error("FFmpeg not loaded");
      setProgress(0);
      await ffmpegRef.current.exec(args);
    },
    []
  );

  const writeFile = useCallback(
    async (name: string, data: Uint8Array) => {
      if (!ffmpegRef.current) throw new Error("FFmpeg not loaded");
      await ffmpegRef.current.writeFile(name, data);
    },
    []
  );

  const readFile = useCallback(async (name: string) => {
    if (!ffmpegRef.current) throw new Error("FFmpeg not loaded");
    const data = await ffmpegRef.current.readFile(name);
    return data as Uint8Array;
  }, []);

  const deleteFile = useCallback(async (name: string) => {
    if (!ffmpegRef.current) throw new Error("FFmpeg not loaded");
    await ffmpegRef.current.deleteFile(name);
  }, []);

  return {
    load,
    loaded,
    loading,
    loadProgress,
    progress,
    error,
    logMessages,
    exec,
    writeFile,
    readFile,
    deleteFile,
  };
}
