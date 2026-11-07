import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/mfa")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({ next: safeNext(s["next"]) }),
  head: () => ({
    meta: [
      { title: "Verificación en dos pasos — Bio Tokens" },
      { name: "description", content: "Ingresa tu código de verificación para entrar a Bio Tokens." },
    ],
  }),
  component: Mfa,
});

function Mfa() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.find((f) => f.status === "verified");
    if (!factor) { setBusy(false); return navigate({ to: "/dashboard" }); }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setBusy(false);
    if (error) return toast.error("Código incorrecto");
    if (next) window.location.href = next;
    else navigate({ to: "/dashboard" });
  };

  const cancel = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="p-8">
        <h1 className="text-2xl font-bold">Verificación en dos pasos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Abre tu app autenticadora y escribe el código de 6 dígitos.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="code">Código</Label>
            <Input id="code" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>Verificar</Button>
        </form>
        <Button variant="ghost" className="w-full mt-2" onClick={cancel}>Cancelar y cerrar sesión</Button>
      </Card>
    </div>
  );
}
