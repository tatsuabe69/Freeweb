import Link from "next/link";
import {
  Merge,
  Scissors,
  Minimize2,
  RotateCw,
  Image,
  FileImage,
  ArrowUpDown,
  Film,
  Ratio,
  Music,
  Smartphone,
  Volume2,
  ExternalLink,
} from "lucide-react";

const tools = [
  {
    title: "PDF 結合",
    href: "/pdf/merge",
    icon: Merge,
    color: "from-violet-500 to-purple-600",
    bg: "group-hover:bg-violet-500",
  },
  {
    title: "PDF 分割",
    href: "/pdf/split",
    icon: Scissors,
    color: "from-blue-500 to-cyan-500",
    bg: "group-hover:bg-blue-500",
  },
  {
    title: "PDF 圧縮",
    href: "/pdf/compress",
    icon: Minimize2,
    color: "from-emerald-500 to-teal-500",
    bg: "group-hover:bg-emerald-500",
  },
  {
    title: "PDF 回転",
    href: "/pdf/rotate",
    icon: RotateCw,
    color: "from-amber-500 to-orange-500",
    bg: "group-hover:bg-amber-500",
  },
  {
    title: "PDF → 画像",
    href: "/pdf/to-image",
    icon: Image,
    color: "from-rose-500 to-pink-500",
    bg: "group-hover:bg-rose-500",
  },
  {
    title: "画像 → PDF",
    href: "/pdf/from-image",
    icon: FileImage,
    color: "from-indigo-500 to-blue-600",
    bg: "group-hover:bg-indigo-500",
  },
  {
    title: "PDF 並び替え",
    href: "/pdf/reorder",
    icon: ArrowUpDown,
    color: "from-fuchsia-500 to-purple-500",
    bg: "group-hover:bg-fuchsia-500",
  },
  {
    title: "動画圧縮",
    href: "/video/compress",
    icon: Minimize2,
    color: "from-sky-500 to-blue-500",
    bg: "group-hover:bg-sky-500",
  },
  {
    title: "動画 → GIF",
    href: "/video/to-gif",
    icon: Film,
    color: "from-lime-500 to-green-500",
    bg: "group-hover:bg-lime-500",
  },
  {
    title: "動画トリミング",
    href: "/video/trim",
    icon: Scissors,
    color: "from-orange-500 to-red-500",
    bg: "group-hover:bg-orange-500",
  },
  {
    title: "SNSアスペクト比",
    href: "/video/aspect",
    icon: Ratio,
    color: "from-teal-500 to-cyan-500",
    bg: "group-hover:bg-teal-500",
  },
  {
    title: "音声抽出",
    href: "/video/audio",
    icon: Music,
    color: "from-pink-500 to-rose-500",
    bg: "group-hover:bg-pink-500",
  },
  {
    title: "SNS動画作成",
    href: "/video/sns",
    icon: Smartphone,
    color: "from-gray-800 to-black",
    bg: "group-hover:bg-gray-800",
  },
  {
    title: "BGM追加",
    href: "/video/bgm",
    icon: Volume2,
    color: "from-purple-500 to-indigo-600",
    bg: "group-hover:bg-purple-500",
  },
  {
    title: "TikTok音源取得",
    href: "/video/tiktok-sound",
    icon: ExternalLink,
    color: "from-cyan-500 to-teal-500",
    bg: "group-hover:bg-cyan-500",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-6 lg:px-10">
      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-24 lg:pb-16">
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
          Anything.
        </h1>
        <p className="mt-3 text-base md:text-lg text-muted-foreground">
          PDF・動画・画像 — なんでも、ブラウザだけで。
        </p>
      </section>

      {/* Tool Grid */}
      <section className="pb-20 lg:pb-28">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <div className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border/40 bg-card p-6 cursor-pointer transition-all duration-300 hover:border-transparent hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1 dark:hover:shadow-black/20">
                {/* Icon */}
                <div
                  className={`flex items-center justify-center w-14 h-14 rounded-xl bg-muted transition-all duration-300 ${tool.bg} group-hover:scale-110`}
                >
                  <tool.icon className="h-6 w-6 text-muted-foreground transition-colors duration-300 group-hover:text-white" />
                </div>
                {/* Label */}
                <span className="text-sm font-medium text-center leading-tight">
                  {tool.title}
                </span>
                {/* Gradient glow on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none`}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
