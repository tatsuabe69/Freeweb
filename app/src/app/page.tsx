"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, CircleDot, GalleryHorizontal, Layers } from "lucide-react";

/* Lazy-load each design to avoid bundling all at once */
const DesignDial = dynamic(() => import("@/components/designs/DesignDial"), { ssr: false });
const DesignCarousel = dynamic(() => import("@/components/designs/DesignCarousel"), { ssr: false });
const DesignKaruta = dynamic(() => import("@/components/designs/DesignKaruta"), { ssr: false });
const DesignTile = dynamic(() => import("@/components/designs/DesignTile"), { ssr: false });
const WireframeBg = dynamic(() => import("@/components/wireframe-bg").then((m) => ({ default: m.WireframeBg })), { ssr: false });

const DESIGNS = [
  { id: "tile",      label: "Tile",      icon: LayoutGrid,          component: DesignTile },
  { id: "dial",      label: "Dial",      icon: CircleDot,           component: DesignDial },
  { id: "carousel",  label: "Carousel",  icon: GalleryHorizontal,   component: DesignCarousel },
  { id: "karuta",    label: "Karuta",    icon: Layers,              component: DesignKaruta },
] as const;

const STORAGE_KEY = "freeweb-design";

export default function HomePage() {
  const [designId, setDesignId] = useState("tile");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DESIGNS.some((d) => d.id === saved)) {
      setDesignId(saved);
    }
  }, []);

  const handleChange = (id: string) => {
    setDesignId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const design = DESIGNS.find((d) => d.id === designId) ?? DESIGNS[0];
  const DesignComponent = design.component;

  return (
    <div className="relative">
      <WireframeBg />
      <DesignComponent />

      {/* Design switcher — top right, horizontal icons */}
      <div className="fixed top-4 right-4 z-50 flex gap-1 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full px-1.5 py-1 shadow-lg">
        {DESIGNS.map((d) => {
          const Icon = d.icon;
          const active = designId === d.id;
          return (
            <button
              key={d.id}
              onClick={() => handleChange(d.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                active
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
              title={d.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
