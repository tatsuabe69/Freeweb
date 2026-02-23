import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/tiktok/extract
 *
 * TikTok動画URLから音源を **1リクエストで** 抽出してバイナリ返却する。
 * ページ取得→メタデータ解析→CDN音源ダウンロードを同一サーバーセッション内で
 * 行うため、Cookie/署名URL期限切れ問題を回避できる。
 *
 * Request:  { url: string }
 * Response: audio/mpeg binary
 *           X-Music-Title / X-Music-Author / X-Music-Duration ヘッダ付き
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ALLOWED_CDN_DOMAINS = [
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

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !isTikTokUrl(url)) {
      return NextResponse.json(
        { error: "有効なTikTokのURLを入力してください" },
        { status: 400 },
      );
    }

    /* ── Step 1: TikTokページを取得 ────────────── */
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    // CDN認証に使うCookieを収集
    const setCookies = pageRes.headers.getSetCookie?.() ?? [];
    const cookieStr = setCookies
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: "TikTokページの取得に失敗しました" },
        { status: 502 },
      );
    }

    const html = await pageRes.text();

    /* ── Step 2: メタデータ抽出 ─────────────────── */
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

    // SSRF対策: CDNドメインチェック
    if (!isAllowedCdn(playUrl)) {
      return NextResponse.json(
        { error: "不明なCDNドメインです" },
        { status: 400 },
      );
    }

    /* ── Step 3: 同一セッション内で音源をダウンロード ─ */
    const cdnHeaders: Record<string, string> = {
      "User-Agent": UA,
      Referer: "https://www.tiktok.com/",
      Origin: "https://www.tiktok.com",
      Accept: "*/*",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    };
    if (cookieStr) {
      cdnHeaders["Cookie"] = cookieStr;
    }

    // 試行1: フルヘッダー
    let audioRes = await fetch(playUrl, {
      headers: cdnHeaders,
      redirect: "follow",
    });

    // 試行2: Referer/Origin なし（一部CDNが拒否する場合）
    if (!audioRes.ok) {
      const { Referer: _r, Origin: _o, ...h } = cdnHeaders;
      audioRes = await fetch(playUrl, { headers: h, redirect: "follow" });
    }

    // 試行3: 最小ヘッダー
    if (!audioRes.ok) {
      audioRes = await fetch(playUrl, {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
    }

    if (!audioRes.ok) {
      console.error(
        "TikTok CDN download failed:",
        audioRes.status,
        audioRes.statusText,
        playUrl,
      );
      return NextResponse.json(
        { error: `音源のダウンロードに失敗しました (CDN ${audioRes.status})` },
        { status: 502 },
      );
    }

    const buffer = await audioRes.arrayBuffer();

    if (buffer.byteLength === 0) {
      return NextResponse.json(
        { error: "音源データが空でした" },
        { status: 502 },
      );
    }

    const safeName =
      sanitizeFilename(`${title} - ${author}`) + ".mp3";

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
  } catch (err) {
    console.error("TikTok extract error:", err);
    return NextResponse.json(
      { error: "音源の抽出中にエラーが発生しました" },
      { status: 500 },
    );
  }
}

function isTikTokUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /^(www\.|vm\.|vt\.)?tiktok\.com$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isAllowedCdn(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_CDN_DOMAINS.some((d) => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\u3000-\u9FFF\u4E00-\u9FFF\uFF00-\uFFEF -]/g, "_")
    .slice(0, 100);
}
