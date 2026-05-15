import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logoutAdmin } from "./AdminLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import {
  Upload,
  Check,
  Move,
  Loader2,
  ImageIcon,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  LogOut,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  loadEventConfig,
  saveEventConfig,
  type EventConfig,
  type Shape,
} from "@/lib/firebase";

const DEFAULT_CONFIG: EventConfig = {
  name: "Mon événement",
  templateUrl: null,
  maskUrl: null,
  zone: {
    x: 0.2,
    y: 0.2,
    width: 0.6,
    height: 0.5,
    shape: "rounded",
  },
};

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function Admin() {
  const [config, setConfig] = useState<EventConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoneSelected, setZoneSelected] = useState(false);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    navigate("/");
  };

  // Drag state
  const [dragging, setDragging] = useState<"move" | ResizeHandle | null>(null);
  const dragStart = useRef({ x: 0, y: 0, zone: DEFAULT_CONFIG.zone });

  // Step for keyboard navigation (1% of the canvas)
  const STEP = 0.01;
  const STEP_LARGE = 0.05;

  // Load config from Firebase
  useEffect(() => {
    loadEventConfig()
      .then((data) => {
        if (data) setConfig(data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!zoneSelected || !config.templateUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? STEP_LARGE : STEP;
      const { zone } = config;

      let newZone = { ...zone };

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newZone.y = Math.max(0, zone.y - step);
          break;
        case "ArrowDown":
          e.preventDefault();
          newZone.y = Math.min(1 - zone.height, zone.y + step);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newZone.x = Math.max(0, zone.x - step);
          break;
        case "ArrowRight":
          e.preventDefault();
          newZone.x = Math.min(1 - zone.width, zone.x + step);
          break;
        case "+":
        case "=":
          e.preventDefault();
          if (zone.shape === "circle") {
            const newSize = Math.min(
              Math.min(1 - zone.x, 1 - zone.y),
              zone.width + step
            );
            newZone.width = newSize;
            newZone.height = newSize;
          } else {
            newZone.width = Math.min(1 - zone.x, zone.width + step);
            newZone.height = Math.min(1 - zone.y, zone.height + step);
          }
          break;
        case "-":
          e.preventDefault();
          if (zone.shape === "circle") {
            const newSize = Math.max(0.05, zone.width - step);
            newZone.width = newSize;
            newZone.height = newSize;
          } else {
            newZone.width = Math.max(0.05, zone.width - step);
            newZone.height = Math.max(0.05, zone.height - step);
          }
          break;
        case "Escape":
          setZoneSelected(false);
          return;
        default:
          return;
      }

      setConfig((prev) => ({ ...prev, zone: newZone }));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoneSelected, config]);

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        // Don't deselect if clicking on controls panel
        const panel = document.querySelector("[data-controls-panel]");
        if (panel?.contains(e.target as Node)) return;
        setZoneSelected(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save to Firebase
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEventConfig(config);
      toast.success("Configuration publiée !");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Compress image to fit Firestore limits (keeps PNG transparency)
  const compressImage = (file: File, maxSize = 1080): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const result = canvas.toDataURL("image/png");
        resolve(result);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Read file as base64 (for masks)
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload template
  const handleTemplateUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image");
      return;
    }

    setSaving(true);
    try {
      let base64 = await compressImage(file, 1080);
      if (base64.length > 900 * 1024) {
        base64 = await compressImage(file, 800);
      }
      if (base64.length > 900 * 1024) {
        base64 = await compressImage(file, 600);
      }
      if (base64.length > 900 * 1024) {
        toast.error("Image trop lourde. Utilise une image plus simple.");
        return;
      }

      setConfig((prev) => ({ ...prev, templateUrl: base64 }));
      const sizeKB = Math.round(base64.length / 1024);
      toast.success(`Template importé ! (${sizeKB} Ko)`);
    } catch {
      toast.error("Erreur lors de l'import");
    } finally {
      setSaving(false);
    }
  };

  // Upload mask
  const handleMaskUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image PNG");
      return;
    }
    if (file.size > 200 * 1024) {
      toast.error("Le masque ne doit pas dépasser 200 Ko");
      return;
    }

    setSaving(true);
    try {
      const base64 = await readFileAsBase64(file);
      setConfig((prev) => ({
        ...prev,
        maskUrl: base64,
        zone: { ...prev.zone, shape: "custom" },
      }));
      toast.success("Masque importé !");
    } catch {
      toast.error("Erreur lors de l'import");
    } finally {
      setSaving(false);
    }
  };

  const setZone = (k: keyof EventConfig["zone"], v: number | Shape) => {
    if (k === "shape" && v === "circle") {
      const size = Math.min(config.zone.width, config.zone.height);
      setConfig({
        ...config,
        zone: { ...config.zone, shape: "circle", width: size, height: size },
      });
    } else {
      setConfig({ ...config, zone: { ...config.zone, [k]: v as never } });
    }
  };

  // Update zone with numeric inputs
  const updateZoneValue = (key: "x" | "y" | "width" | "height", value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    if (config.zone.shape === "circle" && (key === "width" || key === "height")) {
      setConfig((prev) => ({
        ...prev,
        zone: { ...prev.zone, width: clamped, height: clamped },
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        zone: { ...prev.zone, [key]: clamped },
      }));
    }
  };

  // Mouse handlers for drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "move" | ResizeHandle) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(type);
      setZoneSelected(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        zone: { ...config.zone },
      };
    },
    [config.zone]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !previewRef.current) return;

      const rect = previewRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragStart.current.x) / rect.width;
      const dy = (e.clientY - dragStart.current.y) / rect.height;
      const startZone = dragStart.current.zone;
      const isCircle = config.zone.shape === "circle";

      if (dragging === "move") {
        const newX = Math.max(0, Math.min(1 - startZone.width, startZone.x + dx));
        const newY = Math.max(0, Math.min(1 - startZone.height, startZone.y + dy));
        setConfig((prev) => ({
          ...prev,
          zone: { ...prev.zone, x: newX, y: newY },
        }));
      } else {
        // Resize handles
        let newX = startZone.x;
        let newY = startZone.y;
        let newW = startZone.width;
        let newH = startZone.height;

        // Handle horizontal resize
        if (dragging.includes("e")) {
          newW = Math.max(0.05, Math.min(1 - startZone.x, startZone.width + dx));
        }
        if (dragging.includes("w")) {
          const maxDx = startZone.width - 0.05;
          const clampedDx = Math.max(-startZone.x, Math.min(maxDx, dx));
          newX = startZone.x + clampedDx;
          newW = startZone.width - clampedDx;
        }

        // Handle vertical resize
        if (dragging.includes("s")) {
          newH = Math.max(0.05, Math.min(1 - startZone.y, startZone.height + dy));
        }
        if (dragging.includes("n")) {
          const maxDy = startZone.height - 0.05;
          const clampedDy = Math.max(-startZone.y, Math.min(maxDy, dy));
          newY = startZone.y + clampedDy;
          newH = startZone.height - clampedDy;
        }

        // For circle, maintain aspect ratio
        if (isCircle) {
          const size = Math.max(newW, newH);
          newW = Math.min(size, 1 - newX);
          newH = Math.min(size, 1 - newY);
          const finalSize = Math.min(newW, newH);
          newW = finalSize;
          newH = finalSize;
        }

        setConfig((prev) => ({
          ...prev,
          zone: { ...prev.zone, x: newX, y: newY, width: newW, height: newH },
        }));
      }
    },
    [dragging, config.zone.shape]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Render resize handles
  const renderHandles = () => {
    if (!zoneSelected) return null;

    const handles: { pos: ResizeHandle; cursor: string; style: React.CSSProperties }[] = [
      { pos: "n", cursor: "ns-resize", style: { top: -4, left: "50%", transform: "translateX(-50%)" } },
      { pos: "s", cursor: "ns-resize", style: { bottom: -4, left: "50%", transform: "translateX(-50%)" } },
      { pos: "e", cursor: "ew-resize", style: { right: -4, top: "50%", transform: "translateY(-50%)" } },
      { pos: "w", cursor: "ew-resize", style: { left: -4, top: "50%", transform: "translateY(-50%)" } },
      { pos: "nw", cursor: "nwse-resize", style: { top: -4, left: -4 } },
      { pos: "ne", cursor: "nesw-resize", style: { top: -4, right: -4 } },
      { pos: "sw", cursor: "nesw-resize", style: { bottom: -4, left: -4 } },
      { pos: "se", cursor: "nwse-resize", style: { bottom: -4, right: -4 } },
    ];

    return handles.map(({ pos, cursor, style }) => (
      <div
        key={pos}
        className="absolute h-3 w-3 rounded-full border-2 border-blue-500 bg-white hover:bg-blue-100 transition-colors"
        style={{ ...style, cursor }}
        onMouseDown={(e) => handleMouseDown(e, pos)}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header skeleton */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </header>

        {/* Body skeleton */}
        <main className="flex flex-1 flex-col lg:flex-row">
          {/* Preview skeleton */}
          <div className="flex flex-1 items-center justify-center bg-muted/30 p-6">
            <Skeleton className="aspect-square w-full max-w-lg rounded-lg" />
          </div>

          {/* Settings panel skeleton */}
          <div className="w-full border-t border-border bg-card p-6 lg:w-96 lg:border-l lg:border-t-0">
            <Skeleton className="h-4 w-28 mb-6" />
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 rounded-md" />
                  <Skeleton className="h-10 rounded-md" />
                  <Skeleton className="h-10 rounded-md" />
                  <Skeleton className="h-10 rounded-md" />
                </div>
              </div>
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Skeleton className="h-3 w-24" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 rounded-md" />
                  <Skeleton className="h-16 rounded-md" />
                  <Skeleton className="h-16 rounded-md" />
                  <Skeleton className="h-16 rounded-md" />
                </div>
              </div>
              <div className="border-t border-border pt-5">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="mx-auto mt-2 h-3 w-48" />
              </div>
              <div className="border-t border-border pt-5">
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold"
          >
            J
          </Link>
          <div>
            <div className="text-sm font-medium tracking-tight">J'y serai</div>
            <div className="text-xs text-muted-foreground">
              Gestion de l'événement
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col lg:flex-row">
        {/* Preview */}
        <div
          className="flex flex-1 items-center justify-center bg-muted/30 p-6"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {config.templateUrl ? (
            <div className="relative w-full max-w-lg" ref={previewRef}>
              <img
                src={config.templateUrl}
                alt="Template"
                className="w-full rounded-lg border border-border select-none pointer-events-none"
                draggable={false}
              />
              {/* Zone overlay */}
              <div
                ref={zoneRef}
                className={`absolute border-2 bg-blue-500/20 cursor-move overflow-visible transition-colors ${
                  zoneSelected ? "border-blue-500" : "border-blue-400/70"
                }`}
                style={{
                  left: `${config.zone.x * 100}%`,
                  top: `${config.zone.y * 100}%`,
                  width: `${config.zone.width * 100}%`,
                  height: `${config.zone.height * 100}%`,
                  borderRadius:
                    config.zone.shape === "circle"
                      ? "50%"
                      : config.zone.shape === "rounded"
                        ? "6%"
                        : "0",
                }}
                onMouseDown={(e) => handleMouseDown(e, "move")}
                onClick={() => setZoneSelected(true)}
              >
                {/* Mask preview */}
                {config.zone.shape === "custom" && config.maskUrl && (
                  <img
                    src={config.maskUrl}
                    alt="Mask"
                    className="absolute inset-0 h-full w-full object-cover opacity-50 pointer-events-none"
                  />
                )}

                {/* Label */}
                <div className="absolute -top-7 left-0 flex items-center gap-1 rounded bg-blue-500 px-2 py-1 text-[10px] font-medium text-white whitespace-nowrap">
                  <Move className="h-3 w-3" />
                  Zone photo
                  {zoneSelected && (
                    <span className="ml-1 opacity-70">
                      ({Math.round(config.zone.width * 100)}% × {Math.round(config.zone.height * 100)}%)
                    </span>
                  )}
                </div>

                {/* Resize handles */}
                {renderHandles()}
              </div>

              {/* Instructions */}
              {zoneSelected && (
                <div className="absolute -bottom-12 left-0 right-0 text-center text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">↑↓←→</kbd>
                    déplacer
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">Shift</kbd>
                    + flèches = rapide
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">+/-</kbd>
                    redimensionner
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-border">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-medium">Aucun template</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Importe un visuel PNG pour commencer
                </p>
              </div>
              <Button onClick={() => templateInputRef.current?.click()} disabled={saving}>
                <Upload className="mr-2 h-4 w-4" />
                Importer le template
              </Button>
            </div>
          )}
        </div>

        {/* Settings panel */}
        <div
          className="w-full border-t border-border bg-card lg:w-96 lg:border-l lg:border-t-0 overflow-y-auto"
          data-controls-panel
        >
          <div className="p-6">
            <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
              Configuration
            </h2>

            <div className="mt-6 space-y-5">
              {/* Event name */}
              <div className="space-y-1.5">
                <Label className="text-xs">Nom de l'événement</Label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                />
              </div>

              {/* Template upload */}
              <input
                ref={templateInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleTemplateUpload(f);
                  e.target.value = "";
                }}
              />

              <div className="space-y-1.5">
                <Label className="text-xs">Template (compression auto)</Label>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => templateInputRef.current?.click()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="mr-2 h-4 w-4" />
                  )}
                  {config.templateUrl ? "Remplacer" : "Importer"}
                </Button>
              </div>

              {/* Shape selection */}
              <div className="space-y-1.5">
                <Label className="text-xs">Forme du masque</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["rectangle", "rounded", "circle", "custom"] as Shape[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setZone("shape", s)}
                      className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                        config.zone.shape === s
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s === "rectangle"
                        ? "Rectangle"
                        : s === "rounded"
                          ? "Arrondi"
                          : s === "circle"
                            ? "Cercle"
                            : "Personnalisé"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone position controls */}
              {config.templateUrl && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Position & Taille</Label>
                    <button
                      onClick={() => setZoneSelected(true)}
                      className="text-[10px] text-blue-500 hover:underline"
                    >
                      Sélectionner la zone
                    </button>
                  </div>

                  {/* Position controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Position X (%)</label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateZoneValue("x", config.zone.x - STEP)}
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(config.zone.x * 100)}
                          onChange={(e) => updateZoneValue("x", Number(e.target.value) / 100)}
                          className="h-8 text-center text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateZoneValue("x", config.zone.x + STEP)}
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Position Y (%)</label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateZoneValue("y", config.zone.y - STEP)}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(config.zone.y * 100)}
                          onChange={(e) => updateZoneValue("y", Number(e.target.value) / 100)}
                          className="h-8 text-center text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateZoneValue("y", config.zone.y + STEP)}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Size controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">
                        Largeur (%)
                      </label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateZoneValue("width", config.zone.width - STEP)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={5}
                          max={100}
                          step={1}
                          value={Math.round(config.zone.width * 100)}
                          onChange={(e) => updateZoneValue("width", Number(e.target.value) / 100)}
                          className="h-8 text-center text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateZoneValue("width", config.zone.width + STEP)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">
                        Hauteur (%)
                        {config.zone.shape === "circle" && (
                          <span className="ml-1 text-blue-500">(lié)</span>
                        )}
                      </label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateZoneValue("height", config.zone.height - STEP)}
                          disabled={config.zone.shape === "circle"}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={5}
                          max={100}
                          step={1}
                          value={Math.round(config.zone.height * 100)}
                          onChange={(e) => updateZoneValue("height", Number(e.target.value) / 100)}
                          className="h-8 text-center text-xs"
                          disabled={config.zone.shape === "circle"}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateZoneValue("height", config.zone.height + STEP)}
                          disabled={config.zone.shape === "circle"}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mask upload (only for custom shape) */}
              {config.zone.shape === "custom" && (
                <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Masque personnalisé
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    PNG avec forme blanche sur fond transparent (max 200 Ko)
                  </p>
                  <input
                    ref={maskInputRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleMaskUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => maskInputRef.current?.click()}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {config.maskUrl ? "Remplacer le masque" : "Importer le masque"}
                  </Button>
                  {config.maskUrl && (
                    <div className="mt-2 rounded border border-border bg-background p-2">
                      <img
                        src={config.maskUrl}
                        alt="Mask preview"
                        className="h-16 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Save button */}
              <div className="border-t border-border pt-5">
                <Button
                  onClick={handleSave}
                  className="w-full"
                  disabled={saving || !config.templateUrl}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Publier les modifications
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Les utilisateurs verront les changements immédiatement
                </p>
              </div>

              <div className="border-t border-border pt-5">
                <Link to="/">
                  <Button variant="secondary" className="w-full">
                    Prévisualiser côté utilisateur
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Toaster theme="dark" />
    </div>
  );
}
