import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * POST /api/youtube/download
 * YouTubeのURLから音声ストリームを取得してプロキシ
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !isYouTubeUrl(url)) {
      return NextResponse.json(
        { error: "有効なYouTubeのURLを入力してください" },
        { status: 400 },
      );
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "YouTubeの動画IDを取得できませんでした" },
        { status: 400 },
      );
    }

    // Fetch the YouTube page to get player response
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `YouTubeページの取得に失敗 (HTTP ${pageRes.status})` },
        { status: 502 },
      );
    }

    const html = await pageRes.text();

    // Extract ytInitialPlayerResponse
    const playerMatch = html.match(
      /var ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});/,
    );
    if (!playerMatch) {
      return NextResponse.json(
        { error: "YouTube動画データの解析に失敗しました" },
        { status: 502 },
      );
    }

    let playerData: Record<string, unknown>;
    try {
      playerData = JSON.parse(playerMatch[1]);
    } catch {
      return NextResponse.json(
        { error: "YouTubeデータのパースに失敗しました" },
        { status: 502 },
      );
    }

    // Get video details
    const videoDetails = playerData.videoDetails as Record<string, unknown> | undefined;
    const title = (videoDetails?.title as string) ?? "YouTube音源";
    const author = (videoDetails?.author as string) ?? "不明";

    // Get streaming data
    const streamingData = playerData.streamingData as Record<string, unknown> | undefined;
    const adaptiveFormats = (streamingData?.adaptiveFormats ?? []) as Array<Record<string, unknown>>;

    // Find best audio-only stream (prefer m4a/mp4a, then webm/opus)
    const audioFormats = adaptiveFormats
      .filter((f) => {
        const mime = (f.mimeType as string) ?? "";
        return mime.startsWith("audio/");
      })
      .sort((a, b) => {
        const aBit = (a.averageBitrate as number) ?? (a.bitrate as number) ?? 0;
        const bBit = (b.averageBitrate as number) ?? (b.bitrate as number) ?? 0;
        return bBit - aBit; // highest bitrate first
      });

    if (audioFormats.length === 0) {
      return NextResponse.json(
        { error: "この動画から音声ストリームが見つかりませんでした。年齢制限または非公開の動画の可能性があります。" },
        { status: 404 },
      );
    }

    // Try formats until one works
    const audioUrl = (audioFormats[0].url as string) ?? null;
    if (!audioUrl) {
      // URL might be cipher-protected
      return NextResponse.json(
        { error: "この動画の音声URLは保護されているため取得できませんでした。別の動画をお試しください。" },
        { status: 403 },
      );
    }

    // Download the audio
    const audioRes = await fetch(audioUrl, {
      headers: {
        "User-Agent": UA,
        Referer: "https://www.youtube.com/",
        Origin: "https://www.youtube.com",
      },
    });

    if (!audioRes.ok) {
      return NextResponse.json(
        { error: `音声のダウンロードに失敗 (HTTP ${audioRes.status})` },
        { status: 502 },
      );
    }

    const buffer = await audioRes.arrayBuffer();
    if (buffer.byteLength === 0) {
      return NextResponse.json(
        { error: "音声データが空です" },
        { status: 502 },
      );
    }

    const mime = (audioFormats[0].mimeType as string) ?? "audio/mp4";
    const contentType = mime.includes("webm") ? "audio/webm" : "audio/mp4";
    const fileExt = contentType === "audio/webm" ? ".webm" : ".m4a";

    const safeName = sanitizeFilename(`${title} - ${author}`) + fileExt;
    const encodedName = encodeURIComponent(safeName);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="youtube_audio${fileExt}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(buffer.byteLength),
        "X-Music-Title": encodeURIComponent(title),
        "X-Music-Author": encodeURIComponent(author),
        "Access-Control-Expose-Headers": "X-Music-Title, X-Music-Author",
      },
    });
  } catch (err) {
    console.error("YouTube download error:", err);
    return NextResponse.json(
      { error: `YouTube音源の取得中にエラーが発生しました: ${String(err)}` },
      { status: 500 },
    );
  }
}

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\u3000-\u9FFF\u4E00-\u9FFF\uFF00-\uFFEF -]/g, "_")
    .slice(0, 100);
}
