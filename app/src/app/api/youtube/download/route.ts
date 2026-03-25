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

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.r4fo.com",
  "https://pipedapi.in.projectsegfau.lt",
  "https://api.piped.yt",
];

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.fdn.fr",
  "https://invidious.privacyredirect.com",
  "https://vid.puffyan.us",
  "https://invidious.nerdvpn.de",
];

const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
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
    const result =
      (await tryCobaltApi(canonicalUrl)) ??
      (await tryY2mateApi(videoId, canonicalUrl)) ??
      (await tryPipedApi(videoId)) ??
      (await tryInvidiousApi(videoId)) ??
      (await tryInnertubeApi(videoId));

    if (!result) {
      return NextResponse.json(
        {
          error:
            "この動画から音声を取得できませんでした。しばらく時間をおいて再度お試しください。",
        },
        { status: 404 },
      );
    }

    // If result URL is a direct download link (y2mate/cobalt dlink), redirect
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

/* ================================================================
 * Strategy 1: Cobalt API (open-source, reliable)
 * https://github.com/imputnet/cobalt
 * ================================================================ */

async function tryCobaltApi(
  videoUrl: string,
): Promise<AudioResult | null> {
  for (const instance of COBALT_INSTANCES) {
    try {
      const res = await fetch(instance, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": UA,
        },
        body: JSON.stringify({
          url: videoUrl,
          downloadMode: "audio",
          audioFormat: "mp3",
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as Record<string, unknown>;
      const status = data.status as string | undefined;

      if (status === "tunnel" || status === "redirect") {
        const downloadUrl = data.url as string | undefined;
        if (!downloadUrl) continue;

        const filename = (data.filename as string) ?? "YouTube音源";
        // Extract title/author from filename (format: "title - author.ext")
        const baseName = filename.replace(/\.[^.]+$/, "");
        const parts = baseName.split(" - ");
        const title = parts[0] ?? "YouTube音源";
        const author = parts.length > 1 ? parts.slice(1).join(" - ") : "不明";

        return {
          url: downloadUrl,
          mimeType: "redirect",
          title,
          author,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/* ================================================================
 * Strategy 2: Y2mate API (two-step: analyze → convert)
 * ================================================================ */

async function tryY2mateApi(
  videoId: string,
  canonicalUrl: string,
): Promise<AudioResult | null> {
  try {
    // Step 1: Analyze — get available formats
    const analyzeRes = await fetch(
      "https://www.y2mate.com/mates/analyzeV2/ajax",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Referer: "https://www.y2mate.com/",
          Origin: "https://www.y2mate.com",
        },
        body: new URLSearchParams({
          k_query: canonicalUrl,
          k_page: "home",
          hl: "ja",
          q_auto: "0",
        }).toString(),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!analyzeRes.ok) return null;

    const analyzeData = (await analyzeRes.json()) as Record<string, unknown>;
    if (analyzeData.status !== "ok") return null;

    const title = (analyzeData.title as string) ?? "YouTube音源";
    const author = (analyzeData.a as string) ?? "不明";

    // Find the best MP3 link
    const links = analyzeData.links as Record<string, unknown> | undefined;
    if (!links) return null;

    // Try mp3 first, then m4a
    const mp3Links = links.mp3 as Record<string, Record<string, unknown>> | undefined;

    let bestKey: string | null = null;

    if (mp3Links) {
      // Sort by quality (higher bitrate first)
      const entries = Object.values(mp3Links);
      // Prefer 128kbps mp3 (most reliable), then higher
      const sorted = entries.sort((a, b) => {
        const aQ = parseInt(String(a.q ?? "0"));
        const bQ = parseInt(String(b.q ?? "0"));
        return bQ - aQ;
      });

      for (const entry of sorted) {
        if (entry.k) {
          bestKey = entry.k as string;
          break;
        }
      }
    }

    if (!bestKey) return null;

    // Step 2: Convert — get download URL
    const convertRes = await fetch(
      "https://www.y2mate.com/mates/convertV2/index",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Referer: "https://www.y2mate.com/",
          Origin: "https://www.y2mate.com",
        },
        body: new URLSearchParams({
          vid: videoId,
          k: bestKey,
        }).toString(),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!convertRes.ok) return null;

    const convertData = (await convertRes.json()) as Record<string, unknown>;
    if (convertData.status !== "ok") return null;

    const dlink = convertData.dlink as string | undefined;
    if (!dlink) return null;

    // y2mate returns a direct download link — use redirect mode
    return {
      url: dlink,
      mimeType: "redirect",
      title,
      author,
    };
  } catch {
    return null;
  }
}

/* ================================================================
 * Strategy 3: Piped API
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
 * Strategy 4: Invidious API
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
 * Strategy 5: YouTube Innertube API (last resort)
 * ================================================================ */

async function tryInnertubeApi(videoId: string): Promise<AudioResult | null> {
  const API_KEY = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
  const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${API_KEY}&prettyPrint=false`;

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
            utcOffsetMinutes: 540,
          },
        },
        contentCheckOk: true,
        racyCheckOk: true,
        playbackContext: {
          contentPlaybackContext: {
            html5Preference: "HTML5_PREF_WANTS",
            signatureTimestamp: 20073,
          },
        },
      },
      ua: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
    },
    {
      body: {
        videoId,
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.44.38",
            androidSdkVersion: 34,
            hl: "ja",
            gl: "JP",
            utcOffsetMinutes: 540,
          },
        },
        contentCheckOk: true,
        racyCheckOk: true,
        playbackContext: {
          contentPlaybackContext: {
            html5Preference: "HTML5_PREF_WANTS",
            signatureTimestamp: 20073,
          },
        },
      },
      ua: "com.google.android.youtube/19.44.38 (Linux; U; Android 14) gzip",
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
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.ua,
          "X-Youtube-Client-Name": "85",
          "X-Youtube-Client-Version": "2.0",
        },
        body: JSON.stringify(client.body),
        signal: AbortSignal.timeout(10000),
      });

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
