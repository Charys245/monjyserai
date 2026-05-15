import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";

const PhotoEditor = lazy(() =>
  import("@/components/core/PhotoEditor").then((m) => ({ default: m.PhotoEditor }))
);

export function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      {mounted ? (
        <Suspense fallback={<LoadingShell />}>
          <PhotoEditor />
        </Suspense>
      ) : (
        <LoadingShell />
      )}
      <Toaster theme="dark" />
    </>
  );
}

function LoadingShell() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-2 w-2 animate-pulse rounded-full bg-foreground" />
        <span className="text-sm">Préparation du rendu...</span>
      </div>
    </div>
  );
}
