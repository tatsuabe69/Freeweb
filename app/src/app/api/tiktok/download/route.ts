import { NextRequest, NextResponse } from "next/server";

/** TikTok CDN のドメインホワイトリスト（SSRF 対策） */
const ALLOWED_DOMAINS = [
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokcdn-eu.com",
  "musical.ly",
  "muscdn.com",
  "ibytedtos.com",
  "bytecdn.cn",
  "bytedapm.com",
  "byteicdn.com",
  "byteoversea.com",
];

/**
 * POST /api/tiktok/download
 * TikTok CDN の音源URLをプロキシしてダウンロードさせる
 */
export async function POST(request: NextRequest) {
  try {
    const { url, filename } = await request.json();

    if (!url || !isAllowedDomain(url)) {
      return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        Referer: "https://www.tiktok.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "音源のダウンロードに失敗しました" },
        { status: 502 },
      );
    }

    const buffer = await res.arrayBuffer();
    const safeName = sanitizeFilename(filename || "tiktok_sound") + ".mp3";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    console.error("TikTok download error:", err);
    return NextResponse.json(
      { error: "ダウンロード中にエラーが発生しました" },
      { status: 500 },
    );
  }
}

function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some((d) => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\u3000-\u9FFF\u4E00-\u9FFF\uFF00-\uFFEF -]/g, "_").slice(0, 100);
}
