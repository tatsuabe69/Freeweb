"use client";

import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    setLoadProgress(0);

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      ffmpeg.on("log", ({ message }) => {
        setLogMessages((prev) => [...prev.slice(-50), message]);
      });

      const coreURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, "text/javascript");
      setLoadProgress(33);
      const wasmURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, "application/wasm");
      setLoadProgress(66);
      const workerURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.worker.js`, "text/javascript");
      setLoadProgress(90);

      await ffmpeg.load({ coreURL, wasmURL, workerURL });
      setLoadProgress(100);
      setLoaded(true);
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      throw error;
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
    logMessages,
    exec,
    writeFile,
    readFile,
    deleteFile,
  };
}
