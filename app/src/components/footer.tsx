import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-screen-2xl px-6 lg:px-10 py-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>ブラウザ完結 — サーバー送信なし</span>
          </div>
          <span>無料 / プライベート / 無制限</span>
        </div>
      </div>
    </footer>
  );
}
