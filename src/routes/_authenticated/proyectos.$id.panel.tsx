import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SECTORS, UNIT_LABEL, SDG_INFO } from "@/lib/sectors";
import type { Sector, RecordUnit } from "@/lib/sectors";
import {
  ArrowLeft, Activity, ShieldCheck, Link2, BarChart3, FileCheck2,
  Brain, Settings2, Bell, Users, Award, MapPin, Wifi, WifiOff, Battery,
  AlertTriangle, CheckCircle2, Upload, Hash, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/proyectos/$id/panel")({
  head: () => ({ meta: [{ title: "Panel de verificación — Bio Tokens" }] }),
  component: PanelPage,
});

// Sensor templates by sector — UI only
const SENSORS_BY_SECTOR: Record<Sector, { id: string; type: string; status: "online" | "offline"; battery: number; freq: string }[]> = {
  forestal: [
    { id: "FOR-001", type: "Humedad del suelo", status: "online", battery: 87, freq: "5 min" },
    { id: "FOR-002", type: "Crecimiento (dendrómetro)", status: "online", battery: 64, freq: "1 h" },
    { id: "FOR-003", type: "CO₂ capturado (flux)", status: "offline", battery: 12, freq: "10 min" },
  ],
  agricola: [
    { id: "AGR-001", type: "Fertilización NPK", status: "online", battery: 92, freq: "30 min" },
    { id: "AGR-002", type: "Riego (caudalímetro)", status: "online", battery: 71, freq: "1 min" },
    { id: "AGR-003", type: "Emisión N₂O", status: "online", battery: 55, freq: "15 min" },
  ],
  energia_limpia: [
    { id: "ENE-001", type: "Producción kWh", status: "online", battery: 100, freq: "1 min" },
    { id: "ENE-002", type: "Irradiancia solar", status: "online", battery: 90, freq: "5 min" },
  ],
  movilidad_electrica: [
    { id: "MOV-001", type: "GPS + odómetro", status: "online", battery: 78, freq: "1 min" },
    { id: "MOV-002", type: "Consumo kWh", status: "online", battery: 81, freq: "5 min" },
  ],
  recuperacion_agua: [
    { id: "H2O-001", type: "Caudal de entrada", status: "online", battery: 68, freq: "1 min" },
    { id: "H2O-002", type: "Calidad (turbidez)", status: "online", battery: 73, freq: "10 min" },
  ],
  transformacion_residuos: [
    { id: "RES-001", type: "Báscula de entrada", status: "online", battery: 95, freq: "evento" },
    { id: "RES-002", type: "Báscula de salida", status: "online", battery: 88, freq: "evento" },
  ],
  captura_co2: [
    { id: "CO2-001", type: "Flujo de captura", status: "online", battery: 60, freq: "5 min" },
    { id: "CO2-002", type: "Presión de almacenamiento", status: "online", battery: 82, freq: "5 min" },
  ],
};

const CONFIG_FIELDS: Record<Sector, string[]> = {
  forestal: ["Biomasa (t/ha)", "Densidad (árboles/ha)", "Absorción CO₂ (kg/m²)"],
  agricola: ["Uso de fertilizantes", "Tipo de suelo", "Consumo de agua"],
  energia_limpia: ["Producción (kWh)", "Fuente", "Eficiencia (%)"],
  movilidad_electrica: ["Km recorridos", "Tipo de vehículo", "kWh/100km"],
  recuperacion_agua: ["Volumen tratado", "Reutilización (%)", "Calidad final"],
  transformacion_residuos: ["Tipo de residuo", "Reducción de emisiones", "Destino"],
  captura_co2: ["Volumen capturado", "Tecnología", "Almacenamiento"],
};

function PanelPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getProject);
  const q = useQuery({ queryKey: ["project", id], queryFn: () => fn({ data: { id } }) });

  if (q.isLoading) return <div className="container mx-auto px-4 py-12">Cargando panel…</div>;
  const project = q.data?.project;
  if (!project) return <div className="container mx-auto px-4 py-12">Proyecto no encontrado.</div>;
  const sector = project.sector as Sector;
  const records = q.data?.records ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/proyectos/$id" params={{ id }}><ArrowLeft className="h-4 w-4" /> Volver al proyecto</Link>
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Panel de verificación · {project.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {SECTORS[sector].es} · {project.country ?? "—"}{project.location ? ` · ${project.location}` : ""}
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {SECTORS[sector].sdgs.map((n) => (
            <span key={n} className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: SDG_INFO[n].color }}>
              ODS {n}
            </span>
          ))}
        </div>
      </div>

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1">
          <TabsTrigger value="realtime"><Activity className="h-3.5 w-3.5 mr-1" />Tiempo real</TabsTrigger>
          <TabsTrigger value="validation"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Validación</TabsTrigger>
          <TabsTrigger value="cert"><Link2 className="h-3.5 w-3.5 mr-1" />Certificación</TabsTrigger>
          <TabsTrigger value="impact"><BarChart3 className="h-3.5 w-3.5 mr-1" />Impacto</TabsTrigger>
          <TabsTrigger value="evidence"><FileCheck2 className="h-3.5 w-3.5 mr-1" />Evidencias</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="h-3.5 w-3.5 mr-1" />IA</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-3.5 w-3.5 mr-1" />Configuración</TabsTrigger>
          <TabsTrigger value="alerts"><Bell className="h-3.5 w-3.5 mr-1" />Alertas</TabsTrigger>
          <TabsTrigger value="roles"><Users className="h-3.5 w-3.5 mr-1" />Roles</TabsTrigger>
          <TabsTrigger value="standards"><Award className="h-3.5 w-3.5 mr-1" />Estándares</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="mt-6"><RealtimeTab sector={sector} /></TabsContent>
        <TabsContent value="validation" className="mt-6"><ValidationTab records={records} /></TabsContent>
        <TabsContent value="cert" className="mt-6"><CertTab project={project} records={records} /></TabsContent>
        <TabsContent value="impact" className="mt-6"><ImpactTab records={records} /></TabsContent>
        <TabsContent value="evidence" className="mt-6"><EvidenceTab /></TabsContent>
        <TabsContent value="ai" className="mt-6"><AiTab sector={sector} records={records} /></TabsContent>
        <TabsContent value="config" className="mt-6"><ConfigTab sector={sector} /></TabsContent>
        <TabsContent value="alerts" className="mt-6"><AlertsTab /></TabsContent>
        <TabsContent value="roles" className="mt-6"><RolesTab /></TabsContent>
        <TabsContent value="standards" className="mt-6"><StandardsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Placeholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-2">{children}</div>
      <Badge variant="outline" className="mt-4">Próximamente</Badge>
    </Card>
  );
}

