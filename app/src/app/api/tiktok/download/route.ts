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
  "tiktok.com",
  "tiktokv.com",
  "tiktokcdn-in.com",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * POST /api/tiktok/download
 * TikTok CDN の音源URLをプロキシしてダウンロードさせる
 */
export async function POST(request: NextRequest) {
  try {
    const { url, filename, cookies } = await request.json();

    if (!url || !isAllowedDomain(url)) {
      return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
    }

    // Build headers – pass along cookies from the initial TikTok page fetch
    const headers: Record<string, string> = {
      Referer: "https://www.tiktok.com/",
      Origin: "https://www.tiktok.com",
      "User-Agent": UA,
      Accept: "*/*",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    };
    if (cookies) {
      headers["Cookie"] = cookies;
    }

    // Attempt 1: with full headers
    let res = await fetch(url, { headers, redirect: "follow" });

    // Attempt 2: without Referer/Origin (some CDNs reject specific referrers)
    if (!res.ok) {
      const { Referer: _r, Origin: _o, ...minimalHeaders } = headers;
      res = await fetch(url, { headers: minimalHeaders, redirect: "follow" });
    }

    // Attempt 3: minimal headers
    if (!res.ok) {
      res = await fetch(url, {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
    }

    if (!res.ok) {
      console.error("TikTok CDN download failed:", res.status, res.statusText, url);
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
