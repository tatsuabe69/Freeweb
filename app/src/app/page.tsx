import Link from "next/link";
import {
  Merge,
  Scissors,
  Minimize2,
  RotateCw,
  Image,
  FileImage,
  ArrowUpDown,
  Shield,
  Zap,
  Ban,
  Film,
  Ratio,
  Music,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const pdfTools = [
  {
    title: "PDF 結合",
    description: "複数のPDFファイルを1つにまとめる",
    href: "/pdf/merge",
    icon: Merge,
  },
  {
    title: "PDF 分割",
    description: "PDFを複数のファイルに分ける",
    href: "/pdf/split",
    icon: Scissors,
  },
  {
    title: "PDF 圧縮",
    description: "PDFのファイルサイズを小さくする",
    href: "/pdf/compress",
    icon: Minimize2,
  },
  {
    title: "PDF 回転",
    description: "PDFのページを回転させる",
    href: "/pdf/rotate",
    icon: RotateCw,
  },
  {
    title: "PDF → 画像",
    description: "PDFの各ページをJPG・PNG・WebPに変換",
    href: "/pdf/to-image",
    icon: Image,
  },
  {
    title: "画像 → PDF",
    description: "画像をPDFドキュメントに変換",
    href: "/pdf/from-image",
    icon: FileImage,
  },
  {
    title: "PDF 並び替え",
    description: "ページの順番を入れ替え・削除",
    href: "/pdf/reorder",
    icon: ArrowUpDown,
  },
];

const videoTools = [
  {
    title: "動画圧縮",
    description: "Discord・LINE・Twitter向けに圧縮",
    href: "/video/compress",
    icon: Minimize2,
  },
  {
    title: "動画 → GIF",
    description: "動画をアニメーションGIFに変換",
    href: "/video/to-gif",
    icon: Film,
  },
  {
    title: "動画トリミング",
    description: "開始・終了時間を指定してカット",
    href: "/video/trim",
    icon: Scissors,
  },
  {
    title: "SNSアスペクト比",
    description: "TikTok・Instagram・YouTube向けにリサイズ",
    href: "/video/aspect",
    icon: Ratio,
  },
  {
    title: "音声抽出",
    description: "動画からMP3・WAV・AACを抽出",
    href: "/video/audio",
    icon: Music,
  },
];

const features = [
  {
    icon: Shield,
    title: "完全プライベート",
    description: "すべての処理はブラウザ内で完結。ファイルはどこにも送信されません。",
  },
  {
    icon: Ban,
    title: "広告なし・制限なし",
    description: "完全無料。透かし・ファイルサイズ制限・使用回数制限は一切ありません。",
  },
  {
    icon: Zap,
    title: "高速処理",
    description: "サーバーへの送信待ちなし。すべてローカルでフルスピード処理。",
  },
];

interface Tool {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function ToolGrid({ tools }: { tools: Tool[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
      {tools.map((tool) => (
        <Link key={tool.href} href={tool.href}>
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <tool.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {tool.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {tool.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            アップロード不要
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            ファイルは、あなたの
            <br />
            <span className="text-primary">ブラウザから出ません。</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            無料・プライベート・無制限のファイル処理ツール。
            <br />
            広告なし。登録不要。アップロード不要。
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
              >
                <feature.icon className="h-4 w-4 text-primary" />
                <span>{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF Tools Grid */}
      <section className="pb-12 md:pb-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">PDFツール</h2>
          <p className="text-muted-foreground text-center mb-8">
            すべての処理はブラウザ内で完結します
          </p>
          <ToolGrid tools={pdfTools} />
        </div>
      </section>

      {/* Video Tools Grid */}
      <section className="pb-16 md:pb-24">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">動画ツール</h2>
          <p className="text-muted-foreground text-center mb-8">
            FFmpeg搭載 — すべてブラウザ内で処理
          </p>
          <ToolGrid tools={videoTools} />
        </div>
      </section>

      {/* Trust Section */}
      <section className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
