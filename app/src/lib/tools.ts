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
  Youtube,
  Instagram,
  Copy,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from "lucide-react";

export interface ToolItem {
  title: string;
  href: string;
  icon: LucideIcon;
  color: string;
  category: string;
  description: string;
  related: number[];
  steps: string[];
}

export const tools: ToolItem[] = [
  { title: "PDF 結合",       href: "/pdf/merge",         icon: Merge,        color: "#8b5cf6", category: "PDF",  description: "複数のPDFファイルを1つに結合。ページ順の並び替えも可能。", related: [1, 6], steps: ["結合したいPDFをドロップ", "ドラッグで順番を調整", "結合してダウンロード"] },
  { title: "PDF 分割",       href: "/pdf/split",         icon: Scissors,     color: "#3b82f6", category: "PDF",  description: "PDFを指定ページで分割。不要なページを削除して軽量化。", related: [0, 6], steps: ["PDFファイルをアップロード", "分割するページ範囲を指定", "分割してダウンロード"] },
  { title: "PDF 圧縮",       href: "/pdf/compress",      icon: Minimize2,    color: "#10b981", category: "PDF",  description: "画質を保ちながらファイルサイズを削減。メール添付に最適。", related: [0, 1], steps: ["PDFをドロップ", "圧縮レベルを選択", "軽量化してダウンロード"] },
  { title: "PDF 回転",       href: "/pdf/rotate",        icon: RotateCw,     color: "#f59e0b", category: "PDF",  description: "スキャンしたPDFの向きを90°/180°/270°で修正。", related: [6, 4], steps: ["PDFをアップロード", "回転角度を選択", "修正してダウンロード"] },
  { title: "PDF → 画像",     href: "/pdf/to-image",      icon: Image,        color: "#f43f5e", category: "PDF",  description: "PDFの各ページをPNG/JPEG画像に変換。SNS投稿にも。", related: [5, 2], steps: ["PDFをアップロード", "出力形式を選択", "画像をダウンロード"] },
  { title: "画像 → PDF",     href: "/pdf/from-image",    icon: FileImage,    color: "#6366f1", category: "PDF",  description: "複数の画像をまとめて1つのPDFドキュメントに変換。", related: [4, 0], steps: ["画像ファイルを追加", "順番を調整", "PDFに変換"] },
  { title: "PDF 並び替え",   href: "/pdf/reorder",       icon: ArrowUpDown,  color: "#d946ef", category: "PDF",  description: "ドラッグ&ドロップでPDFのページ順を自由に変更。", related: [0, 1], steps: ["PDFをアップロード", "ページをドラッグで並び替え", "保存してダウンロード"] },
  { title: "動画圧縮",       href: "/video/compress",    icon: Minimize2,    color: "#0ea5e9", category: "動画", description: "画質を維持しつつファイルサイズを大幅圧縮。共有しやすく。", related: [9, 12], steps: ["動画をアップロード", "圧縮品質を選択", "圧縮してダウンロード"] },
  { title: "動画 → GIF",     href: "/video/to-gif",      icon: Film,         color: "#84cc16", category: "動画", description: "動画の一部をアニメーションGIFに変換。チャットやSNSに。", related: [9, 7], steps: ["動画をアップロード", "切り出す範囲を選択", "GIFに変換"] },
  { title: "動画トリミング", href: "/video/trim",        icon: Scissors,     color: "#f97316", category: "動画", description: "開始・終了時間を指定して動画の不要部分をカット。", related: [12, 7], steps: ["動画をアップロード", "開始・終了をスライダーで指定", "トリミングしてダウンロード"] },
  { title: "SNSアスペクト比", href: "/video/aspect",     icon: Ratio,        color: "#14b8a6", category: "動画", description: "TikTok・Reels・Shorts向けに9:16等のアスペクト比に変換。", related: [12, 9], steps: ["動画をアップロード", "プラットフォームを選択", "変換してダウンロード"] },
  { title: "音声抽出",       href: "/video/audio",       icon: Music,        color: "#ec4899", category: "動画", description: "動画からMP3/WAV/AAC形式で音声だけを抽出・保存。", related: [13, 14], steps: ["動画をアップロード", "音声形式を選択", "音声をダウンロード"] },
  { title: "SNS動画作成",    href: "/video/sns",         icon: Smartphone,   color: "#6b7280", category: "動画", description: "複数クリップ編集・テロップ・BGMを1画面で。SNS投稿用の縦動画を作成。", related: [10, 13], steps: ["動画クリップを追加", "テロップ・BGMを設定", "SNS向けに書き出し"] },
  { title: "BGM追加",        href: "/video/bgm",         icon: Volume2,      color: "#a855f7", category: "動画", description: "動画に音楽を追加。元音声とのミックスや置換も対応。", related: [12, 11], steps: ["動画をアップロード", "音楽ファイルを追加", "ミックスしてダウンロード"] },
  { title: "TikTok音源取得", href: "/video/tiktok-sound", icon: ExternalLink, color: "#06b6d4", category: "動画", description: "TikTok動画のURLから使用されている音源を取得・保存。", related: [15, 16], steps: ["TikTokのURLを貼り付け", "音源情報を確認", "MP3でダウンロード"] },
  { title: "YouTube音源取得", href: "/video/youtube-sound", icon: Youtube, color: "#ff0000", category: "動画", description: "YouTube動画のURLから音声（BGM・楽曲・ナレーション）を抽出・保存。", related: [14, 16], steps: ["YouTubeのURLを貼り付け", "音源を自動取得", "M4A/WebMでダウンロード"] },
  { title: "Instagram音源取得", href: "/video/instagram-sound", icon: Instagram, color: "#e1306c", category: "動画", description: "Instagramリール・動画投稿のURLから音源を取得・保存。", related: [14, 15], steps: ["InstagramのURLを貼り付け", "音源を自動取得", "MP4でダウンロード"] },
  { title: "スライド複製", href: "/google/slides-copy", icon: Copy, color: "#fbbc04", category: "Google", description: "テンプレートのGoogleスライドを複数チーム分まとめてコピー。研修準備を効率化。", related: [18, 19], steps: ["スライドURLを入力", "チーム名を設定", "まとめてコピー作成"] },
  { title: "スプレッドシート複製", href: "/google/sheets-copy", icon: FileSpreadsheet, color: "#0f9d58", category: "Google", description: "テンプレートのGoogleスプレッドシートを複数チーム分まとめてコピー。研修準備を効率化。", related: [17, 19], steps: ["スプレッドシートURLを入力", "チーム名を設定", "まとめてコピー作成"] },
  { title: "ドキュメント複製", href: "/google/docs-copy", icon: FileText, color: "#4285f4", category: "Google", description: "テンプレートのGoogleドキュメントを複数チーム分まとめてコピー。研修準備を効率化。", related: [17, 18], steps: ["ドキュメントURLを入力", "チーム名を設定", "まとめてコピー作成"] },
];

export function getCategoryTools(category: string) {
  return tools.filter((it) => it.category === category).map(({ title, href, icon, color }) => ({ title, href, icon, color }));
}
