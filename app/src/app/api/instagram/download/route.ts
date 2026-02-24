import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * POST /api/instagram/download
 * InstagramのリールまたはポストURLから音声を取得
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || !isInstagramUrl(url)) {
      return NextResponse.json(
        { error: "有効なInstagramのURLを入力してください" },
        { status: 400 },
      );
    }

    // Normalize URL to get the media page
    const mediaUrl = normalizeInstagramUrl(url);

    // Try fetching with the ?__a=1&__d=dis approach (public API endpoint)
    const apiUrl = mediaUrl.replace(/\/?$/, "/?__a=1&__d=dis");

    const apiRes = await fetch(apiUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "X-IG-App-ID": "936619743392459", // Instagram web app ID (public)
      },
    });

    let videoUrl: string | null = null;
    let title = "Instagram音源";
    let author = "不明";

    if (apiRes.ok) {
      try {
        const data = await apiRes.json();
        // Navigate the response structure
        const items = data?.graphql?.shortcode_media ?? data?.items?.[0] ?? null;
        if (items) {
          videoUrl = items.video_url ?? items.video_versions?.[0]?.url ?? null;
          author = items.owner?.username ?? items.user?.username ?? "不明";
          title = (items.edge_media_to_caption?.edges?.[0]?.node?.text ?? items.caption?.text ?? "Instagram")
            .slice(0, 60);
        }
      } catch {
        // JSON parse failed, try HTML approach
      }
    }

    // Fallback: fetch HTML page and extract from meta tags / embedded data
    if (!videoUrl) {
      const pageRes = await fetch(mediaUrl, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        },
      });

      if (!pageRes.ok) {
        return NextResponse.json(
          { error: `Instagramページの取得に失敗 (HTTP ${pageRes.status})` },
          { status: 502 },
        );
      }

      const html = await pageRes.text();

      // Try og:video meta tag
      const ogVideoMatch = html.match(
        /<meta\s+(?:property|name)="og:video"\s+content="([^"]+)"/,
      );
      if (ogVideoMatch) {
        videoUrl = ogVideoMatch[1].replace(/&amp;/g, "&");
      }

      // Try to extract from embedded JSON
      if (!videoUrl) {
        const jsonMatch = html.match(
          /"video_url"\s*:\s*"(https?:[^"]+)"/,
        );
        if (jsonMatch) {
          videoUrl = jsonMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
        }
      }

      // Extract author from HTML
      const authorMatch = html.match(
        /<meta\s+(?:property|name)="og:title"\s+content="[^"]*@([^")\s]+)/,
      );
      if (authorMatch) {
        author = authorMatch[1];
      }
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: "この投稿から動画を見つけられませんでした。公開されたリール・動画投稿のURLをお試しください。" },
        { status: 404 },
      );
    }

    // Download the video (which contains the audio)
    const mediaRes = await fetch(videoUrl, {
      headers: {
        "User-Agent": UA,
        Referer: "https://www.instagram.com/",
      },
    });

    if (!mediaRes.ok) {
      return NextResponse.json(
        { error: `メディアのダウンロードに失敗 (HTTP ${mediaRes.status})` },
        { status: 502 },
      );
    }

    const buffer = await mediaRes.arrayBuffer();
    if (buffer.byteLength === 0) {
      return NextResponse.json(
        { error: "メディアデータが空です" },
        { status: 502 },
      );
    }

    // Instagram videos are typically MP4 — the client can use FFmpeg to extract audio
    const safeName = sanitizeFilename(`${title} - @${author}`) + ".mp4";
    const encodedName = encodeURIComponent(safeName);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="instagram_audio.mp4"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(buffer.byteLength),
        "X-Music-Title": encodeURIComponent(title),
        "X-Music-Author": encodeURIComponent(`@${author}`),
        "X-Source-Type": "video", // Client should extract audio via FFmpeg
        "Access-Control-Expose-Headers": "X-Music-Title, X-Music-Author, X-Source-Type",
      },
    });
  } catch (err) {
    console.error("Instagram download error:", err);
    return NextResponse.json(
      { error: `Instagram音源の取得中にエラーが発生しました: ${String(err)}` },
      { status: 500 },
    );
  }
}

function isInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /^(www\.)?instagram\.com$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizeInstagramUrl(url: string): string {
  // Ensure it's a valid Instagram media URL
  try {
    const parsed = new URL(url);
    // Handle /reel/xxx, /p/xxx, /reels/xxx
    return `https://www.instagram.com${parsed.pathname}`;
  } catch {
    return url;
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\u3000-\u9FFF\u4E00-\u9FFF\uFF00-\uFFEF @-]/g, "_")
    .slice(0, 100);
}
