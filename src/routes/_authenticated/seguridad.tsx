import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, UserCircle, Mail, KeyRound } from "lucide-react";
import { generateMyRecoveryCodes, getMyRecoveryCodeCount } from "@/lib/mfa-recovery.functions";
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
  const [editing, setEditing] = useState(false);
  const [original, setOriginal] = useState({ fullName: "", organization: "", kind: "persona" as "persona" | "empresa" });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, organization, kind")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const next = {
            fullName: data.full_name ?? "",
            organization: data.organization ?? "",
            kind: (data.kind as "persona" | "empresa") ?? "persona",
          };
          setFullName(next.fullName);
          setOrganization(next.organization);
          setKind(next.kind);
          setOriginal(next);
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
    setOriginal({ fullName: fullName.trim(), organization: organization.trim(), kind });
    setEditing(false);
    toast.success("Perfil actualizado");
  };

  const cancel = () => {
    setFullName(original.fullName);
    setOrganization(original.organization);
    setKind(original.kind);
    setEditing(false);
  };

  const rows = [
    { label: "Nombre completo", value: original.fullName || "Sin definir" },
    { label: "Organización", value: original.organization || "Sin definir" },
    { label: "Tipo de cuenta", value: original.kind === "empresa" ? "Empresa" : "Persona" },
    { label: "Correo electrónico", value: user?.email ?? "Sin definir" },
  ];

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold flex items-center gap-2"><UserCircle className="h-6 w-6" /> Datos de perfil</h2>
      <p className="mt-2 text-sm text-muted-foreground">Esta información identifica tu cuenta en los proyectos y certificados.</p>
      {editing ? (
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
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={cancel} disabled={busy}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={busy || !loaded}>Guardar perfil</Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="mt-6 divide-y rounded-md border">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="truncate text-sm font-medium text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
          <Button className="mt-6 w-full" onClick={() => setEditing(true)} disabled={!loaded}>Editar perfil</Button>
        </>
      )}
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

function PasswordCard() {
  const [next, setNext] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("La nueva contraseña debe tener al menos 8 caracteres");
    if (next !== confirmPwd) return toast.error("Las contraseñas nuevas no coinciden");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    // Close every other session of this account, keeping only this one.
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    if (signOutError) {
      toast.success("Contraseña actualizada, pero no se pudieron cerrar las demás sesiones");
    } else {
      toast.success("Contraseña actualizada. Las demás sesiones se cerraron.");
    }
    setNext(""); setConfirmPwd("");
  };

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="h-6 w-6" /> Cambiar contraseña</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Elige una contraseña de al menos 8 caracteres. Las demás sesiones de tu cuenta se cerrarán.
      </p>
      <form onSubmit={change} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="newPwd">Nueva contraseña</Label>
          <Input id="newPwd" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="confirmPwd">Confirmar nueva contraseña</Label>
          <Input id="confirmPwd" type="password" autoComplete="new-password" required minLength={8} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>Actualizar contraseña</Button>
      </form>
    </Card>
  );
}

function RecoveryCodes() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => getMyRecoveryCodeCount().then((r) => setRemaining(r.remaining)).catch(() => {});
  useEffect(() => { refresh(); }, []);
  const gen = async () => {
    if (remaining && !confirm("Los códigos anteriores dejarán de funcionar. ¿Continuar?")) return;
    setBusy(true);
    try {
      const r = await generateMyRecoveryCodes();
      setCodes(r.codes); setRemaining(r.codes.length);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  const download = () => {
    if (!codes) return;
    const blob = new Blob([`Bio Tokens — códigos de recuperación\n\n${codes.join("\n")}\n`], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "biotokens-recovery-codes.txt"; a.click();
  };
  return (
    <div className="mt-6 rounded-md border p-4 space-y-3">
      <h2 className="font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4" /> Códigos de recuperación</h2>
      <p className="text-xs text-muted-foreground">Úsalos si pierdes tu app autenticadora. Cada código sirve una sola vez. Disponibles: {remaining ?? "…"}</p>
      {codes && (
        <>
          <p className="text-xs font-medium text-destructive">Guárdalos ahora: no se volverán a mostrar.</p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">{codes.map((c) => <li key={c} className="rounded bg-muted px-2 py-1 text-center">{c}</li>)}</ul>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(codes.join("\n")); toast.success("Copiados"); }}>Copiar</Button>
            <Button size="sm" variant="outline" onClick={download}>Descargar</Button>
          </div>
        </>
      )}
      <Button size="sm" onClick={gen} disabled={busy}>{remaining ? "Generar nuevos códigos" : "Generar códigos"}</Button>
    </div>
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
            <RecoveryCodes />
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
      <ProfileCard />
      <PasswordCard />
    </div>
  );
}
