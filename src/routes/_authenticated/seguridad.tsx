import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/seguridad")({
  head: () => ({
    meta: [
      { title: "Seguridad y MFA — Bio Tokens" },
      { name: "description", content: "Activa la verificación en dos pasos en tu cuenta Bio Tokens." },
    ],
  }),
  component: Security,
});

type Factor = { id: string; friendly_name?: string | null; status: string };

function Security() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  };
  useEffect(() => { load(); }, []);

  const start = async () => {
    setBusy(true);
    // Remove stale unverified factors so a new enrollment can start.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Bio Tokens ${Date.now()}` });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) return toast.error("Código incorrecto");
    toast.success("Verificación en dos pasos activada");
    setEnroll(null); setCode(""); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Desactivar la verificación en dos pasos?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) return toast.error(error.message);
    toast.success("Verificación en dos pasos desactivada");
    load();
  };

  const active = factors.filter((f) => f.status === "verified");

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <Card className="p-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Verificación en dos pasos (MFA)</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Protege tu cuenta con un código de 6 dígitos de una app autenticadora (Google Authenticator, Microsoft Authenticator, Authy).
        </p>

        {active.length > 0 ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-primary">● Activada</p>
            {active.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>App autenticadora</span>
                <Button variant="outline" size="sm" onClick={() => remove(f.id)}>Desactivar</Button>
              </div>
            ))}
          </div>
        ) : enroll ? (
          <form onSubmit={verify} className="mt-6 space-y-4">
            <p className="text-sm">1. Escanea este código QR con tu app autenticadora:</p>
            <img src={enroll.qr} alt="Código QR para la app autenticadora" className="h-48 w-48 rounded bg-card" />
            <p className="text-xs text-muted-foreground break-all">O ingresa esta clave manualmente: <code>{enroll.secret}</code></p>
            <div>
              <Label htmlFor="code">2. Escribe el código de 6 dígitos</Label>
              <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>Activar</Button>
          </form>
        ) : (
          <Button className="mt-6" onClick={start} disabled={busy}>Activar verificación en dos pasos</Button>
        )}
      </Card>
    </div>
  );
}
