import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SECTORS, UNIT_LABEL, SDG_INFO } from "@/lib/sectors";
import type { Sector, RecordUnit, ProjectStatus } from "@/lib/sectors";
import { ArrowLeft } from "lucide-react";
import { SectorInfoCards } from "@/components/SectorInfoCards";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/proyectos/$id/")({
  head: ({ params }) => ({
    meta: [
      { title: `Proyecto — Bio Tokens` },
      { name: "description", content: `Detalles del proyecto ${params.id}` },
    ],
  }),
  component: ProjectDetail,
  errorComponent: ({ error }) => (
    <div className="container mx-auto px-4 py-12" role="alert">
      No se pudo cargar el proyecto: {(error as Error).message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-12">Proyecto no encontrado.</div>
  ),
});

const STATUS_LABEL: Record<ProjectStatus, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  verificado: "Verificado",
  activo: "Activo",
  rechazado: "Rechazado",
};

function ProjectDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getProject);
  const { user } = useAuth();
  const q = useQuery({ queryKey: ["project", id], queryFn: () => fn({ data: { id } }) });

  if (q.isLoading) return <div className="container mx-auto px-4 py-12">Cargando…</div>;
  const project = q.data?.project;
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-muted-foreground">Proyecto no encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/proyectos"><ArrowLeft className="h-4 w-4" /> Volver a Proyectos</Link>
        </Button>
      </div>
    );
  }
  const sector = project.sector as Sector;
  const unit = project.unit as RecordUnit;
  const records = q.data?.records ?? [];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/proyectos"><ArrowLeft className="h-4 w-4" /> Proyectos</Link>
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {SECTORS[sector].es} · {project.country ?? "—"}{project.location ? ` · ${project.location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-accent">
            {STATUS_LABEL[project.status as ProjectStatus]}
          </span>
          <Button asChild size="sm">
            <Link to="/proyectos/$id/panel" params={{ id: project.id }}>Panel de verificación</Link>
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {SECTORS[sector].sdgs.map((n) => (
          <span key={n} className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: SDG_INFO[n].color }}>
            ODS {n} — {SDG_INFO[n].es}
          </span>
        ))}
      </div>

      {project.description && (
        <Card className="p-5 mt-6">
          <h2 className="font-semibold">Descripción</h2>
          <p className="text-sm mt-2 whitespace-pre-wrap">{project.description}</p>
        </Card>
      )}

      <SectorInfoCards
        key={project.updated_at}
        projectId={project.id}
        sector={sector}
        details={((project as any).details ?? {}) as Record<string, string>}
        current={((project as any).current_info ?? {}) as Record<string, string>}
        canEdit={user?.id === project.owner_id}
      />

      <div className="grid sm:grid-cols-3 gap-3 mt-6">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Unidad de medición</div>
          <div className="font-semibold mt-1">{UNIT_LABEL[unit].es}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Certificado</div>
          <div className="font-semibold mt-1">{SECTORS[sector].assetCode}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Tokens emitidos</div>
          <div className="font-semibold mt-1">{Number(project.total_tokens || 0).toLocaleString()}</div>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-10">Registros ambientales</h2>
      <div className="mt-3 grid gap-2">
        {records.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">Aún no hay registros para este proyecto.</Card>
        ) : (
          records.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{Number(r.amount).toLocaleString()} {UNIT_LABEL[r.unit as RecordUnit].es}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.recorded_at).toLocaleString()}</div>
                {r.notes && <div className="text-xs mt-1">{r.notes}</div>}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.verified ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                {r.verified ? "Verificado" : "Pendiente"}
              </span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
