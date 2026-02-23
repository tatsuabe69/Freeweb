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
 *
 * モード1 (従来): { url, filename }
 *   → CDN URLをプロキシしてダウンロード
 *
 * モード2 (統合): { tiktokVideoUrl }
 *   → TikTokページ取得→音源URL抽出→CDNダウンロードを1リクエストで完結
 *   → Cookie/セッションが途切れないため確実にダウンロードできる
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // モード2: TikTok動画URLから直接音源を抽出
    if (body.tiktokVideoUrl) {
      return await handleExtract(body.tiktokVideoUrl);
    }

    // モード1: CDN URLをプロキシ (後方互換)
    return await handleProxy(body.url, body.filename, body.cookies);
  } catch (err) {
    console.error("TikTok download error:", err);
    return NextResponse.json(
      { error: `ダウンロード中にエラーが発生しました: ${String(err)}` },
      { status: 500 },
    );
  }
}

/** モード2: ページ取得→解析→ダウンロードを一括で行う */
async function handleExtract(videoUrl: string) {
  // Step 1: TikTokページを取得
  const pageRes = await fetch(videoUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });

  if (!pageRes.ok) {
    return NextResponse.json(
      { error: `TikTokページの取得に失敗 (HTTP ${pageRes.status})` },
      { status: 502 },
    );
  }

  // Cookie収集
  let cookieStr = "";
  try {
    const raw =
      typeof pageRes.headers.getSetCookie === "function"
        ? pageRes.headers.getSetCookie()
        : [];
    cookieStr = raw
      .map((c: string) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");
  } catch {
    // Cookie取得失敗は無視して続行
  }

  const html = await pageRes.text();

  // Step 2: メタデータ抽出
  const match = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) {
    return NextResponse.json(
      { error: "ページデータの解析に失敗しました" },
      { status: 502 },
    );
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return NextResponse.json(
      { error: "ページデータのパースに失敗しました" },
      { status: 502 },
    );
  }

  const scope = data.__DEFAULT_SCOPE__ as Record<string, unknown> | undefined;
  const detail = scope?.["webapp.video-detail"] as Record<string, unknown> | undefined;
  const itemInfo = detail?.itemInfo as Record<string, unknown> | undefined;
  const itemStruct = itemInfo?.itemStruct as Record<string, unknown> | undefined;
  const music = itemStruct?.music as Record<string, unknown> | undefined;

  if (!music?.playUrl) {
    return NextResponse.json(
      { error: "この動画から音源が見つかりませんでした" },
      { status: 404 },
    );
  }

  const playUrl = music.playUrl as string;
  const title = (music.title as string) ?? "不明";
  const author = (music.authorName as string) ?? "不明";
  const duration = (music.duration as number) ?? 0;

  if (!isAllowedDomain(playUrl)) {
    return NextResponse.json(
      { error: `不明なCDNドメインです` },
      { status: 400 },
    );
  }

  // Step 3: 同一セッションで音源ダウンロード
  const buffer = await downloadFromCdn(playUrl, cookieStr);
  if (!buffer) {
    return NextResponse.json(
      { error: "CDNから音源をダウンロードできませんでした" },
      { status: 502 },
    );
  }

  const safeName = sanitizeFilename(`${title} - ${author}`) + ".mp3";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(buffer.byteLength),
      "X-Music-Title": encodeURIComponent(title),
      "X-Music-Author": encodeURIComponent(author),
      "X-Music-Duration": String(duration),
      "Access-Control-Expose-Headers":
        "X-Music-Title, X-Music-Author, X-Music-Duration",
    },
  });
}

/** モード1: CDN URLを直接プロキシ (後方互換) */
async function handleProxy(
  url: string | undefined,
  filename: string | undefined,
  cookies: string | undefined,
) {
  if (!url || !isAllowedDomain(url)) {
    return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
  }

  const buffer = await downloadFromCdn(url, cookies || "");
  if (!buffer) {
    return NextResponse.json(
      { error: "音源のダウンロードに失敗しました" },
      { status: 502 },
    );
  }

  const safeName = sanitizeFilename(filename || "tiktok_sound") + ".mp3";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}

/** CDNから音源をダウンロード（ヘッダーを変えて最大3回リトライ） */
async function downloadFromCdn(
  playUrl: string,
  cookieStr: string,
): Promise<ArrayBuffer | null> {
  const baseHeaders: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
  };
  if (cookieStr) {
    baseHeaders["Cookie"] = cookieStr;
  }

  const headerVariants: Record<string, string>[] = [
    {
      ...baseHeaders,
      Referer: "https://www.tiktok.com/",
      Origin: "https://www.tiktok.com",
    },
    { ...baseHeaders },
    { "User-Agent": UA },
  ];

  for (const headers of headerVariants) {
    try {
      const res = await fetch(playUrl, { headers, redirect: "follow" });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0) return buf;
      }
    } catch {
      // 接続エラー → 次のヘッダーパターンで再試行
    }
  }

  return null;
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
  return name
    .replace(/[^\w\u3000-\u9FFF\u4E00-\u9FFF\uFF00-\uFFEF -]/g, "_")
    .slice(0, 100);
}
