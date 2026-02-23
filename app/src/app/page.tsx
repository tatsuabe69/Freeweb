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
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {tools.map((tool) => (
        <Link key={tool.href} href={tool.href}>
          <Card className="group h-full border-border/60 transition-all duration-200 hover:border-primary/30 hover:shadow-sm cursor-pointer">
            <CardHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/8 p-2 transition-colors group-hover:bg-primary/12">
                  <tool.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm font-medium">
                    {tool.title}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
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
    <div className="mx-auto max-w-screen-2xl px-6 lg:px-10">
      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-4 font-normal">
            アップロード不要
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            ファイルは、あなたの
            <br />
            <span className="text-primary">ブラウザから出ません。</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
            無料・プライベート・無制限のファイル処理ツール。
            <br />
            広告なし。登録不要。アップロード不要。
          </p>
          <div className="flex flex-wrap gap-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                <feature.icon className="h-3.5 w-3.5 text-primary/70" />
                <span>{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF Tools */}
      <section className="pb-12 lg:pb-16">
        <div className="flex items-baseline gap-3 mb-5">
          <h2 className="text-lg font-semibold tracking-tight">PDFツール</h2>
          <span className="text-xs text-muted-foreground">ブラウザ内で完結</span>
        </div>
        <ToolGrid tools={pdfTools} />
      </section>

      {/* Video Tools */}
      <section className="pb-16 lg:pb-24">
        <div className="flex items-baseline gap-3 mb-5">
          <h2 className="text-lg font-semibold tracking-tight">動画ツール</h2>
          <span className="text-xs text-muted-foreground">FFmpeg搭載</span>
        </div>
        <ToolGrid tools={videoTools} />
      </section>

      {/* Trust */}
      <section className="border-t border-border/50 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          {features.map((feature) => (
            <div key={feature.title}>
              <div className="flex items-center gap-2 mb-2">
                <feature.icon className="h-4 w-4 text-primary/70" />
                <h3 className="text-sm font-medium">{feature.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
