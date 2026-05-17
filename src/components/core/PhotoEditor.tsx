import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Image as KImage,
  Rect,
  Group,
  Circle,
} from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loadEventConfig, type EventConfig } from "@/lib/firebase";

import { Upload, RotateCcw, Download, ImageIcon, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";

export function PhotoEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const photoRef = useRef<Konva.Image>(null);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoTransform, setPhotoTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  });
  const [exporting, setExporting] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 800 });

  // Load config from Firebase
  useEffect(() => {
    loadEventConfig()
      .then((config) => setEvent(config))
      .finally(() => setLoading(false));
  }, []);

  const [templateImg] = useImage(event?.templateUrl ?? "", "anonymous");
  const [photoImg] = useImage(photoDataUrl ?? "");
  const [maskImg] = useImage(event?.maskUrl ?? "", "anonymous");

  // Responsive square stage
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const size = Math.min(w, h);
      setStageSize({ width: size, height: size });
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Native canvas size from template
  const native = useMemo(() => {
    if (templateImg)
      return {
        width: templateImg.naturalWidth,
        height: templateImg.naturalHeight,
      };
    return { width: 2160, height: 2160 };
  }, [templateImg]);

  const scale = stageSize.width / native.width;
  const displayHeight = native.height * scale;

  const zonePx = useMemo(
    () => ({
      x: (event?.zone.x ?? 0.2) * native.width,
      y: (event?.zone.y ?? 0.2) * native.height,
      width: (event?.zone.width ?? 0.6) * native.width,
      height: (event?.zone.height ?? 0.5) * native.height,
    }),
    [event?.zone, native]
  );


  // Initialize photo cover-fit on load
  useEffect(() => {
    if (!photoImg) return;
    const z = zonePx;
    const sx = z.width / photoImg.naturalWidth;
    const sy = z.height / photoImg.naturalHeight;
    const s = Math.max(sx, sy);
    setPhotoTransform({
      x: z.x + z.width / 2,
      y: z.y + z.height / 2,
      scale: s,
      rotation: 0,
    });
  }, [photoImg, zonePx.x, zonePx.y, zonePx.width, zonePx.height]);

  const handlePhotoUpload = (file: File) => {
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Format non supporté");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image trop lourde");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.onerror = () => toast.error("Une erreur est survenue");
    reader.readAsDataURL(file);
  };

  const resetPhoto = () => {
    if (!photoImg) return;
    const z = zonePx;
    const s = Math.max(
      z.width / photoImg.naturalWidth,
      z.height / photoImg.naturalHeight
    );
    setPhotoTransform({
      x: z.x + z.width / 2,
      y: z.y + z.height / 2,
      scale: s,
      rotation: 0,
    });
  };

  const exportPng = async () => {
    if (!event?.templateUrl || !photoImg) {
      toast.error("Aucune photo sélectionnée");
      return;
    }
    setExporting(true);
    try {
      const targetSize = Math.max(native.width, 2160);
      const pixelRatio = targetSize / stageSize.width;
      await new Promise((r) => requestAnimationFrame(r));
      const dataUrl = stageRef.current?.toDataURL({
        pixelRatio,
        mimeType: "image/png",
      });
      if (!dataUrl) throw new Error("export failed");
      const a = document.createElement("a");
      a.href = dataUrl;
      const safe =
        event.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "") || "event";
      a.download = `jy_serai_${safe}.png`;
      a.click();
      toast.success("Ton visuel est prêt !");
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setExporting(false);
    }
  };

  // Clip function based on shape (memoized)
  const clipFunc = useMemo(() => {
    if (!event) return undefined;

    const { x, y, width, height } = zonePx;
    const shape = event.zone.shape;

    return (ctx: Konva.Context) => {
      if (shape === "custom" && maskImg) {
        ctx.rect(x, y, width, height);
      } else if (shape === "circle") {
        const r = Math.min(width, height) / 2;
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, r, 0, Math.PI * 2);
        ctx.closePath();
      } else if (shape === "rounded") {
        const r = Math.min(width, height) * 0.06;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      } else {
        ctx.rect(x, y, width, height);
      }
    };
  }, [event, zonePx, maskImg]);

  if (loading) {
    return (
      <div className="flex h-dvh flex-col bg-background">
        {/* Header skeleton */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </header>

        {/* Body skeleton */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Canvas skeleton */}
          <main className="flex flex-1 items-center justify-center p-4 lg:p-10">
            <Skeleton className="aspect-square w-full max-w-[60vh] rounded-xl" />
          </main>

          {/* Toolbar skeleton */}
          <aside className="border-t border-border bg-card p-6 lg:w-85 lg:border-l lg:border-t-0">
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
              <Skeleton className="h-11 w-full rounded-md" />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-full rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-full rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1 rounded-md" />
                  <Skeleton className="h-9 flex-1 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
              <div className="border-t border-border pt-6">
                <Skeleton className="h-11 w-full rounded-md" />
                <Skeleton className="mx-auto mt-2 h-3 w-32" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold">
            J
          </div>
          <div>
            <div className="text-sm font-medium tracking-tight">J'y serai</div>
            <div className="text-xs text-muted-foreground">
              {event?.name ?? "Événement"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Canvas area */}
        <main className="flex flex-1 items-center justify-center overflow-hidden p-4 lg:p-10">
          <div
            ref={containerRef}
            className="relative flex h-full w-full max-h-[80vh] max-w-[80vh] items-center justify-center"
          >
            {!event?.templateUrl ? (
              <EmptyTemplate />
            ) : (
              <div
                className="relative checker-bg rounded-xl overflow-hidden border border-border shadow-2xl"
                style={{ width: stageSize.width, height: displayHeight }}
              >
                <Stage
                  ref={stageRef}
                  width={stageSize.width}
                  height={displayHeight}
                  scale={{ x: scale, y: scale }}
                >
                  {/* Template as background */}
                  <Layer>
                    {templateImg && (
                      <KImage
                        image={templateImg}
                        x={0}
                        y={0}
                        listening={false}
                      />
                    )}
                    {/* Photo clipped to zone, on top of template */}
                    <Group clipFunc={clipFunc}>
                      {photoImg && (
                        <KImage
                          ref={photoRef}
                          image={photoImg}
                          x={photoTransform.x}
                          y={photoTransform.y}
                          scaleX={photoTransform.scale}
                          scaleY={photoTransform.scale}
                          rotation={photoTransform.rotation}
                          offsetX={photoImg.naturalWidth / 2}
                          offsetY={photoImg.naturalHeight / 2}
                          draggable
                          onDragEnd={(e) =>
                            setPhotoTransform((t) => ({
                              ...t,
                              x: e.target.x(),
                              y: e.target.y(),
                            }))
                          }
                        />
                      )}
                    </Group>
                    {/* Outline guide when no photo */}
                    {!photoImg && event && (
                      <>
                        {event.zone.shape === "circle" ? (
                          <Circle
                            x={zonePx.x + zonePx.width / 2}
                            y={zonePx.y + zonePx.height / 2}
                            radius={Math.min(zonePx.width, zonePx.height) / 2}
                            stroke="white"
                            strokeWidth={2 / scale}
                            dash={[10 / scale, 10 / scale]}
                            listening={false}
                          />
                        ) : (
                          <Rect
                            x={zonePx.x}
                            y={zonePx.y}
                            width={zonePx.width}
                            height={zonePx.height}
                            cornerRadius={
                              event.zone.shape === "rounded"
                                ? Math.min(zonePx.width, zonePx.height) * 0.06
                                : 0
                            }
                            stroke="white"
                            strokeWidth={2 / scale}
                            dash={[10 / scale, 10 / scale]}
                            listening={false}
                          />
                        )}
                      </>
                    )}
                  </Layer>
                </Stage>
              </div>
            )}
          </div>
        </main>

        {/* Tools panel */}
        <aside className="border-t border-border bg-card lg:w-85 lg:border-l lg:border-t-0">
          <Toolbar
            hasPhoto={!!photoImg}
            transform={photoTransform}
            onTransform={setPhotoTransform}
            onUpload={handlePhotoUpload}
            onReset={resetPhoto}
            onExport={exportPng}
            exporting={exporting}
            disabled={!event?.templateUrl}
          />
        </aside>
      </div>
    </div>
  );
}

function EmptyTemplate() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-medium">Événement en préparation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le visuel de l'événement sera bientôt disponible.
        </p>
      </div>
    </div>
  );
}

