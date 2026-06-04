import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { createProject } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SECTORS } from "@/lib/sectors";
import type { Sector } from "@/lib/sectors";
import { GEO, COUNTRIES } from "@/lib/geo";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/proyectos-nuevos")({
  head: () => ({ meta: [{ title: "Nuevo proyecto — Bio Tokens" }] }),
  component: NewProject,
});

type CreatedProject = {
  id?: string;
  name: string;
  sector: Sector;
  unit: string;
  country?: string;
  location?: string;
  description?: string;
};

function NewProject() {
  const create = useServerFn(createProject);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [sector, setSector] = useState<Sector>("forestal");
  const [country, setCountry] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedProject | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await create({
        data: {
          name: name.trim(),
          description: desc.trim() || undefined,
          sector,
          unit: SECTORS[sector].unit,
          country: country || undefined,
          location: [department, city].filter(Boolean).join(", ") || undefined,
        },
      });
      toast.success("Proyecto creado");
      queryClient.invalidateQueries({ queryKey: ["public-projects"] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      queryClient.invalidateQueries({ queryKey: ["my-stats"] });
      setCreated({
        id: res?.project?.id,
        name: name.trim(),
        sector,
        unit: SECTORS[sector].unit,
        country: country.trim() || undefined,
        location: location.trim() || undefined,
        description: desc.trim() || undefined,
      });
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

      <Dialog open={!!created} onOpenChange={(o) => { if (!o) setCreated(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Proyecto creado con éxito
            </DialogTitle>
            <DialogDescription>
              Estos son los datos guardados de tu nuevo proyecto.
            </DialogDescription>
          </DialogHeader>
          {created && (
            <dl className="space-y-2 text-sm">
              <Row label="Nombre" value={created.name} />
              <Row label="Sector" value={SECTORS[created.sector].es} />
              <Row label="Unidad de certificado" value={SECTORS[created.sector].assetCode} />
              {created.country && <Row label="País" value={created.country} />}
              {created.location && <Row label="Ubicación" value={created.location} />}
              {created.description && <Row label="Descripción" value={created.description} />}
            </dl>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/proyectos" })}>
              Ir a Proyectos
            </Button>
            <Button onClick={() => navigate({ to: "/dashboard" })}>
              Ir al Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground min-w-32">{label}:</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}
