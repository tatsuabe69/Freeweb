import Link from "next/link";
import {
  Merge,
  Scissors,
  Minimize2,
  RotateCw,
  Image,
  FileImage,
  ArrowUpDown,
  Shield,
  Zap,
  Ban,
  Film,
  Ratio,
  Music,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const pdfTools = [
  {
    title: "PDF Merge",
    description: "Combine multiple PDF files into one",
    href: "/pdf/merge",
    icon: Merge,
  },
  {
    title: "PDF Split",
    description: "Split a PDF into separate files",
    href: "/pdf/split",
    icon: Scissors,
  },
  {
    title: "PDF Compress",
    description: "Reduce PDF file size",
    href: "/pdf/compress",
    icon: Minimize2,
  },
  {
    title: "PDF Rotate",
    description: "Rotate PDF pages",
    href: "/pdf/rotate",
    icon: RotateCw,
  },
  {
    title: "PDF to Image",
    description: "Convert PDF pages to JPG, PNG, or WebP",
    href: "/pdf/to-image",
    icon: Image,
  },
  {
    title: "Image to PDF",
    description: "Convert images to a PDF document",
    href: "/pdf/from-image",
    icon: FileImage,
  },
  {
    title: "PDF Reorder",
    description: "Drag and drop to reorder PDF pages",
    href: "/pdf/reorder",
    icon: ArrowUpDown,
  },
];

const videoTools = [
  {
    title: "Video Compress",
    description: "Compress for Discord, LINE, Twitter",
    href: "/video/compress",
    icon: Minimize2,
  },
  {
    title: "Video to GIF",
    description: "Convert video clips to animated GIFs",
    href: "/video/to-gif",
    icon: Film,
  },
  {
    title: "Video Trim",
    description: "Cut and trim videos by time",
    href: "/video/trim",
    icon: Scissors,
  },
  {
    title: "SNS Aspect Ratio",
    description: "Resize for TikTok, Instagram, YouTube",
    href: "/video/aspect",
    icon: Ratio,
  },
  {
    title: "Audio Extraction",
    description: "Extract MP3, WAV, or AAC from video",
    href: "/video/audio",
    icon: Music,
  },
];

const features = [
  {
    icon: Shield,
    title: "100% Private",
    description: "Files are processed entirely in your browser. Nothing is uploaded.",
  },
  {
    icon: Ban,
    title: "No Ads, No Limits",
    description: "Completely free. No watermarks, no file size limits, no usage caps.",
  },
  {
    icon: Zap,
    title: "Fast & Instant",
    description: "No waiting for server processing. Everything runs locally at full speed.",
  },
];

interface Tool {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function ToolGrid({ tools }: { tools: Tool[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
      {tools.map((tool) => (
        <Link key={tool.href} href={tool.href}>
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <tool.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {tool.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {tool.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            No upload required
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Your files never leave
            <br />
            <span className="text-primary">your browser.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Free, private, no-limits file processing tools.
            <br />
            No ads. No registration. No upload.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
              >
                <feature.icon className="h-4 w-4 text-primary" />
                <span>{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF Tools Grid */}
      <section className="pb-12 md:pb-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">PDF Tools</h2>
          <p className="text-muted-foreground text-center mb-8">
            All processing happens in your browser
          </p>
          <ToolGrid tools={pdfTools} />
        </div>
      </section>

      {/* Video Tools Grid */}
      <section className="pb-16 md:pb-24">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Video Tools</h2>
          <p className="text-muted-foreground text-center mb-8">
            Powered by FFmpeg — runs entirely in your browser
          </p>
          <ToolGrid tools={videoTools} />
        </div>
      </section>

      {/* Trust Section */}
      <section className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
