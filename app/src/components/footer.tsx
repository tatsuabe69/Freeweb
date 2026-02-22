import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Your files never leave your browser. No data is sent to any server.</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Free. Private. No limits. No ads. No registration.
          </div>
        </div>
      </div>
    </footer>
  );
}
