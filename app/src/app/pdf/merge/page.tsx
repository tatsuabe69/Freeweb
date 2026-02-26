"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { usePdfFirstPages } from "@/hooks/use-pdf-first-pages";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  Merge,
  ArrowLeft,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FileItem {
  id: string;
  file: File;
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function SortableFileCard({
  item,
  thumbnail,
  onRemove,
}: {
  item: FileItem;
  thumbnail: string | undefined;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow ${
        isDragging ? "shadow-xl ring-2 ring-primary" : "hover:shadow-md"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={item.file.name}
            className="h-16 w-12 rounded border bg-white object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-16 w-12 items-center justify-center rounded border bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(item.file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        aria-label="ファイルを削除"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export default function PdfMergePage() {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);

  const files = fileItems.map((item) => item.file);
  const { thumbnails, loading: thumbLoading } = usePdfFirstPages(files);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleFilesChange = (newFiles: File[]) => {
    setResult(null);
    setFileItems(
      newFiles.map((f, i) => ({
        id: `file-${fileKey(f)}-${i}`,
        file: f,
      }))
    );
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = fileItems.findIndex((item) => item.id === active.id);
        const newIndex = fileItems.findIndex((item) => item.id === over.id);
        setFileItems(arrayMove(fileItems, oldIndex, newIndex));
      }
    },
    [fileItems]
  );

  const removeFile = useCallback(
    (index: number) => {
      setFileItems(fileItems.filter((_, i) => i !== index));
    },
    [fileItems]
  );

  const handleMerge = async () => {
    if (fileItems.length < 2) return;
    setProcessing(true);
    setProgress(0);

    try {
      const mergedPdf = await PDFDocument.create();
      for (let i = 0; i < fileItems.length; i++) {
        const arrayBuffer = await fileItems[i].file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
        setProgress(Math.round(((i + 1) / fileItems.length) * 100));
      }
      const pdfBytes = await mergedPdf.save();
      setResult(pdfBytes);
    } catch (error) {
      console.error("Merge failed:", error);
      alert(
        "PDFの結合に失敗しました。ファイルを確認してもう一度お試しください。"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.buffer as ArrayBuffer], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFileItems([]);
    setResult(null);
    setProgress(0);
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
        <Merge className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">PDF 結合</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        複数のPDFファイルを1つのドキュメントに結合します。すべての処理はブラウザ内で完結します。
      </p>

      {!result ? (
        <div className="space-y-6">
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple
            files={files}
            onFilesChange={handleFilesChange}
            label="PDFファイルをここにドロップ"
            description="またはクリックして選択 — 2つ以上のPDFを追加してください"
          />

          {fileItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {fileItems.length}個のファイル —
                  ドラッグで結合順を変更
                </p>
                {thumbLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    プレビュー生成中...
                  </span>
                )}
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fileItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {fileItems.map((item, idx) => (
                      <SortableFileCard
                        key={item.id}
                        item={item}
                        thumbnail={thumbnails.get(fileKey(item.file))}
                        onRemove={() => removeFile(idx)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {processing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                結合中... {progress}%
              </p>
            </div>
          )}

          <Button
            onClick={handleMerge}
            disabled={fileItems.length < 2 || processing}
            className="w-full"
            size="lg"
          >
            {processing
              ? "結合中..."
              : `${fileItems.length}個のPDFを結合`}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-6 lg:p-8">
            <p className="text-lg font-medium mb-4">結合が完了しました！</p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              結合済みPDFをダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他のファイルを結合する
          </Button>
        </div>
      )}
    </div>
  );
}
