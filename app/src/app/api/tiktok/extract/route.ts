import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/tiktok/extract
 *
 * TikTok動画URLから音源を 1リクエストで 抽出してバイナリ返却する。
 * ページ取得→メタデータ解析→CDN音源ダウンロードを同一サーバーセッション内で
 * 行うため、Cookie/署名URL期限切れ問題を回避できる。
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

function err(message: string, status = 502) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  /* ── リクエスト解析 ───────────────────────── */
  let url: string;
  try {
    const body = await request.json();
    url = body.url;
  } catch (e) {
    return err(`リクエストの解析に失敗: ${String(e)}`, 400);
  }

  if (!url || !isTikTokUrl(url)) {
    return err("有効なTikTokのURLを入力してください", 400);
  }

  /* ── Step 1: TikTokページを取得 ──────────── */
  let html: string;
  let cookieStr = "";
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    // Cookie収集 (getSetCookie が無い環境でも安全)
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
      // Cookie取得に失敗しても続行
    }

    if (!pageRes.ok) {
      return err(`TikTokページの取得に失敗 (HTTP ${pageRes.status})`);
    }

    html = await pageRes.text();
  } catch (e) {
    return err(`TikTokへの接続に失敗: ${String(e)}`);
  }

  /* ── Step 2: メタデータ抽出 ──────────────── */
  let playUrl: string;
  let title: string;
  let author: string;
  let duration: number;
  try {
    const match = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!match) {
      return err("ページデータの解析に失敗しました（scriptタグが見つかりません）");
    }

    const data = JSON.parse(match[1]);
    const music =
      data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct
        ?.music;

    if (!music?.playUrl) {
      return err("この動画から音源が見つかりませんでした", 404);
    }

    playUrl = music.playUrl;
    title = music.title ?? "不明";
    author = music.authorName ?? "不明";
    duration = music.duration ?? 0;
  } catch (e) {
    return err(`メタデータの解析に失敗: ${String(e)}`);
  }

  // SSRF対策
  if (!isAllowedCdn(playUrl)) {
    return err(`不明なCDNドメインです: ${new URL(playUrl).hostname}`, 400);
  }

  /* ── Step 3: 音源ダウンロード ────────────── */
  let buffer: ArrayBuffer;
  try {
    const baseHeaders: Record<string, string> = {
      "User-Agent": UA,
      Accept: "*/*",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    };
    if (cookieStr) {
      baseHeaders["Cookie"] = cookieStr;
    }

    // ヘッダーパターンを順番に試行
    const headerVariants: Record<string, string>[] = [
      { ...baseHeaders, Referer: "https://www.tiktok.com/", Origin: "https://www.tiktok.com" },
      { ...baseHeaders },
      { "User-Agent": UA },
    ];

    let audioRes: Response | null = null;
    let lastStatus = 0;

    for (const headers of headerVariants) {
      try {
        const res = await fetch(playUrl, { headers, redirect: "follow" });
        lastStatus = res.status;
        if (res.ok) {
          audioRes = res;
          break;
        }
      } catch {
        // このヘッダーパターンでは接続エラー → 次を試行
      }
    }

    if (!audioRes) {
      return err(`CDNから音源をダウンロードできませんでした (最後のステータス: ${lastStatus}, URL host: ${new URL(playUrl).hostname})`);
    }

    buffer = await audioRes.arrayBuffer();
  } catch (e) {
    return err(`音源のダウンロード中にエラー: ${String(e)}`);
  }

  if (buffer.byteLength === 0) {
    return err("音源データが空でした (0 bytes)");
  }

  /* ── レスポンス返却 ──────────────────────── */
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
