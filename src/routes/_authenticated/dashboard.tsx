import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyStats, listMyProjects } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Coins, ListChecks, ShieldCheck } from "lucide-react";
import { SECTORS, UNIT_LABEL } from "@/lib/sectors";
import type { Sector, RecordUnit, ProjectStatus } from "@/lib/sectors";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Panel — Bio Tokens" }] }),
  component: Dashboard,
});

function Dashboard() {
  const stats = useServerFn(getMyStats);
  const list = useServerFn(listMyProjects);
  const sq = useQuery({ queryKey: ["my-stats"], queryFn: () => stats() });
  const pq = useQuery({ queryKey: ["my-projects"], queryFn: () => list() });

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mi panel</h1>
        <Button asChild><Link to="/proyectos-nuevos">Nuevo proyecto</Link></Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard icon={ListChecks} label="Proyectos" value={sq.data?.projects ?? 0} />
        <StatCard icon={ShieldCheck} label="Verificados" value={sq.data?.verified ?? 0} />
        <StatCard icon={Leaf} label="Registros" value={sq.data?.records ?? 0} />
        <StatCard icon={Coins} label="Tokens emitidos" value={sq.data?.tokens ?? 0} />
      </div>

      <h2 className="text-xl font-semibold mt-10">Mis proyectos</h2>
      <div className="mt-4 grid gap-3">
        {pq.isLoading ? <p className="text-muted-foreground">Cargando…</p> : null}
        {(pq.data?.projects ?? []).length === 0 && !pq.isLoading ? (
          <Card className="p-6 text-center text-muted-foreground">
            Aún no tienes proyectos. <Link to="/proyectos-nuevos" className="underline">Crea el primero</Link>.
          </Card>
        ) : null}
        {(pq.data?.projects ?? []).map((p) => (
          <Link key={p.id} to="/proyectos/$id" params={{ id: p.id }} className="rounded-xl focus:outline-none focus:ring-2 focus:ring-ring">
            <Card className="p-4 flex items-center justify-between gap-4 transition-shadow hover:shadow-md">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {SECTORS[p.sector as Sector][/* default es */ "es"]} · {UNIT_LABEL[p.unit as RecordUnit].es} · {p.country ?? "—"}
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-accent">{statusLabel(p.status as ProjectStatus)}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function statusLabel(s: ProjectStatus) {
  return { borrador: "Borrador", en_revision: "En revisión", verificado: "Verificado", activo: "Activo", rechazado: "Rechazado" }[s];
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className="p-5">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="mt-3 text-3xl font-bold">{Number(value).toLocaleString()}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  );
}
