/* ================================================================
   SNS Video Creator — Type Definitions
   ================================================================ */

export interface TimelineClip {
  id: string;
  file: File;
  name: string;
  fullDuration: number;
  inPoint: number;
  outPoint: number;
  thumbnailUrl: string;
  objectUrl: string;
}

export interface TextOverlay {
  id: string;
  text: string;
  position: "top" | "center" | "bottom";
  size: "s" | "m" | "l";
  color: string;
}