function Toolbar({
  hasPhoto,
  transform,
  onTransform,
  onUpload,
  onReset,
  onExport,
  exporting,
  disabled,
}: {
  hasPhoto: boolean;
  transform: { x: number; y: number; scale: number; rotation: number };
  onTransform: (t: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }) => void;
  onUpload: (f: File) => void;
  onReset: () => void;
  onExport: () => void;
  exporting: boolean;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Crée ton visuel
        </h3>
        <p className="mt-2 text-sm text-foreground">
          Ajoute ta photo, ajuste le cadrage et télécharge ton visuel prêt à
          partager.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />

      <Button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="h-11 w-full justify-center font-medium"
      >
        <Upload className="mr-2 h-4 w-4" />
        {hasPhoto ? "Changer la photo" : "Ajoute ta photo"}
      </Button>

      <div
        className="space-y-5 opacity-100 transition-opacity data-[disabled=true]:opacity-40"
        data-disabled={!hasPhoto}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Zoom
            </Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {transform.scale.toFixed(2)}x
            </span>
          </div>
          <Slider
            min={0.1}
            max={5}
            step={0.01}
            value={[transform.scale]}
            disabled={!hasPhoto}
            onValueChange={(v) =>
              onTransform({ ...transform, scale: Array.isArray(v) ? v[0] : v })
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rotation
            </Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(transform.rotation)}°
            </span>
          </div>
          <Slider
            min={-180}
            max={180}
            step={1}
            value={[transform.rotation]}
            disabled={!hasPhoto}
            onValueChange={(v) =>
              onTransform({
                ...transform,
                rotation: Array.isArray(v) ? v[0] : v,
              })
            }
          />
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={!hasPhoto}
              onClick={() =>
                onTransform({ ...transform, rotation: transform.rotation - 90 })
              }
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              -90°
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={!hasPhoto}
              onClick={() =>
                onTransform({ ...transform, rotation: transform.rotation + 90 })
              }
            >
              <RotateCw className="mr-1 h-3.5 w-3.5" />
              +90°
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={onReset}
          disabled={!hasPhoto}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Réinitialiser le cadrage
        </Button>
      </div>

      <div className="mt-auto border-t border-border pt-6">
        <Button
          onClick={onExport}
          disabled={!hasPhoto || exporting}
          className="h-11 w-full justify-center font-medium"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Préparation du rendu..." : "Télécharger le visuel"}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          PNG haute qualité · 2160×2160
        </p>
      </div>
    </div>
  );
}