function RealtimeTab({ sector }: { sector: Sector }) {
  const sensors = SENSORS_BY_SECTOR[sector] ?? [];
  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3"><MapPin className="h-4 w-4" /><h3 className="font-semibold">Mapa geoespacial de sensores</h3></div>
        <div className="aspect-[2/1] rounded-lg bg-muted/50 border border-dashed flex items-center justify-center text-sm text-muted-foreground">
          Mapa de sensores activos (integración con Mapbox/Leaflet — próximamente)
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Sensores activos ({sensors.length})</h3>
        <div className="grid gap-2">
          {sensors.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-md border">
              <div className="flex items-center gap-3">
                {s.status === "online" ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
                <div>
                  <div className="font-medium text-sm">{s.id} · {s.type}</div>
                  <div className="text-xs text-muted-foreground">Frecuencia: {s.freq}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Battery className="h-4 w-4" /> {s.battery}%
                <Badge variant={s.status === "online" ? "default" : "destructive"}>{s.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Placeholder title="Gráficas dinámicas en tiempo real">
        Series temporales por sensor (websocket/realtime). Requiere conectar dispositivos IoT vía MQTT/HTTP webhook.
      </Placeholder>
    </div>
  );
}

function ValidationTab({ records }: { records: Array<{ verified: boolean; amount: number }> }) {
  const total = records.length;
  const verified = records.filter((r) => r.verified).length;
  return (
    <div className="grid gap-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Registros totales</div><div className="text-2xl font-bold">{total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Verificados</div><div className="text-2xl font-bold text-primary">{verified}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Anomalías detectadas</div><div className="text-2xl font-bold">0</div></Card>
      </div>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Reglas activas</h3>
        <ul className="text-sm space-y-2">
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Validación de rango por unidad</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Timestamp + firma del dispositivo</li>
          <li className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" /> Detección de outliers (próximamente)</li>
        </ul>
      </Card>
    </div>
  );
}

function CertTab({ project, records }: { project: { id: string; total_tokens: number }; records: Array<{ verified: boolean; amount: number; unit: string }> }) {
  const [hash, setHash] = useState<string | null>(null);
  const pending = records.filter((r) => r.verified);
  const sum = pending.reduce((s, r) => s + Number(r.amount), 0);

  const certify = () => {
    const fake = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
    setHash(fake);
    toast.success("Lote certificado (simulación). Integración con Stellar próximamente.");
  };

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Resumen del lote a certificar</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div><div className="text-muted-foreground text-xs">Registros verificados</div><div className="font-semibold">{pending.length}</div></div>
          <div><div className="text-muted-foreground text-xs">Volumen total</div><div className="font-semibold">{sum.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground text-xs">Tokens emitidos</div><div className="font-semibold">{Number(project.total_tokens).toLocaleString()}</div></div>
        </div>
        <Button className="mt-4" onClick={certify} disabled={pending.length === 0}>
          <Hash className="h-4 w-4" /> Certificar lote de datos
        </Button>
        {hash && (
          <div className="mt-4 p-3 rounded-md bg-muted text-xs font-mono break-all">
            Hash: {hash}
          </div>
        )}
      </Card>
      <Placeholder title="Historial de certificaciones">
        Lista de hashes con enlace a Stellar Explorer. Integración blockchain en próxima iteración.
      </Placeholder>
    </div>
  );
}

function ImpactTab({ records }: { records: Array<{ amount: number; unit: string; verified: boolean; recorded_at: string }> }) {
  const kpis = useMemo(() => {
    const sum = (u: string) => records.filter((r) => r.unit === u).reduce((s, r) => s + Number(r.amount), 0);
    return {
      co2: sum("kg_co2_reducido"),
      kwh: sum("kwh_renovable"),
      agua: sum("l_agua_recuperada"),
      residuos: sum("kg_residuos_transformados"),
      forestal: sum("m2_reforestado"),
      agricola: sum("m2_agricola"),
    };
  }, [records]);

  return (
    <div className="grid gap-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="CO₂ reducido / capturado" value={`${kpis.co2.toLocaleString()} kg`} />
        <Kpi label="Energía renovable" value={`${kpis.kwh.toLocaleString()} kWh`} />
        <Kpi label="Agua recuperada" value={`${kpis.agua.toLocaleString()} L`} />
        <Kpi label="Residuos transformados" value={`${kpis.residuos.toLocaleString()} kg`} />
        <Kpi label="Área reforestada" value={`${kpis.forestal.toLocaleString()} m²`} />
        <Kpi label="Área agrícola sostenible" value={`${kpis.agricola.toLocaleString()} m²`} />
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Evolución temporal</h3>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" />Exportar</Button>
        </div>
        <div className="aspect-[3/1] rounded-lg bg-muted/50 border border-dashed flex items-center justify-center text-sm text-muted-foreground">
          {records.length === 0 ? "Aún no hay registros para graficar." : `${records.length} registros · gráfica próximamente`}
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function EvidenceTab() {
  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Subir evidencia</h3>
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
          <Upload className="h-6 w-6 mx-auto mb-2" />
          Arrastra fotos de campo, reportes técnicos o certificados externos
          <div className="mt-3"><Button variant="outline" size="sm" disabled>Seleccionar archivos</Button></div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Almacenamiento y firma digital en próxima iteración.</p>
      </Card>
      <Placeholder title="Timeline de evidencias">Línea temporal con vínculos a sensores y lotes certificados.</Placeholder>
    </div>
  );
}

function AiTab({ sector, records }: { sector: Sector; records: unknown[] }) {
  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-2">Predicciones y recomendaciones</h3>
        <p className="text-sm text-muted-foreground">
          Basado en {records.length} registros del sector <strong>{SECTORS[sector].es}</strong>.
        </p>
        <div className="mt-3 p-3 rounded-md bg-accent/50 text-sm">
          💡 Sugerencia: continúa el ritmo actual para proyectar +12% de impacto en 6 meses.
        </div>
        <Badge variant="outline" className="mt-3">Modelo IA próximamente</Badge>
      </Card>
    </div>
  );
}

function ConfigTab({ sector }: { sector: Sector }) {
  const fields = CONFIG_FIELDS[sector] ?? [];
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Variables clave · {SECTORS[sector].es}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f} className="p-3 rounded-md border">
            <div className="text-xs text-muted-foreground">{f}</div>
            <div className="text-sm mt-1 text-muted-foreground">— sin configurar —</div>
          </div>
        ))}
      </div>
      <Badge variant="outline" className="mt-4">Formularios adaptativos próximamente</Badge>
    </Card>
  );
}

function AlertsTab() {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Sistema de alertas</h3>
      <ul className="text-sm space-y-2">
        <li className="flex items-center gap-2"><Bell className="h-4 w-4" /> Fallos en sensores</li>
        <li className="flex items-center gap-2"><Bell className="h-4 w-4" /> Valores atípicos</li>
        <li className="flex items-center gap-2"><Bell className="h-4 w-4" /> Certificaciones pendientes</li>
        <li className="flex items-center gap-2"><Bell className="h-4 w-4" /> Alertas regulatorias</li>
      </ul>
      <p className="text-xs text-muted-foreground mt-4">Sin alertas activas.</p>
    </Card>
  );
}

function RolesTab() {
  const roles = [
    { name: "Operador de campo", desc: "Registra datos y evidencias en sitio" },
    { name: "Auditor", desc: "Revisa y valida lotes de datos" },
    { name: "Administrador", desc: "Configura el proyecto y emite certificados" },
    { name: "Verificador externo", desc: "Firma certificaciones con estándar internacional" },
  ];
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Roles del proyecto</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {roles.map((r) => (
          <div key={r.name} className="p-3 rounded-md border">
            <div className="font-medium text-sm">{r.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StandardsTab() {
  const standards = ["ISO 14064", "Gold Standard", "Verra (VCS)"];
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Cumplimiento y estándares</h3>
      <div className="flex flex-wrap gap-2">
        {standards.map((s) => (
          <Badge key={s} variant="outline">{s}</Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4">Integración con organismos verificadores próximamente.</p>
    </Card>
  );
}
