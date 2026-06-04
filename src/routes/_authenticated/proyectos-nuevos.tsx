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
import { CheckCircle2, MapPin, Loader2 } from "lucide-react";

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
  const [detecting, setDetecting] = useState(false);
  const [created, setCreated] = useState<CreatedProject | null>(null);

  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Tu navegador no soporta geolocalización");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`,
          );
          const data = await res.json();
          const detectedCountry: string = data.countryName ?? "";
          const detectedDept: string = data.principalSubdivision ?? "";
          const detectedCity: string =
            data.city || data.locality || data.localityInfo?.administrative?.[3]?.name || "";

          const matchedCountry = COUNTRIES.find(
            (c) => normalize(c) === normalize(detectedCountry),
          );
          if (!matchedCountry) {
            toast.warning(`País detectado: ${detectedCountry}. No está en la lista, edítalo manualmente.`);
            setDetecting(false);
            return;
          }
          setCountry(matchedCountry);
          const depts = Object.keys(GEO[matchedCountry].departments);
          const matchedDept =
            depts.find((d) => normalize(d) === normalize(detectedDept)) ||
            depts.find((d) => normalize(d).includes(normalize(detectedDept)) || normalize(detectedDept).includes(normalize(d)));
          if (matchedDept) {
            setDepartment(matchedDept);
            const cities = GEO[matchedCountry].departments[matchedDept];
            const matchedCity =
              cities.find((c) => normalize(c) === normalize(detectedCity)) ||
              cities.find((c) => normalize(c).includes(normalize(detectedCity)) || normalize(detectedCity).includes(normalize(c)));
            if (matchedCity) setCity(matchedCity);
            else setCity("");
          } else {
            setDepartment("");
            setCity("");
          }
          toast.success("Ubicación detectada. Puedes ajustarla manualmente.");
        } catch {
          toast.error("No se pudo obtener la ubicación");
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        toast.error(err.code === 1 ? "Permiso de ubicación denegado" : "No se pudo obtener la ubicación");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

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
        country: country || undefined,
        location: [department, city].filter(Boolean).join(", ") || undefined,
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
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label>Ubicación</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                disabled={detecting}
              >
                {detecting ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Detectando…</>
                ) : (
                  <><MapPin className="h-3.5 w-3.5 mr-1.5" />Detectar ubicación</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Autocompleta con geolocalización aproximada. Puedes editarla manualmente.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>País</Label>
              <Select value={country} onValueChange={(v) => { setCountry(v); setDepartment(""); setCity(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecciona país" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{country ? GEO[country].departmentLabel : "Departamento"}</Label>
              <Select
                value={department}
                onValueChange={(v) => { setDepartment(v); setCity(""); }}
                disabled={!country}
              >
                <SelectTrigger><SelectValue placeholder={country ? "Selecciona" : "Elige país primero"} /></SelectTrigger>
                <SelectContent>
                  {country && Object.keys(GEO[country].departments).map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ciudad</Label>
              <Select value={city} onValueChange={setCity} disabled={!department}>
                <SelectTrigger><SelectValue placeholder={department ? "Selecciona ciudad" : "Elige depto. primero"} /></SelectTrigger>
                <SelectContent>
                  {country && department && GEO[country].departments[department].map((ci) => (
                    <SelectItem key={ci} value={ci}>{ci}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
