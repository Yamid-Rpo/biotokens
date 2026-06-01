import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto — Bio Tokens" },
      { name: "description", content: "Habla con el equipo de Bio Tokens." },
      { property: "og:title", content: "Contacto — Bio Tokens" },
      { property: "og:description", content: "Soporte, ventas y alianzas." },
    ],
  }),
  component: Contacto,
});

function Contacto() {
  const [sent, setSent] = useState(false);
  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <h1 className="text-4xl font-bold">Contacto</h1>
      <Card className="p-6 mt-6">
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success("Mensaje enviado"); }} className="space-y-4">
          <div><Label>Nombre</Label><Input required /></div>
          <div><Label>Correo</Label><Input type="email" required /></div>
          <div><Label>Mensaje</Label><Textarea required rows={5} /></div>
          <Button type="submit" disabled={sent}>{sent ? "Enviado" : "Enviar"}</Button>
        </form>
      </Card>
    </div>
  );
}
