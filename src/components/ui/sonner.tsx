import { Toaster as SonnerToaster } from "sonner";

export function Toaster({ theme = "dark" }: { theme?: "light" | "dark" | "system" }) {
  return <SonnerToaster theme={theme} />;
}
