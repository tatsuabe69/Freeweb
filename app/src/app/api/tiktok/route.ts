import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/tiktok
 * TikTokのURLから使用されている音源のメタデータを取得する
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !isTikTokUrl(url)) {
      return NextResponse.json(
        { error: "有効なTikTokのURLを入力してください" },
        { status: 400 },
      );
    }

    // TikTokページを取得（サーバー側なのでCORS制限なし）
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "TikTokページの取得に失敗しました" },
        { status: 502 },
      );
    }

    const html = await res.text();

    // __UNIVERSAL_DATA_FOR_REHYDRATION__ から JSON を抽出
    const match = html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!match) {
      return NextResponse.json(
        { error: "ページデータの解析に失敗しました。TikTokの仕様が変更された可能性があります。" },
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

    // 音源データを掘り出す
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

    return NextResponse.json({
      music: {
        title: music.title ?? "不明",
        author: music.authorName ?? "不明",
        duration: music.duration ?? 0,
        coverUrl: music.coverLarge ?? music.coverMedium ?? music.coverThumb ?? "",
        playUrl: music.playUrl,
      },
    });
  } catch (err) {
    console.error("TikTok API error:", err);
    return NextResponse.json(
      { error: "音源情報の取得中にエラーが発生しました" },
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
