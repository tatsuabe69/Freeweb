import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/* ---------- Types ---------- */
interface AudioResult {
  url: string;
  mimeType: string;
  title: string;
  author: string;
}

/* ---------- External API instances ---------- */

const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  "https://cobalt-api.kwiatekmiki.com",
  "https://cobalt.api.timelessnesses.me",
];

const PIPED_INSTANCES = [
  "https://pipedapi.r4fo.com",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt",
];

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.fdn.fr",
  "https://invidious.nerdvpn.de",
  "https://iv.datura.network",
];

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

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Try multiple strategies in order of reliability
    const errors: string[] = [];
    const result =
      (await tryWithLog("Cobalt", () => tryCobaltApi(canonicalUrl), errors)) ??
      (await tryWithLog("Piped", () => tryPipedApi(videoId), errors)) ??
      (await tryWithLog("Invidious", () => tryInvidiousApi(videoId), errors)) ??
      (await tryWithLog("Innertube", () => tryInnertubeApi(videoId), errors));

    if (!result) {
      console.error("All strategies failed:", errors);
      return NextResponse.json(
        {
          error:
            "この動画から音声を取得できませんでした。しばらく時間をおいて再度お試しください。",
        },
        { status: 404 },
      );
    }

    // If result URL is a direct download link, redirect
    if (result.url.startsWith("http") && result.mimeType === "redirect") {
      return NextResponse.json({
        redirect: result.url,
        title: result.title,
        author: result.author,
      });
    }

    // Download the audio stream via proxy
    const audioRes = await fetch(result.url, {
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

    const contentType = result.mimeType.includes("webm")
      ? "audio/webm"
      : result.mimeType.includes("mp3") || result.mimeType.includes("mpeg")
        ? "audio/mpeg"
        : "audio/mp4";
    const fileExt =
      contentType === "audio/webm"
        ? ".webm"
        : contentType === "audio/mpeg"
          ? ".mp3"
          : ".m4a";

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

/* ---------- Strategy helper with logging ---------- */

async function tryWithLog(
  name: string,
  fn: () => Promise<AudioResult | null>,
  errors: string[],
): Promise<AudioResult | null> {
  try {
    const result = await fn();
    if (result) {
      console.log(`[YouTube] ${name} succeeded`);
    } else {
      const msg = `${name}: returned null`;
      console.log(`[YouTube] ${msg}`);
      errors.push(msg);
    }
    return result;
  } catch (e) {
    const msg = `${name}: ${String(e)}`;
    console.error(`[YouTube] ${msg}`);
    errors.push(msg);
    return null;
  }
}

/* ================================================================
 * Strategy 1: Cobalt API (most reliable, actively maintained)
 * https://github.com/imputnet/cobalt
 * ================================================================ */

async function tryCobaltApi(
  videoUrl: string,
): Promise<AudioResult | null> {
  for (const instance of COBALT_INSTANCES) {
    try {
      const res = await fetch(`${instance}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": UA,
        },
        body: JSON.stringify({
          url: videoUrl,
          downloadMode: "audio",
          audioFormat: "mp3",
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.log(`[Cobalt] ${instance} HTTP ${res.status}`);
        continue;
      }

      const data = (await res.json()) as Record<string, unknown>;

      // Cobalt returns status: "redirect" or "tunnel" with a download URL
      if (data.status === "error") {
        console.log(`[Cobalt] ${instance} error:`, data.error);
        continue;
      }

      const downloadUrl = data.url as string | undefined;
      if (!downloadUrl) continue;

      // Extract title from the filename if available
      const filename = (data.filename as string) ?? "";
      const title = filename.replace(/\.[^.]+$/, "") || "YouTube音源";

      if (data.status === "redirect" || data.status === "tunnel") {
        return {
          url: downloadUrl,
          mimeType: "redirect",
          title,
          author: "",
        };
      }
    } catch (e) {
      console.log(`[Cobalt] ${instance} failed:`, String(e));
      continue;
    }
  }
  return null;
}

/* ================================================================
 * Strategy 2: Piped API
 * https://github.com/TeamPiped/Piped
 * ================================================================ */

async function tryPipedApi(videoId: string): Promise<AudioResult | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as Record<string, unknown>;

      const audioStreams = (data.audioStreams ?? []) as Array<
        Record<string, unknown>
      >;
      if (audioStreams.length === 0) continue;

      const sorted = [...audioStreams].sort((a, b) => {
        const aBit = (a.bitrate as number) ?? 0;
        const bBit = (b.bitrate as number) ?? 0;
        return bBit - aBit;
      });

      const best = sorted[0];
      const streamUrl = best.url as string | undefined;
      if (!streamUrl) continue;

      return {
        url: streamUrl,
        mimeType: (best.mimeType as string) ?? "audio/mp4",
        title: (data.title as string) ?? "YouTube音源",
        author: (data.uploader as string) ?? "不明",
      };
    } catch {
      continue;
    }
  }
  return null;
}

/* ================================================================
 * Strategy 3: Invidious API
 * https://github.com/iv-org/invidious
 * ================================================================ */

async function tryInvidiousApi(videoId: string): Promise<AudioResult | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=title,author,adaptiveFormats`,
        {
          headers: { "User-Agent": UA },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!res.ok) continue;

      const data = (await res.json()) as Record<string, unknown>;

      const formats = (data.adaptiveFormats ?? []) as Array<
        Record<string, unknown>
      >;

      const audioFormats = formats
        .filter((f) => {
          const type = (f.type as string) ?? "";
          return type.startsWith("audio/");
        })
        .sort((a, b) => {
          const aBit = (a.bitrate as number) ?? 0;
          const bBit = (b.bitrate as number) ?? 0;
          return bBit - aBit;
        });

      if (audioFormats.length === 0) continue;

      const best = audioFormats[0];
      const streamUrl = best.url as string | undefined;
      if (!streamUrl) continue;

      return {
        url: streamUrl,
        mimeType: (best.type as string) ?? "audio/mp4",
        title: (data.title as string) ?? "YouTube音源",
        author: (data.author as string) ?? "不明",
      };
    } catch {
      continue;
    }
  }
  return null;
}

/* ================================================================
 * Strategy 4: YouTube Innertube API (last resort)
 * Uses IOS and MWEB clients which are more resilient
 * ================================================================ */

async function tryInnertubeApi(videoId: string): Promise<AudioResult | null> {
  const clients = [
    {
      body: {
        videoId,
        context: {
          client: {
            clientName: "IOS",
            clientVersion: "19.45.4",
            deviceMake: "Apple",
            deviceModel: "iPhone16,2",
            hl: "ja",
            gl: "JP",
            osName: "iPhone",
            osVersion: "17.5.1.21F90",
          },
        },
        contentCheckOk: true,
        racyCheckOk: true,
      },
      ua: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
    },
    {
      body: {
        videoId,
        context: {
          client: {
            clientName: "ANDROID_MUSIC",
            clientVersion: "7.27.52",
            androidSdkVersion: 30,
            hl: "ja",
            gl: "JP",
          },
        },
        contentCheckOk: true,
        racyCheckOk: true,
      },
      ua: "com.google.android.apps.youtube.music/7.27.52 (Linux; U; Android 11) gzip",
    },
    {
      body: {
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
      },
      ua: UA,
    },
  ];

  for (const client of clients) {
    try {
      const res = await fetch(
        "https://www.youtube.com/youtubei/v1/player",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": client.ua,
          },
          body: JSON.stringify(client.body),
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!res.ok) continue;

      const data = (await res.json()) as Record<string, unknown>;

      const playability = data.playabilityStatus as
        | Record<string, unknown>
        | undefined;
      if (playability?.status !== "OK") continue;

      const videoDetails = data.videoDetails as
        | Record<string, unknown>
        | undefined;
      const title = (videoDetails?.title as string) ?? "YouTube音源";
      const author = (videoDetails?.author as string) ?? "不明";

      const streamingData = data.streamingData as
        | Record<string, unknown>
        | undefined;
      if (!streamingData) continue;

      const adaptiveFormats = (streamingData.adaptiveFormats ?? []) as Array<
        Record<string, unknown>
      >;

      const audioFormats = adaptiveFormats
        .filter((f) => {
          const mime = (f.mimeType as string) ?? "";
          return mime.startsWith("audio/");
        })
        .sort((a, b) => {
          const aBit =
            (a.averageBitrate as number) ?? (a.bitrate as number) ?? 0;
          const bBit =
            (b.averageBitrate as number) ?? (b.bitrate as number) ?? 0;
          return bBit - aBit;
        });

      const usable = audioFormats.find((f) => f.url as string | undefined);
      if (!usable?.url) continue;

      return {
        url: usable.url as string,
        mimeType: (usable.mimeType as string) ?? "audio/mp4",
        title,
        author,
      };
    } catch {
      continue;
    }
  }
  return null;
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
