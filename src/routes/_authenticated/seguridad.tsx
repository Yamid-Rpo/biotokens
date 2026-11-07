import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, UserCircle, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";

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

function ProfileCard() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [kind, setKind] = useState<"persona" | "empresa">("persona");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, organization, kind")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setOrganization(data.organization ?? "");
          setKind((data.kind as "persona" | "empresa") ?? "persona");
        }
        setLoaded(true);
      });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null, organization: organization.trim() || null, kind, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil actualizado");
  };

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold flex items-center gap-2"><UserCircle className="h-6 w-6" /> Datos de perfil</h2>
      <p className="mt-2 text-sm text-muted-foreground">Esta información identifica tu cuenta en los proyectos y certificados.</p>
      <form onSubmit={save} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!loaded} />
        </div>
        <div>
          <Label htmlFor="organization">Organización (opcional)</Label>
          <Input id="organization" autoComplete="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} disabled={!loaded} />
        </div>
        <div>
          <Label htmlFor="kind">Tipo de cuenta</Label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "persona" | "empresa")}
            disabled={!loaded}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="persona">Persona</option>
            <option value="empresa">Empresa</option>
          </select>
        </div>
        <Button type="submit" className="w-full" disabled={busy || !loaded}>Guardar perfil</Button>
      </form>
    </Card>
  );
}

function EmailCard() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    if (!next || next === user?.email) return toast.error("Escribe un correo diferente al actual");
    setBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: next },
      { emailRedirectTo: `${window.location.origin}/seguridad` },
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Te enviamos un enlace a tu correo actual y otro al nuevo. Confirma ambos.");
    setEmail("");
  };

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" /> Cambiar correo electrónico</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Correo actual: <span className="font-medium text-foreground">{user?.email}</span>
      </p>
      <form onSubmit={change} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="newEmail">Nuevo correo electrónico</Label>
          <Input id="newEmail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {user?.new_email && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
            Cambio pendiente a <span className="font-medium">{user.new_email}</span>. Abre el enlace que llegó a tu correo actual
            y el que llegó al nuevo correo. Hasta confirmar los dos, sigue iniciando sesión con tu correo actual.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Por seguridad, el cambio solo se aplica cuando confirmes los dos enlaces: el que llega a tu correo actual y el que llega al nuevo.
        </p>
        <Button type="submit" className="w-full" disabled={busy}>Enviar confirmación</Button>
      </form>
    </Card>
  );
}

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
    <div className="container mx-auto px-4 py-12 max-w-xl space-y-6">
      <ProfileCard />
      <EmailCard />
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
