import { NextRequest, NextResponse } from "next/server";
import { Innertube } from "youtubei.js";

/**
 * POST /api/youtube/download
 * YouTubeのURLから音声ストリームを取得してプロキシ
 *
 * youtubei.js を使用して YouTube の InnerTube API と直接通信。
 * 署名の復号やクライアント切り替えをライブラリが処理する。
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

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "YouTubeの動画IDを取得できませんでした" },
        { status: 400 },
      );
    }

    // retrieve_player: true (default) enables signature deciphering
    const yt = await Innertube.create({
      generate_session_locally: true,
    });

    const info = await yt.getBasicInfo(videoId);

    if (!info.streaming_data) {
      return NextResponse.json(
        {
          error:
            "この動画から音声を取得できませんでした。しばらく時間をおいて再度お試しください。",
        },
        { status: 404 },
      );
    }

    const title = info.basic_info?.title ?? "YouTube音源";
    const author = info.basic_info?.author ?? "不明";

    // Use the library's built-in format selection and download
    // This handles signature deciphering automatically
    const stream = await info.download({ type: "audio", quality: "best" });

    // Collect the stream into a buffer
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.length;
    }

    if (totalLength === 0) {
      return NextResponse.json(
        { error: "音声データが空です" },
        { status: 502 },
      );
    }

    // Merge chunks into a single buffer
    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Determine content type from the chosen format
    const chosenFormat = info.chooseFormat({ type: "audio", quality: "best" });
    const mimeType = chosenFormat?.mime_type ?? "audio/mp4";
    const contentType = mimeType.includes("webm")
      ? "audio/webm"
      : mimeType.includes("mp3") || mimeType.includes("mpeg")
        ? "audio/mpeg"
        : "audio/mp4";
    const fileExt =
      contentType === "audio/webm"
        ? ".webm"
        : contentType === "audio/mpeg"
          ? ".mp3"
          : ".m4a";

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
      {
        error: `YouTube音源の取得中にエラーが発生しました: ${String(err)}`,
      },
      { status: 500 },
    );
  }
}

/* ---------- Helpers ---------- */

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)$/.test(
      parsed.hostname,
    );
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
