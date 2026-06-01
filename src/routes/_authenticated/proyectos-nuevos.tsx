import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createProject } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SECTORS } from "@/lib/sectors";
import type { Sector } from "@/lib/sectors";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/proyectos-nuevos")({
  head: () => ({ meta: [{ title: "Nuevo proyecto — Bio Tokens" }] }),
  component: NewProject,
});

function NewProject() {
  const create = useServerFn(createProject);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [sector, setSector] = useState<Sector>("forestal");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await create({ data: { name, description: desc, sector, unit: SECTORS[sector].unit, country, location } });
      toast.success("Proyecto creado");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-3xl font-bold">Nuevo proyecto</h1>
      <Card className="p-6 mt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label>Nombre</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label>Sector</Label>
            <Select value={sector} onValueChange={(v) => setSector(v as Sector)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SECTORS).map(([k, s]) => (
                  <SelectItem key={k} value={k}>{s.es}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Unidad de certificado: {SECTORS[sector].assetCode}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>País</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
            <div><Label>Ubicación</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <div><Label>Descripción</Label><Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Crear proyecto"}</Button>
        </form>
      </Card>
    </div>
  );
}
