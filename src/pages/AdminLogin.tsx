import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const ADMIN_SESSION_KEY = "jyserai:admin-auth";

// Vérifier si l'admin est authentifié
export function isAdminAuthenticated(): boolean {
  const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
  return session === "authenticated";
}

// Marquer comme authentifié
export function setAdminAuthenticated(): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "authenticated");
}

// Déconnecter
export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Le mot de passe est vérifié côté client
    // Il est stocké dans VITE_ADMIN_PASSWORD sur Vercel
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    // Simuler un délai pour éviter le brute force
    await new Promise((r) => setTimeout(r, 500));

    if (password === adminPassword) {
      setAdminAuthenticated();
      navigate("/gestion-evenement");
    } else {
      setError("Mot de passe incorrect");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Accès administrateur</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entrez le mot de passe pour continuer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? "Vérification..." : "Accéder"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/" className="hover:underline">
            ← Retour au site
          </a>
        </p>
      </div>
    </div>
  );
}
