import { NextRequest, NextResponse } from "next/server";

const UA_WEB =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const INNERTUBE_API = "https://www.youtube.com/youtubei/v1/player";

/* ---------- Types ---------- */
interface AudioResult {
  url: string;
  mimeType: string;
  title: string;
  author: string;
}

interface AdaptiveFormat {
  mimeType?: string;
  url?: string;
  signatureCipher?: string;
  averageBitrate?: number;
  bitrate?: number;
}

/* ---------- Innertube client configs ---------- */

const CLIENTS = [
  {
    // TV embedded — works for most non-age-restricted videos
    name: "TV_EMBEDDED",
    body: (videoId: string) => ({
      videoId,
      context: {
        client: {
          clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
          clientVersion: "2.0",
        },
        thirdParty: { embedUrl: "https://www.youtube.com/" },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
    ua: UA_WEB,
  },
  {
    // Standard WEB client
    name: "WEB",
    body: (videoId: string) => ({
      videoId,
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20250101.01.00",
          hl: "ja",
          gl: "JP",
        },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
    ua: UA_WEB,
  },
  {
    // Android client — often returns direct URLs
    name: "ANDROID",
    body: (videoId: string) => ({
      videoId,
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "19.09.37",
          androidSdkVersion: 30,
          hl: "ja",
          gl: "JP",
        },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
    ua: "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
  },
] as const;

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

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: "YouTubeの動画IDを取得できませんでした" },
        { status: 400 },
      );
    }

    // Try innertube API clients, then fall back to HTML scraping
    const result =
      (await tryInnertubeClients(videoId)) ??
      (await tryHtmlScraping(videoId));

    if (!result) {
      return NextResponse.json(
        {
          error:
            "この動画から音声を取得できませんでした。年齢制限・非公開・保護された動画の可能性があります。",
        },
        { status: 404 },
      );
    }

    // Download the audio stream
    const audioRes = await fetch(result.url, {
      headers: {
        "User-Agent": UA_WEB,
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

    const contentType = result.mimeType.includes("webm")
      ? "audio/webm"
      : "audio/mp4";
    const fileExt = contentType === "audio/webm" ? ".webm" : ".m4a";

    const safeName =
      sanitizeFilename(`${result.title} - ${result.author}`) + fileExt;
    const encodedName = encodeURIComponent(safeName);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="youtube_audio${fileExt}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(buffer.byteLength),
        "X-Music-Title": encodeURIComponent(result.title),
        "X-Music-Author": encodeURIComponent(result.author),
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

/* ---------- Strategy 1: Innertube API ---------- */

async function tryInnertubeClients(
  videoId: string,
): Promise<AudioResult | null> {
  for (const client of CLIENTS) {
    try {
      const res = await fetch(INNERTUBE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.ua,
        },
        body: JSON.stringify(client.body(videoId)),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as Record<string, unknown>;

      // Check playability
      const playability = data.playabilityStatus as
        | Record<string, unknown>
        | undefined;
      if (playability?.status !== "OK") continue;

      const result = extractAudioFromPlayerData(data);
      if (result) return result;
    } catch {
      // Try next client
      continue;
    }
  }
  return null;
}

/* ---------- Strategy 2: HTML scraping (fallback) ---------- */

async function tryHtmlScraping(videoId: string): Promise<AudioResult | null> {
  try {
    const pageRes = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "User-Agent": UA_WEB,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        },
      },
    );

    if (!pageRes.ok) return null;

    const html = await pageRes.text();

    // Try multiple patterns for player response
    const patterns = [
      /var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});\s*(?:var|<\/script)/,
      /ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});\s*(?:var|<\/script)/,
      /window\["ytInitialPlayerResponse"\]\s*=\s*(\{[\s\S]+?\});\s*(?:var|<\/script)/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match) continue;

      try {
        const playerData = JSON.parse(match[1]) as Record<string, unknown>;
        const result = extractAudioFromPlayerData(playerData);
        if (result) return result;
      } catch {
        continue;
      }
    }
  } catch {
    // Scraping failed
  }
  return null;
}

/* ---------- Shared: extract audio from player data ---------- */

function extractAudioFromPlayerData(
  playerData: Record<string, unknown>,
): AudioResult | null {
  const videoDetails = playerData.videoDetails as
    | Record<string, unknown>
    | undefined;
  const title = (videoDetails?.title as string) ?? "YouTube音源";
  const author = (videoDetails?.author as string) ?? "不明";

  const streamingData = playerData.streamingData as
    | Record<string, unknown>
    | undefined;
  if (!streamingData) return null;

  const adaptiveFormats = (streamingData.adaptiveFormats ??
    []) as AdaptiveFormat[];

  // Filter audio-only streams and sort by bitrate (highest first)
  const audioFormats = adaptiveFormats
    .filter((f) => {
      const mime = f.mimeType ?? "";
      return mime.startsWith("audio/");
    })
    .sort((a, b) => {
      const aBit = a.averageBitrate ?? a.bitrate ?? 0;
      const bBit = b.averageBitrate ?? b.bitrate ?? 0;
      return bBit - aBit;
    });

  if (audioFormats.length === 0) return null;

  // Find a format with a direct URL (skip cipher-protected ones)
  const usable = audioFormats.find((f) => f.url);
  if (!usable?.url) return null;

  return {
    url: usable.url,
    mimeType: usable.mimeType ?? "audio/mp4",
    title,
    author,
  };
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
