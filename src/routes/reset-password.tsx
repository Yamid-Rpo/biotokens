import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Restablecer contraseña — Bio Tokens" }] }),
  component: Reset,
});

function Reset() {
  const [email, setEmail] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) setRecovery(true);
  }, []);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else toast.success("Revisa tu correo");
  };

  const updatePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) toast.error(error.message); else toast.success("Contraseña actualizada");
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="p-8">
        <h1 className="text-2xl font-bold">{recovery ? "Nueva contraseña" : "Restablecer contraseña"}</h1>
        {recovery ? (
          <form onSubmit={updatePwd} className="mt-6 space-y-4">
            <div><Label htmlFor="np">Nueva contraseña</Label><Input id="np" type="password" required minLength={8} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></div>
            <Button type="submit" className="w-full">Actualizar</Button>
          </form>
        ) : (
          <form onSubmit={sendReset} className="mt-6 space-y-4">
            <div><Label htmlFor="e">Correo</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button type="submit" className="w-full">Enviar enlace</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
