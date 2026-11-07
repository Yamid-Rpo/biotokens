import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// Only same-origin relative paths are accepted as a post-login destination.
function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({ next: safeNext(s['next']) }),
  head: () => ({ meta: [{ title: "Iniciar sesión — Bio Tokens" }, { name: "description", content: "Accede a tu panel Bio Tokens." }] }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        navigate({ to: "/mfa", search: { next } });
        return;
      }
      if (next) window.location.href = next;
      else navigate({ to: "/dashboard" });
    })();
  }, [user, next, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  const onGoogle = async () => {
    const redirect_uri = next
      ? `${window.location.origin}${next}`
      : window.location.origin;
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri });
    if (r.error) toast.error("No se pudo iniciar sesión con Google");
  };


  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="p-8">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pwd">Contraseña</Label>
            <Input id="pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <Button variant="outline" className="w-full mt-3" onClick={onGoogle}>Continuar con Google</Button>
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <Link to="/reset-password" className="hover:text-foreground">¿Olvidaste tu contraseña?</Link>
          <Link to="/signup" search={{ next }} className="hover:text-foreground">Crear cuenta</Link>
        </div>
      </Card>
    </div>
  );
}
