import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPublicProjects } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { SECTORS, UNIT_LABEL, SDG_INFO } from "@/lib/sectors";
import type { Sector, RecordUnit, ProjectStatus } from "@/lib/sectors";

export const Route = createFileRoute("/proyectos")({
  head: () => ({
    meta: [
      { title: "Proyectos — Bio Tokens" },
      { name: "description", content: "Catálogo público de proyectos certificados de reducción de emisiones." },
      { property: "og:title", content: "Proyectos verificados — Bio Tokens" },
      { property: "og:description", content: "Explora proyectos ambientales con certificados blockchain." },
    ],
  }),
  component: Projects,
});

const STATUS_LABEL: Record<ProjectStatus, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  verificado: "Verificado",
  activo: "Activo",
  rechazado: "Rechazado",
};

function Projects() {
  const fn = useServerFn(listPublicProjects);
  const q = useQuery({ queryKey: ["public-projects"], queryFn: () => fn() });
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold">Proyectos</h1>
          <p className="text-muted-foreground mt-2">Cada proyecto emite certificados blockchain según su impacto medido.</p>
        </div>
        <Button asChild>
          <Link to="/_authenticated/proyectos-nuevos">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo proyecto
          </Link>
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {q.isLoading && <p>Cargando…</p>}
        {(q.data?.projects ?? []).length === 0 && !q.isLoading && (
          <p className="text-muted-foreground">Aún no hay proyectos. ¡Sé el primero en publicar uno!</p>
        )}
        {(q.data?.projects ?? []).map((p) => (
          <Link
            key={p.id}
            to="/proyectos/$id/panel"
            params={{ id: p.id }}
            className="focus:outline-none focus:ring-2 focus:ring-ring rounded-xl"
          >
            <Card className="p-5 cursor-pointer h-full transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent shrink-0">
                  {STATUS_LABEL[p.status as ProjectStatus]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{SECTORS[p.sector as Sector].es} · {p.country ?? "—"}</p>
              <p className="text-sm mt-3 line-clamp-3">{p.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {SECTORS[p.sector as Sector].sdgs.map((n) => (
                  <span key={n} className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: SDG_INFO[n].color }}>ODS {n}</span>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Unidad: {UNIT_LABEL[p.unit as RecordUnit].es}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
