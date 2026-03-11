const TOOLS = [
  { title: "PDF 結合",       href: "/pdf/merge",          emoji: "📎", color: "#8b5cf6", category: "PDF",    description: "複数PDFを1つに結合" },
  { title: "PDF 分割",       href: "/pdf/split",          emoji: "✂️", color: "#3b82f6", category: "PDF",    description: "ページ指定で分割" },
  { title: "PDF 圧縮",       href: "/pdf/compress",       emoji: "📦", color: "#10b981", category: "PDF",    description: "ファイルサイズを削減" },
  { title: "PDF 回転",       href: "/pdf/rotate",         emoji: "🔄", color: "#f59e0b", category: "PDF",    description: "ページの向きを修正" },
  { title: "PDF → 画像",     href: "/pdf/to-image",       emoji: "🖼️", color: "#f43f5e", category: "PDF",    description: "PDFを画像に変換" },
  { title: "画像 → PDF",     href: "/pdf/from-image",     emoji: "📄", color: "#6366f1", category: "PDF",    description: "画像からPDFを作成" },
  { title: "PDF 並び替え",   href: "/pdf/reorder",        emoji: "↕️", color: "#d946ef", category: "PDF",    description: "ページ順を変更" },
  { title: "動画圧縮",       href: "/video/compress",     emoji: "📦", color: "#0ea5e9", category: "動画",   description: "動画サイズを圧縮" },
  { title: "動画 → GIF",     href: "/video/to-gif",       emoji: "🎞️", color: "#84cc16", category: "動画",   description: "動画をGIFに変換" },
  { title: "動画トリミング", href: "/video/trim",          emoji: "✂️", color: "#f97316", category: "動画",   description: "不要部分をカット" },
  { title: "音声抽出",       href: "/video/audio",        emoji: "🎵", color: "#ec4899", category: "動画",   description: "動画から音声を抽出" },
  { title: "SNS動画作成",    href: "/video/sns",          emoji: "📱", color: "#6b7280", category: "動画",   description: "SNS向け縦動画を作成" },
  { title: "音源取得",       href: "/video/sound",        emoji: "🎧", color: "#06b6d4", category: "動画",   description: "URLから音源を取得" },
  { title: "H.264変換",      href: "/video/h264",         emoji: "🎬", color: "#7c3aed", category: "動画",   description: "H.264(MP4)に変換" },
  { title: "AI背景透過",     href: "/tools/bg-remove",    emoji: "🧹", color: "#ec4899", category: "画像",   description: "AIで背景を自動削除" },
  { title: "QRコード生成",   href: "/image/qr-code",      emoji: "📲", color: "#2563eb", category: "画像",   description: "URLからQRコードを生成" },
  { title: "スライド複製",   href: "/google/slides-copy", emoji: "📊", color: "#fbbc04", category: "Google", description: "Googleスライドをまとめてコピー" },
  { title: "スプレッドシート複製", href: "/google/sheets-copy", emoji: "📗", color: "#0f9d58", category: "Google", description: "Googleシートをまとめてコピー" },
  { title: "ドキュメント複製", href: "/google/docs-copy",  emoji: "📘", color: "#4285f4", category: "Google", description: "Googleドキュメントをまとめてコピー" },
];

const CATEGORIES = ["すべて", "PDF", "動画", "画像", "Google"];

let baseUrl = "";
let activeCategory = "すべて";

// --- Init ---
async function init() {
  const data = await chrome.storage.sync.get("baseUrl");
  baseUrl = (data.baseUrl || "").replace(/\/+$/, "");

  document.getElementById("setupBanner").classList.toggle("visible", !baseUrl);
  document.getElementById("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  renderTabs();
  renderTools();
}

// --- Tabs ---
function renderTabs() {
  const container = document.getElementById("tabs");
  container.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "tab" + (cat === activeCategory ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      activeCategory = cat;
      renderTabs();
      renderTools();
    });
    container.appendChild(btn);
  });
}

// --- Tool list ---
function renderTools() {
  const container = document.getElementById("toolList");
  container.innerHTML = "";
  const filtered = activeCategory === "すべて"
    ? TOOLS
    : TOOLS.filter((t) => t.category === activeCategory);

  filtered.forEach((tool) => {
    const item = document.createElement("div");
    item.className = "tool-item";
    item.innerHTML = `
      <div class="tool-icon" style="background:${tool.color}15; color:${tool.color}">
        ${tool.emoji}
      </div>
      <div class="tool-info">
        <div class="tool-title">${tool.title}</div>
        <div class="tool-desc">${tool.description}</div>
      </div>
    `;
    item.addEventListener("click", () => openTool(tool));
    container.appendChild(item);
  });
}

// --- Open tool in iframe ---
function openTool(tool) {
  if (!baseUrl) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const frame = document.getElementById("appFrame");
  frame.src = baseUrl + tool.href;

  document.getElementById("homeView").style.display = "none";
  document.getElementById("iframeWrap").classList.add("visible");
  document.getElementById("backBtn").classList.add("visible");
}

// --- Back to home ---
function showHome() {
  const frame = document.getElementById("appFrame");
  frame.src = "about:blank";

  document.getElementById("homeView").style.display = "";
  document.getElementById("iframeWrap").classList.remove("visible");
  document.getElementById("backBtn").classList.remove("visible");
}

// --- Listen for URL changes from options page ---
chrome.storage.onChanged.addListener((changes) => {
  if (changes.baseUrl) {
    baseUrl = (changes.baseUrl.newValue || "").replace(/\/+$/, "");
    document.getElementById("setupBanner").classList.toggle("visible", !baseUrl);
  }
});

init();
