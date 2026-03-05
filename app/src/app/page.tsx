"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Palette } from "lucide-react";

/* Lazy-load each design to avoid bundling all at once */
const DesignDial = dynamic(() => import("@/components/designs/DesignDial"), { ssr: false });
const DesignCarousel = dynamic(() => import("@/components/designs/DesignCarousel"), { ssr: false });
const DesignKaruta = dynamic(() => import("@/components/designs/DesignKaruta"), { ssr: false });
const DesignTile = dynamic(() => import("@/components/designs/DesignTile"), { ssr: false });
const WireframeBg = dynamic(() => import("@/components/wireframe-bg").then((m) => ({ default: m.WireframeBg })), { ssr: false });

const DESIGNS = [
  { id: "tile",      label: "Tile",      component: DesignTile },
  { id: "dial",      label: "Dial",      component: DesignDial },
  { id: "carousel",  label: "Carousel",  component: DesignCarousel },
  { id: "karuta",    label: "Karuta",    component: DesignKaruta },
] as const;

const STORAGE_KEY = "freeweb-design";

export default function HomePage() {
  const [designId, setDesignId] = useState("tile");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DESIGNS.some((d) => d.id === saved)) {
      setDesignId(saved);
    }
  }, []);

  const handleChange = (id: string) => {
    setDesignId(id);
    localStorage.setItem(STORAGE_KEY, id);
    setOpen(false);
  };

  const design = DESIGNS.find((d) => d.id === designId) ?? DESIGNS[0];
  const DesignComponent = design.component;

  return (
    <div className="relative">
      <WireframeBg />
      <DesignComponent />

      {/* Design switcher — top right */}
      <div className="fixed top-4 right-4 z-50">
        {open && (
          <div className="absolute top-12 right-0 bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 min-w-[130px] animate-in fade-in slide-in-from-top-2 duration-200">
            {DESIGNS.map((d) => (
              <button
                key={d.id}
                onClick={() => handleChange(d.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                  designId === d.id
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted/50 transition-all shadow-lg"
          title="デザイン切替"
        >
          <Palette className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
