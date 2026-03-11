"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils";
import {
  Copy,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Check,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface CopyResult {
  title: string;
  url: string;
}

export default function SheetsCopyPage() {
  const [gasUrl, setGasUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("freeweb-gas-url") ?? "";
    }
    return "";
  });
  const [sheetUrl, setSheetUrl] = useState("");
  const [prefix, setPrefix] = useState("");
  const [teams, setTeams] = useState<string[]>(["チーム1", "チーム2", "チーム3", "チーム4", "チーム5"]);
  const [folderId, setFolderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CopyResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const extractFileId = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const extractFolderId = (url: string): string => {
    if (!url) return "";
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url;
  };

  const addTeam = () => {
    setTeams([...teams, `チーム${teams.length + 1}`]);
  };

  const removeTeam = (index: number) => {
    if (teams.length <= 1) return;
    setTeams(teams.filter((_, i) => i !== index));
  };

  const updateTeam = (index: number, value: string) => {
    const next = [...teams];
    next[index] = value;
    setTeams(next);
  };

  const handleSaveGasUrl = (url: string) => {
    setGasUrl(url);
    if (typeof window !== "undefined") {
      localStorage.setItem("freeweb-gas-url", url);
    }
  };

  const handleCopy = async () => {
    if (!gasUrl.trim()) {
      setError("GAS Web AppのURLを設定してください（下部のセットアップガイド参照）");
      return;
    }

    const fileId = extractFileId(sheetUrl);
    if (!fileId) {
      setError("正しいGoogleスプレッドシートのURLを入力してください");
      return;
    }

    const validTeams = teams.filter((t) => t.trim());
    if (validTeams.length === 0) {
      setError("チーム名を1つ以上入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({
        action: "copy",
        slideId: fileId,
        teams: validTeams.join(","),
        prefix: prefix.trim(),
        folderId: extractFolderId(folderId),
      });

      const url = `${gasUrl.trim()}?${params.toString()}`;

      let data: { results?: CopyResult[]; error?: string };

      try {
        const res = await fetch(url);
        data = await res.json();
      } catch {
        data = await new Promise((resolve, reject) => {
          const cbName = `__gas_cb_${Date.now()}`;
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("timeout"));
          }, 30000);

          function cleanup() {
            clearTimeout(timeout);
            delete (window as unknown as Record<string, unknown>)[cbName];
            script.remove();
          }

          (window as unknown as Record<string, unknown>)[cbName] = (d: typeof data) => {
            cleanup();
            resolve(d);
          };

          const script = document.createElement("script");
          script.src = `${url}&callback=${cbName}`;
          script.onerror = () => {
            cleanup();
            reject(new Error("script"));
          };
          document.body.appendChild(script);
        });
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      setResults(data.results ?? []);
    } catch {
      setError("GAS Web Appとの通信に失敗しました。デプロイ設定で「アクセスできるユーザー」が「全員」になっているか確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSheetUrl("");
    setResults([]);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Anything
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <Copy className="h-5 w-5 text-[#0f9d58]" />
        <h1 className="text-xl font-semibold tracking-tight">Googleスプレッドシート複製</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        テンプレートのスプレッドシートを複数チーム分まとめてコピー。研修・ワークショップの準備を効率化。
      </p>

      {results.length === 0 ? (
        <div className="space-y-6">
          {/* GAS URL設定 */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">GAS Web App 接続設定</span>
              </div>
              {gasUrl && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 設定済み
                </span>
              )}
            </div>
            <input
              type="url"
              value={gasUrl}
              onChange={(e) => handleSaveGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/xxxxx/exec"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60"
            />
            <p className="text-xs text-muted-foreground">
              初回のみ設定が必要です。GASのデプロイURLを貼り付けてください（ブラウザに保存されます）
            </p>
          </div>

          {/* スプレッドシートURL */}
          <div>
            <label className="text-sm font-medium mb-2 block">コピー元のGoogleスプレッドシートURL</label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60"
              disabled={loading}
            />
          </div>

          {/* プレフィックス */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              ファイル名プレフィックス
              <span className="text-muted-foreground font-normal ml-1">(任意)</span>
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="例: 2026年度新人研修"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              設定すると「2026年度新人研修_チーム1」のような名前でコピーされます
            </p>
          </div>

          {/* コピー先フォルダ */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              コピー先フォルダ
              <span className="text-muted-foreground font-normal ml-1">(任意)</span>
            </label>
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Google DriveのフォルダURL or フォルダID"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              未設定の場合、マイドライブのルートにコピーされます
            </p>
          </div>

          {/* チーム名リスト */}
          <div>
            <label className="text-sm font-medium mb-2 block">チーム名 / コピー名</label>
            <div className="space-y-2">
              {teams.map((team, i) => (
                <div key={i} className="flex gap-2">
                  <span className="flex items-center justify-center w-8 text-xs text-muted-foreground shrink-0">
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => updateTeam(i, e.target.value)}
                    placeholder={`コピー${i + 1}の名前`}
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60"
                    disabled={loading}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTeam(i)}
                    disabled={teams.length <= 1 || loading}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addTeam} disabled={loading} className="mt-2 gap-1">
              <Plus className="h-3.5 w-3.5" /> チームを追加
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* 実行ボタン */}
          <Button
            onClick={handleCopy}
            disabled={!sheetUrl.trim() || loading}
            size="lg"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                コピー作成中...
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                {teams.filter((t) => t.trim()).length}件のコピーを作成
              </>
            )}
          </Button>

          {/* セットアップガイド */}
          <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium">初回セットアップガイド（GAS Web Appの作成方法）</span>
              {showSetup ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showSetup && (
              <div className="text-sm text-muted-foreground space-y-4 pt-2">
                <div>
                  <p className="font-medium text-foreground mb-1">Step 1: GASプロジェクトを作成</p>
                  <p>
                    <a
                      href="https://script.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline inline-flex items-center gap-1"
                    >
                      Google Apps Script <ExternalLink className="h-3 w-3" />
                    </a>
                    {" "}を開いて「新しいプロジェクト」をクリック
                  </p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Step 2: コードを貼り付け</p>
                  <p className="mb-2">既存のコードを全て消して、以下をコピー&ペースト：</p>
                  <div className="relative group">
                    <button
                      onClick={async () => {
                        const code = document.getElementById("gas-code-sheets")?.textContent ?? "";
                        const ok = await copyToClipboard(code);
                        if (!ok) return;
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }}
                      className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted/80 hover:bg-muted border border-border/50 backdrop-blur-sm transition-all"
                    >
                      {codeCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-green-600">コピー済み</span>
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="h-3.5 w-3.5" />
                          コードをコピー
                        </>
                      )}
                    </button>
                    <pre id="gas-code-sheets" className="bg-background border rounded-lg p-3 pt-10 text-xs overflow-x-auto whitespace-pre">{`function doGet(e) {
  var params = e.parameter;
  var callback = params.callback || "";

  function jsonResp(obj) {
    var json = JSON.stringify(obj);
    if (callback) {
      return ContentService
        .createTextOutput(callback + "(" + json + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (params.action === "copy") {
    var slideId = params.slideId;
    var teams = params.teams.split(",");
    var prefix = params.prefix || "";
    var folderId = params.folderId || "";

    var results = [];
    var folder = folderId
      ? DriveApp.getFolderById(folderId)
      : null;

    for (var i = 0; i < teams.length; i++) {
      var name = prefix
        ? prefix + "_" + teams[i]
        : teams[i];
      var copy = DriveApp.getFileById(slideId).makeCopy(name);
      if (folder) {
        folder.addFile(copy);
        DriveApp.getRootFolder().removeFile(copy);
      }
      // リンクを知っている全員が編集可
      copy.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.EDIT
      );
      results.push({
        title: name,
        url: copy.getUrl()
      });
    }

    return jsonResp({ results: results });
  }

  return jsonResp({ error: "Invalid action" });
}`}</pre>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Step 3: デプロイ</p>
                  <ol className="list-decimal list-inside space-y-1 ml-1">
                    <li>右上の「デプロイ」→「新しいデプロイ」をクリック</li>
                    <li>種類で「ウェブアプリ」を選択</li>
                    <li>アクセスできるユーザーを<strong className="text-foreground">「全員」</strong>に設定</li>
                    <li>「デプロイ」をクリック</li>
                    <li>初回はGoogleアカウントの認証を許可</li>
                    <li>表示されたURLをコピー</li>
                  </ol>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Step 4: URLを上の入力欄に貼り付け</p>
                  <p>
                    コピーしたURLを「GAS Web App 接続設定」に貼り付ければ準備完了！
                    URLはブラウザに保存されるので次回以降は入力不要です。
                  </p>
                </div>

                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>注意:</strong> GASのウェブアプリURLには認証トークンが含まれるため、
                    他人と共有しないでください。URLはあなたのブラウザにのみ保存されます。
                  </p>
                </div>

                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    <strong>ヒント:</strong> スライド複製と同じGASコードなので、既にデプロイ済みの場合はそのURLをそのまま使えます。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 結果表示 */
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-medium">{results.length}件のコピーを作成しました</h2>
          </div>

          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0f9d58]/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-[#0f9d58]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.url}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={async () => {
                    const ok = await copyToClipboard(r.url);
                    if (!ok) return;
                    setCopiedIdx(i);
                    setTimeout(() => setCopiedIdx(null), 2000);
                  }}
                >
                  {copiedIdx === i ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="h-3.5 w-3.5" />
                      URLコピー
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={async () => {
              const text = results.map((r) => `${r.title}\n${r.url}`).join("\n\n");
              const ok = await copyToClipboard(text);
              if (!ok) return;
              setCopiedIdx(-1);
              setTimeout(() => setCopiedIdx(null), 2000);
            }}
          >
            {copiedIdx === -1 ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                全てコピーしました
              </>
            ) : (
              <>
                <ClipboardCopy className="h-4 w-4" />
                全てのURLをまとめてコピー
              </>
            )}
          </Button>

          <div className="rounded-xl border p-5 space-y-2">
            <p className="text-sm text-muted-foreground">
              共有設定:「リンクを知っている全員が編集可」で作成済み。URLを共有するだけでチームメンバーが編集できます。
            </p>
          </div>

          <Button variant="outline" onClick={reset}>
            別のスプレッドシートをコピーする
          </Button>
        </div>
      )}
    </div>
  );
}
