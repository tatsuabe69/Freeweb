import { NextRequest, NextResponse } from "next/server";

const YT_API = "https://yt-audio-api-wkqe.onrender.com";

/**
 * POST /api/youtube/download
 * Render上のyt-dlp APIを経由してYouTube音声を取得しプロキシ
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

    // Call yt-dlp API on Render
    const apiRes = await fetch(`${YT_API}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(120000), // yt-dlp can be slow
    });

    if (!apiRes.ok) {
      const errData = await apiRes.json().catch(() => null);
      const errMsg =
        (errData as Record<string, unknown>)?.detail ??
        "この動画から音声を取得できませんでした。しばらく時間をおいて再度お試しください。";
      return NextResponse.json(
        { error: String(errMsg) },
        { status: apiRes.status },
      );
    }

    const buffer = await apiRes.arrayBuffer();
    if (buffer.byteLength === 0) {
      return NextResponse.json(
        { error: "音声データが空です" },
        { status: 502 },
      );
    }

    const ct = apiRes.headers.get("Content-Type") ?? "audio/mp4";
    const title = decodeURIComponent(
      apiRes.headers.get("X-Title") ?? "YouTube音源",
    );
    const author = decodeURIComponent(
      apiRes.headers.get("X-Author") ?? "不明",
    );

    const fileExt = ct.includes("webm")
      ? ".webm"
      : ct.includes("mpeg") || ct.includes("mp3")
        ? ".mp3"
        : ".m4a";

    const safeName =
      sanitizeFilename(`${title} - ${author}`) + fileExt;
    const encodedName = encodeURIComponent(safeName);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": ct,
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

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\u3000-\u9FFF\u4E00-\u9FFF\uFF00-\uFFEF -]/g, "_")
    .slice(0, 100);
}
