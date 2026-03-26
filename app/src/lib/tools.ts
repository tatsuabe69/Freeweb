import {
  Merge,
  Scissors,
  Minimize2,
  RotateCw,
  Image,
  FileImage,
  ArrowUpDown,
  Trash2,
  Film,
  Music,
  Smartphone,
  Copy,
  FileSpreadsheet,
  FileText,
  MonitorPlay,
  EyeOff,
  Eraser,
  QrCode,
  Droplets,
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
  /*  0 */ { title: "PDF 結合",       href: "/pdf/merge",         icon: Merge,        color: "#8b5cf6", category: "PDF",  description: "複数のPDFファイルを1つに結合。ページ順の並び替えも可能。", related: [1, 6], steps: ["結合したいPDFをドロップ", "ドラッグで順番を調整", "結合してダウンロード"] },
  /*  1 */ { title: "PDF 分割",       href: "/pdf/split",         icon: Scissors,     color: "#3b82f6", category: "PDF",  description: "PDFを指定ページで分割。不要なページを削除して軽量化。", related: [0, 6], steps: ["PDFファイルをアップロード", "分割するページ範囲を指定", "分割してダウンロード"] },
  /*  2 */ { title: "PDF 圧縮",       href: "/pdf/compress",      icon: Minimize2,    color: "#10b981", category: "PDF",  description: "画質を保ちながらファイルサイズを削減。メール添付に最適。", related: [0, 1], steps: ["PDFをドロップ", "圧縮レベルを選択", "軽量化してダウンロード"] },
  /*  3 */ { title: "PDF 回転",       href: "/pdf/rotate",        icon: RotateCw,     color: "#f59e0b", category: "PDF",  description: "スキャンしたPDFの向きを90°/180°/270°で修正。", related: [6, 4], steps: ["PDFをアップロード", "回転角度を選択", "修正してダウンロード"] },
  /*  4 */ { title: "PDF → 画像",     href: "/pdf/to-image",      icon: Image,        color: "#f43f5e", category: "PDF",  description: "PDFの各ページをPNG/JPEG画像に変換。SNS投稿にも。", related: [5, 2], steps: ["PDFをアップロード", "出力形式を選択", "画像をダウンロード"] },
  /*  5 */ { title: "画像 → PDF",     href: "/pdf/from-image",    icon: FileImage,    color: "#6366f1", category: "PDF",  description: "複数の画像をまとめて1つのPDFドキュメントに変換。", related: [4, 0], steps: ["画像ファイルを追加", "順番を調整", "PDFに変換"] },
  /*  6 */ { title: "PDF 並び替え",   href: "/pdf/reorder",       icon: ArrowUpDown,  color: "#d946ef", category: "PDF",  description: "ドラッグ&ドロップでPDFのページ順を自由に変更。", related: [0, 1], steps: ["PDFをアップロード", "ページをドラッグで並び替え", "保存してダウンロード"] },
  /*  7 */ { title: "PDF ページ削除", href: "/pdf/delete",        icon: Trash2,       color: "#ef4444", category: "PDF",  description: "プレビューを見ながら不要なページを選択して削除。", related: [1, 6], steps: ["PDFをアップロード", "削除するページを選択", "保存してダウンロード"] },
  /*  8 */ { title: "PDF 黒塗り",    href: "/pdf/redact",        icon: EyeOff,       color: "#1e293b", category: "PDF",  description: "プレビュー上でドラッグして黒塗り範囲を指定。個人情報や機密情報を隠せます。", related: [7, 1], steps: ["PDFをアップロード", "黒塗り範囲をドラッグで指定", "保存してダウンロード"] },
  /*  9 */ { title: "動画圧縮",       href: "/video/compress",    icon: Minimize2,    color: "#0ea5e9", category: "動画", description: "画質を維持しつつファイルサイズを大幅圧縮。共有しやすく。", related: [11, 15], steps: ["動画をアップロード", "圧縮品質を選択", "圧縮してダウンロード"] },
  /* 10 */ { title: "動画 → GIF",     href: "/video/to-gif",      icon: Film,         color: "#84cc16", category: "動画", description: "動画の一部をアニメーションGIFに変換。チャットやSNSに。", related: [11, 9], steps: ["動画をアップロード", "切り出す範囲を選択", "GIFに変換"] },
  /* 11 */ { title: "動画トリミング", href: "/video/trim",        icon: Scissors,     color: "#f97316", category: "動画", description: "開始・終了時間を指定して動画の不要部分をカット。", related: [9, 10], steps: ["動画をアップロード", "開始・終了をスライダーで指定", "トリミングしてダウンロード"] },
  /* 12 */ { title: "音声抽出",       href: "/video/audio",       icon: Music,        color: "#ec4899", category: "動画", description: "動画からMP3/WAV/AAC形式で音声だけを抽出・保存。", related: [14, 9], steps: ["動画をアップロード", "音声形式を選択", "音声をダウンロード"] },
  /* 13 */ { title: "SNS動画作成",    href: "/video/sns",         icon: Smartphone,   color: "#6b7280", category: "動画", description: "複数クリップ編集・テロップ・BGMを1画面で。SNS投稿用の縦動画を作成。", related: [11, 14], steps: ["動画クリップを追加", "テロップ・BGMを設定", "SNS向けに書き出し"] },
  /* 14 */ { title: "音源取得",       href: "/video/sound",       icon: Music,        color: "#06b6d4", category: "動画", description: "TikTok・YouTube・Instagramの動画URLから音源（BGM・楽曲）を取得。プラットフォームを選んでURLを貼るだけ。", related: [12, 13], steps: ["プラットフォームを選択", "URLを貼り付け", "音源をダウンロード"] },
  /* 15 */ { title: "H.264変換",      href: "/video/h264",        icon: MonitorPlay,  color: "#7c3aed", category: "動画", description: "動画をH.264（MP4）に変換。Zoom画面共有やプレゼン用途に最適。", related: [9, 11], steps: ["動画をアップロード", "プロファイル・画質を選択", "H.264に変換"] },
  /* 16 */ { title: "AI背景透過",     href: "/tools/bg-remove",   icon: Eraser,       color: "#ec4899", category: "画像", description: "ブラウザ内AIが画像・動画の背景を自動削除。画像/動画を選んでアップロードするだけ。", related: [17, 4], steps: ["画像 or 動画を選択", "AIが自動処理", "結果をダウンロード"] },
  /* 17 */ { title: "QRコード生成",   href: "/image/qr-code",     icon: QrCode,       color: "#2563eb", category: "画像", description: "URL・テキストからQRコードを即座に生成。クリップボードにコピーしてそのまま貼り付け。", related: [16, 18], steps: ["テキストやURLを入力", "QRコードを自動生成", "画像をコピー"] },
  /* 18 */ { title: "画像透明度調整", href: "/image/opacity",      icon: Droplets,    color: "#0891b2", category: "画像", description: "画像の透明度をスライダーで調整。PNG形式で出力するため透明度が保持されます。", related: [16, 17], steps: ["画像をアップロード", "スライダーで透明度を調整", "PNGでダウンロード"] },
  /* 19 */ { title: "スライド複製",   href: "/google/slides-copy", icon: Copy,        color: "#fbbc04", category: "Google", description: "テンプレートのGoogleスライドを複数チーム分まとめてコピー。研修準備を効率化。", related: [20, 21], steps: ["スライドURLを入力", "チーム名を設定", "まとめてコピー作成"] },
  /* 20 */ { title: "スプレッドシート複製", href: "/google/sheets-copy", icon: FileSpreadsheet, color: "#0f9d58", category: "Google", description: "テンプレートのGoogleスプレッドシートを複数チーム分まとめてコピー。研修準備を効率化。", related: [19, 21], steps: ["スプレッドシートURLを入力", "チーム名を設定", "まとめてコピー作成"] },
  /* 21 */ { title: "ドキュメント複製", href: "/google/docs-copy",  icon: FileText,    color: "#4285f4", category: "Google", description: "テンプレートのGoogleドキュメントを複数チーム分まとめてコピー。研修準備を効率化。", related: [19, 20], steps: ["ドキュメントURLを入力", "チーム名を設定", "まとめてコピー作成"] },
];

export function getCategoryTools(category: string) {
  return tools.filter((it) => it.category === category).map(({ title, href, icon, color }) => ({ title, href, icon, color }));
}
