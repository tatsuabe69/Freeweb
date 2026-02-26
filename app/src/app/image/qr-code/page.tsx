"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, ArrowLeft, ClipboardCopy, Check, Download } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";

export default function QrCodePage() {
  const [text, setText] = useState("");
  const [size, setSize] = useState(512);
  const [fgColor, setFgColor] = useState("#000000");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = useCallback(async () => {
    if (!text.trim() || !canvasRef.current) return;
    try {
      await QRCode.toCanvas(canvasRef.current, text, {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: "#ffffff" },
      });
    } catch {
      // invalid input — ignore
    }
  }, [text, size, fgColor]);

  useEffect(() => {
    generate();
  }, [generate]);

  const handleCopy = async () => {
    if (!canvasRef.current || !text.trim()) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/png")
      );
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("コピーに失敗しました。ブラウザの権限設定をご確認ください。");
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current || !text.trim()) return;
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = "qrcode.png";
    a.click();
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <QrCode className="h-5 w-5 text-[#2563eb]" />
        <h1 className="text-xl font-semibold tracking-tight">QRコード生成</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        URL・テキストからQRコードを即座に生成。コピーしてそのまま貼り付け。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input area */}
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">
              テキスト / URL
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="https://example.com"
              rows={4}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 resize-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">サイズ</label>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <option value={256}>256 × 256</option>
                <option value={512}>512 × 512</option>
                <option value={1024}>1024 × 1024</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">色</label>
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-12 h-[38px] rounded-lg border border-border cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border bg-white p-4 inline-flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              style={{ width: 256, height: 256 }}
            />
          </div>

          {text.trim() && (
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                onClick={handleCopy}
                size="lg"
                className="flex-1 gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-4 w-4" />
                    画像をコピー
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownload}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
