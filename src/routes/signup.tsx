import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Crear cuenta — Bio Tokens" }, { name: "description", content: "Crea tu cuenta en Bio Tokens." }] }),
  component: Signup,
});

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"persona" | "empresa">("persona");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, kind },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Revisa tu correo para confirmar la cuenta");
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="p-8">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Nombre o razón social</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Tipo de cuenta</Label>
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as "persona" | "empresa")} className="flex gap-4 mt-2">
              <div className="flex items-center gap-2"><RadioGroupItem id="r1" value="persona" /><Label htmlFor="r1">Persona</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem id="r2" value="empresa" /><Label htmlFor="r2">Empresa</Label></div>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pwd">Contraseña</Label>
            <Input id="pwd" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground text-center">
          ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-foreground">Inicia sesión</Link>
        </p>
      </Card>
    </div>
  );
}
