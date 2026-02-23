"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { usePdfThumbnails } from "@/hooks/use-pdf-thumbnails";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  ArrowUpDown,
  ArrowLeft,
  Trash2,
  RotateCcw,
  Loader2,
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PageInfo {
  id: string;
  index: number;
  label: string;
  deleted: boolean;
}

function SortablePageCard({
  page,
  thumbnail,
  onToggleDelete,
}: {
  page: PageInfo;
  thumbnail: string | undefined;
  onToggleDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, disabled: page.deleted });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : page.deleted ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col items-center rounded-lg border bg-card p-2 transition-shadow ${
        isDragging ? "shadow-xl ring-2 ring-primary" : "hover:shadow-md"
      } ${page.deleted ? "border-dashed" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className={`w-full cursor-grab active:cursor-grabbing ${
          page.deleted ? "pointer-events-none" : ""
        }`}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={page.label}
            className={`w-full rounded border bg-white object-contain ${
              page.deleted ? "grayscale" : ""
            }`}
            draggable={false}
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center rounded border bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <span
        className={`mt-1 text-xs font-medium ${
          page.deleted ? "line-through text-muted-foreground" : ""
        }`}
      >
        {page.label}
      </span>
      <button
        onClick={onToggleDelete}
        className="absolute -top-2 -right-2 rounded-full border bg-background p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={page.deleted ? "ページを復元" : "ページを削除"}
      >
        {page.deleted ? (
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        )}
      </button>
    </div>
  );
}

export default function PdfReorderPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { thumbnails, loading: thumbnailsLoading } = usePdfThumbnails(
    files.length === 1 ? files[0] : null,
    180
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    setLoaded(false);
    if (newFiles.length === 1) {
      try {
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const count = pdf.getPageCount();
        setPages(
          Array.from({ length: count }, (_, i) => ({
            id: `page-${i}`,
            index: i,
            label: `ページ ${i + 1}`,
            deleted: false,
          }))
        );
        setLoaded(true);
      } catch {
        setPages([]);
      }
    } else {
      setPages([]);
    }
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = pages.findIndex((p) => p.id === active.id);
        const newIndex = pages.findIndex((p) => p.id === over.id);
        setPages(arrayMove(pages, oldIndex, newIndex));
      }
    },
    [pages]
  );

  const toggleDelete = useCallback(
    (index: number) => {
      const newPages = [...pages];
      newPages[index] = {
        ...newPages[index],
        deleted: !newPages[index].deleted,
      };
      setPages(newPages);
    },
    [pages]
  );

  const handleSave = async () => {
    if (files.length !== 1) return;
    setProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      const activePages = pages.filter((p) => !p.deleted);
      for (let i = 0; i < activePages.length; i++) {
        const [page] = await newPdf.copyPages(sourcePdf, [
          activePages[i].index,
        ]);
        newPdf.addPage(page);
        setProgress(Math.round(((i + 1) / activePages.length) * 100));
      }

      const pdfBytes = await newPdf.save();
      setResult(pdfBytes);
    } catch (error) {
      console.error("Reorder failed:", error);
      alert(
        "PDFの並び替えに失敗しました。ファイルを確認してもう一度お試しください。"
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
    a.download = "reordered.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setPages([]);
    setLoaded(false);
    setProgress(0);
  };

  const activeCount = pages.filter((p) => !p.deleted).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> ツール一覧に戻る
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg bg-primary/10 p-2">
          <ArrowUpDown className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">PDF 並び替え</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        PDFのページを並び替え・削除します。すべての処理はブラウザ内で完結します。
      </p>

      {!result ? (
        <div className="space-y-6">
          {!loaded && (
            <FileDropzone
              accept=".pdf,application/pdf"
              files={files}
              onFilesChange={handleFilesChange}
              label="PDFファイルをここにドロップ"
              description="またはクリックして選択"
            />
          )}

          {loaded && pages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {pages.length}ページ —
                  ドラッグで並び替え、ホバーでゴミ箱ボタン表示
                </p>
                {thumbnailsLoading && (
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
                  items={pages.map((p) => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {pages.map((page, idx) => (
                      <SortablePageCard
                        key={page.id}
                        page={page}
                        thumbnail={thumbnails[page.index]}
                        onToggleDelete={() => toggleDelete(idx)}
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
                処理中... {progress}%
              </p>
            </div>
          )}

          {loaded && (
            <Button
              onClick={handleSave}
              disabled={activeCount === 0 || processing}
              className="w-full"
              size="lg"
            >
              {processing
                ? "処理中..."
                : `PDFを保存（${activeCount}ページ）`}
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <p className="text-lg font-medium mb-4">
              並び替えが完了しました！
            </p>
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              並び替え済みPDFをダウンロード
            </Button>
          </div>
          <Button variant="outline" onClick={reset}>
            他のファイルを並び替える
          </Button>
        </div>
      )}
    </div>
  );
}
