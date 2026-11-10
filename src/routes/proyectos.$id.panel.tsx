import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "@/lib/projects.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SECTORS, UNIT_LABEL, SDG_INFO, SENSOR_CREDENTIALS_BY_SECTOR } from "@/lib/sectors";
import type { Sector, RecordUnit } from "@/lib/sectors";
import {
  ArrowLeft, Activity, ShieldCheck, Link2, BarChart3, FileCheck2,
  Brain, Settings2, Bell, Users, Award, MapPin, Wifi, WifiOff, Battery,
  AlertTriangle, CheckCircle2, Upload, Hash, Download, Cpu, Copy, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { registerDevice, listDevices, revokeDevice, listDeviceReadings, listProjectReadingHistory } from "@/lib/iot.functions";
import { Input } from "@/components/ui/input";
import { EmbeddedIDE } from "@/components/EmbeddedIDE";
import { useIdeSnapshot, parseIdeConfig, firmwareHash } from "@/lib/ide-store";
import type { IdeSnapshot, IdeConfig } from "@/lib/ide-store";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/proyectos/$id/panel")({
  head: () => ({ meta: [{ title: "Panel de verificación — Bio Tokens" }] }),
  component: PanelPage,
});




function PanelPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getProject);
  const q = useQuery({ queryKey: ["project", id], queryFn: () => fn({ data: { id } }) });
  const fetchDevices = useServerFn(listDevices);
  const fetchHistory = useServerFn(listProjectReadingHistory);
  const devicesQ = useQuery({
    queryKey: ["iot-devices", id],
    queryFn: () => fetchDevices({ data: { project_id: id } }),
    refetchInterval: 15000,
  });
  const historyQ = useQuery({
    queryKey: ["iot-history", id],
    queryFn: () => fetchHistory({ data: { project_id: id, limit: 1000 } }),
    refetchInterval: 15000,
    retry: false,
  });
  const ide = useIdeSnapshot(id);
  const cfg = useMemo(() => parseIdeConfig(ide.files["/main.py"] ?? ""), [ide.files]);
  // The IDE's main.py is the single reference: only the device it targets
  // (and its configured metric) feeds the panel tabs.
  const allDevices = (devicesQ.data?.devices ?? []) as IotDevice[];
  const allReadings = (historyQ.data?.readings ?? []) as IotReading[];
  const panelData: PanelData = {
    devices: cfg.device ? allDevices.filter((d) => d.id === cfg.device) : [],
    readings: cfg.device
      ? allReadings.filter((r) => r.device_id === cfg.device && (!cfg.metric || r.metric === cfg.metric))
      : [],
    signedIn: !historyQ.isError,
    loading: devicesQ.isLoading || historyQ.isLoading,
    ide, cfg,
  };

  if (q.isLoading) return <div className="container mx-auto px-4 py-12">Cargando panel…</div>;
  const project = q.data?.project;
  if (!project) return <div className="container mx-auto px-4 py-12">Proyecto no encontrado.</div>;
  const sector = project.sector as Sector;

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
          <TabsTrigger value="ide"><Cpu className="h-3.5 w-3.5 mr-1" />IDE</TabsTrigger>
        </TabsList>

      <IdeSourceBanner data={panelData} />

        <TabsContent value="realtime" className="mt-6"><RealtimeTab data={panelData} /></TabsContent>
        <TabsContent value="validation" className="mt-6"><ValidationTab data={panelData} /></TabsContent>
        <TabsContent value="cert" className="mt-6"><CertTab project={project} data={panelData} /></TabsContent>
        <TabsContent value="impact" className="mt-6"><ImpactTab data={panelData} /></TabsContent>
        <TabsContent value="evidence" className="mt-6"><EvidenceTab data={panelData} /></TabsContent>
        <TabsContent value="ai" className="mt-6"><AiTab sector={sector} data={panelData} /></TabsContent>
        <TabsContent value="config" className="mt-6"><ConfigTab sector={sector} data={panelData} /></TabsContent>
        <TabsContent value="alerts" className="mt-6"><AlertsTab data={panelData} /></TabsContent>
        <TabsContent value="roles" className="mt-6"><RolesTab data={panelData} /></TabsContent>
        <TabsContent value="standards" className="mt-6"><StandardsTab data={panelData} /></TabsContent>
        <TabsContent value="ide" className="mt-6"><EmbeddedIDE projectId={project.id} metric={SENSOR_CREDENTIALS_BY_SECTOR[sector].metric} unit={SENSOR_CREDENTIALS_BY_SECTOR[sector].unit} /></TabsContent>
      </Tabs>
    </div>
  );
}


// ---- Datos compartidos: todo proviene de los dispositivos ESP32 ----
type PanelData = { devices: IotDevice[]; readings: IotReading[]; signedIn: boolean; loading: boolean; ide: IdeSnapshot; cfg: IdeConfig };

function IdeSourceBanner({ data }: { data: PanelData }) {
  const { cfg, ide } = data;
  const failing = ide.tests.filter((t) => !t.ok).length;
  return (
    <Card className="p-3 mt-4 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="font-semibold flex items-center gap-1"><Cpu className="h-3.5 w-3.5" />Fuente: IDE</span>
      <span>Dispositivo: <span className="font-mono">{cfg.device ? `${cfg.device.slice(0, 8)}…` : "sin configurar"}</span></span>
      <span>Métrica: {cfg.metric ?? "—"} ({cfg.unit ?? "—"})</span>
      <span>Envío cada {cfg.interval ?? "—"} s · GPIO{cfg.pin ?? "—"}</span>
      <span>Placa: {ide.connected ? "conectada" : "sin conexión USB"}</span>
      <span>Errores: {ide.problems.length} · Pruebas fallidas: {failing}</span>
    </Card>
  );
}

const OFFLINE_AFTER_MS = 5 * 60 * 1000;
function isOnline(d: IotDevice) {
  return !!d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < OFFLINE_AFTER_MS;
}

// Anti-manipulación: valores no finitos, negativos o atípicos (mediana ± 6·MAD por métrica).
function analyze(readings: IotReading[]) {
  const byMetric = new Map<string, number[]>();
  for (const r of readings) {
    const arr = byMetric.get(r.metric) ?? [];
    arr.push(Number(r.value));
    byMetric.set(r.metric, arr);
  }
  const stats = new Map<string, { med: number; mad: number }>();
  for (const [m, vals] of byMetric) {
    const s = [...vals].sort((a, b) => a - b);
    const med = s[Math.floor(s.length / 2)] ?? 0;
    const dev = s.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
    stats.set(m, { med, mad: dev[Math.floor(dev.length / 2)] ?? 0 });
  }
  const anomalies = new Set<number>();
  for (const r of readings) {
    const v = Number(r.value);
    const st = stats.get(r.metric)!;
    const out = st.mad > 0 && byMetric.get(r.metric)!.length >= 5 && Math.abs(v - st.med) > 6 * st.mad;
    if (!Number.isFinite(v) || v < 0 || out) anomalies.add(r.id);
  }
  const valid = readings.filter((r) => !anomalies.has(r.id));
  return { anomalies, valid };
}

function groupSums(readings: IotReading[]) {
  const g = new Map<string, { metric: string; unit: string; sum: number; count: number; last: number }>();
  for (const r of readings) {
    const k = `${r.metric}|${r.unit ?? ""}`;
    const cur = g.get(k) ?? { metric: r.metric, unit: r.unit ?? "", sum: 0, count: 0, last: Number(r.value) };
    cur.sum += Number(r.value);
    cur.count += 1;
    g.set(k, cur);
  }
  return [...g.values()];
}

function EmptyState({ data }: { data: PanelData }) {
  if (data.loading) return <Card className="p-6 text-sm text-muted-foreground">Cargando datos de los dispositivos…</Card>;
  if (!data.signedIn) return <Card className="p-6 text-sm text-muted-foreground">Inicia sesión como propietario del proyecto para ver los datos de sus dispositivos ESP32.</Card>;
  if (!data.cfg.device) return (
    <Card className="p-6 text-sm text-muted-foreground">
      El IDE todavía no tiene un dispositivo. Abre la pestaña <strong>IDE</strong> y en <code>/main.py</code> pega el ID real del dispositivo en <code>DEVICE</code> y su clave en <code>KEY</code>; desde ese momento todas las pestañas usan solo esos datos.
    </Card>
  );
  return (
    <Card className="p-6 text-sm text-muted-foreground">
      Aún no hay lecturas. Instala y registra tu placa desde la pestaña <strong>IDE</strong>; sus datos aparecerán aquí automáticamente.
    </Card>
  );
}

function Sparkline({ points }: { points: IotReading[] }) {
  const pts = [...points].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)).slice(-60);
  if (pts.length < 2) return <div className="text-xs text-muted-foreground">Se necesitan al menos 2 lecturas para graficar.</div>;
  const vals = pts.map((p) => Number(p.value));
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * 300},${60 - ((v - min) / range) * 56 - 2}`).join(" ");
  return (
    <svg viewBox="0 0 300 60" className="w-full h-16 text-primary" preserveAspectRatio="none" role="img" aria-label="Gráfica de lecturas">
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RealtimeTab({ data }: { data: PanelData }) {
  const { devices, readings } = data;
  if (devices.length === 0) return <EmptyState data={data} />;
  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Sensores conectados a la placa ({devices.length})</h3>
        <div className="grid gap-3">
          {devices.map((d) => {
            const online = isOnline(d);
            const devReadings = readings.filter((r) => r.device_id === d.id);
            const metrics = [...new Set(devReadings.map((r) => r.metric))];
            const times = devReadings.map((r) => new Date(r.recorded_at).getTime()).sort((a, b) => b - a);
            const freq = times.length >= 2 ? Math.round((times[0] - times[Math.min(times.length - 1, 10)]) / Math.min(times.length - 1, 10) / 1000) : null;
            return (
              <div key={d.id} className="p-3 rounded-md border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {online ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
                    <div>
                      <div className="font-medium text-sm">{d.name} · {d.device_type}</div>
                      <div className="text-xs text-muted-foreground font-mono">ID {d.id.slice(0, 8)}…</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Frecuencia: {freq ? `${freq} s` : "—"}</span>
                    <Badge variant={online ? "default" : "destructive"}>{online ? "en línea" : "fuera de línea"}</Badge>
                  </div>
                </div>
                {metrics.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">Sin lecturas todavía.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    {metrics.map((m) => {
                      const mr = devReadings.filter((r) => r.metric === m);
                      return (
                        <div key={m} className="p-2 rounded bg-muted/40">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{m}</span>
                            <span>{Number(mr[0].value).toLocaleString()} {mr[0].unit ?? ""}</span>
                          </div>
                          <Sparkline points={mr} />
                          <div className="text-[11px] text-muted-foreground">Última: {new Date(mr[0].recorded_at).toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ValidationTab({ data }: { data: PanelData }) {
  const { readings, devices } = data;
  const { anomalies, valid } = useMemo(() => analyze(readings), [readings]);
  if (readings.length === 0) return <EmptyState data={data} />;
  const flagged = readings.filter((r) => anomalies.has(r.id)).slice(0, 20);
  const offline = devices.filter((d) => !isOnline(d));
  return (
    <div className="grid gap-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Kpi label="Lecturas totales" value={readings.length.toLocaleString()} />
        <Kpi label="Lecturas válidas" value={valid.length.toLocaleString()} />
        <Kpi label="Anomalías detectadas" value={anomalies.size.toLocaleString()} />
      </div>
      {(flagged.length > 0 || offline.length > 0) && (
        <Card className="p-5 border-destructive/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Alertas</h3>
          <ul className="text-sm space-y-1">
            {offline.map((d) => <li key={d.id}>🚩 Dispositivo fuera de línea: {d.name}</li>)}
            {flagged.map((r) => <li key={r.id}>🚩 Valor atípico: {r.metric} = {r.value} {r.unit ?? ""} ({new Date(r.recorded_at).toLocaleString()})</li>)}
          </ul>
        </Card>
      )}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Reglas activas</h3>
        <ul className="text-sm space-y-2">
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Clave API del dispositivo verificada en cada envío</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Registro de origen con fecha y hora</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Rechazo de valores negativos o no numéricos</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Detección de valores atípicos por métrica</li>
        </ul>
      </Card>
    </div>
  );
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function CertTab({ project, data }: { project: { id: string; total_tokens: number }; data: PanelData }) {
  const [hash, setHash] = useState<string | null>(null);
  const { valid } = useMemo(() => analyze(data.readings), [data.readings]);
  const groups = groupSums(valid);
  if (data.readings.length === 0) return <EmptyState data={data} />;

  const certify = async () => {
    const fw = await firmwareHash(data.ide.files);
    const payload = JSON.stringify({ firmware: fw, readings: valid.map((r) => [r.id, r.device_id, r.metric, r.value, r.unit, r.recorded_at]) });
    setHash(await sha256Hex(payload));
    toast.success("Huella SHA-256 del lote generada. La emisión en Stellar se hace desde la billetera.");
  };

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Lote a certificar (datos de dispositivos)</h3>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div><div className="text-muted-foreground text-xs">Lecturas válidas</div><div className="font-semibold">{valid.length}</div></div>
        <div><div className="text-muted-foreground text-xs">Métricas</div><div className="font-semibold">{groups.length}</div></div>
        <div><div className="text-muted-foreground text-xs">Tokens emitidos</div><div className="font-semibold">{Number(project.total_tokens).toLocaleString()}</div></div>
      </div>
      <ul className="text-sm mt-3 space-y-1">
        {groups.map((g) => <li key={g.metric + g.unit}>{g.metric}: <strong>{g.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })} {g.unit}</strong> ({g.count} lecturas)</li>)}
      </ul>
      <p className="text-xs text-muted-foreground mt-3">La huella incluye el código del IDE (firmware) y las lecturas válidas del dispositivo configurado en él.</p>
      <Button className="mt-4" onClick={certify} disabled={valid.length === 0 || data.ide.problems.length > 0}>
        <Hash className="h-4 w-4" /> Generar huella del lote
      </Button>
      {hash && <div className="mt-4 p-3 rounded-md bg-muted text-xs font-mono break-all">SHA-256: {hash}</div>}
    </Card>
  );
}

function ImpactTab({ data }: { data: PanelData }) {
  const { valid } = useMemo(() => analyze(data.readings), [data.readings]);
  const groups = groupSums(valid);
  if (data.readings.length === 0) return <EmptyState data={data} />;
  return (
    <div className="grid gap-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map((g) => (
          <Kpi key={g.metric + g.unit} label={`${g.metric} (acumulado)`} value={`${g.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${g.unit}`} />
        ))}
      </div>
      {groups.map((g) => (
        <Card key={g.metric + g.unit} className="p-5">
          <h3 className="font-semibold mb-2">Evolución · {g.metric}</h3>
          <Sparkline points={valid.filter((r) => r.metric === g.metric && (r.unit ?? "") === g.unit)} />
        </Card>
      ))}
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

function EvidenceTab({ data }: { data: PanelData }) {
  const { readings, devices } = data;
  const { anomalies } = useMemo(() => analyze(readings), [readings]);
  if (readings.length === 0) return <EmptyState data={data} />;
  const devName = (id: string) => devices.find((d) => d.id === id)?.name ?? id.slice(0, 8);
  const download = () => {
    const rows = [["fecha_hora", "dispositivo", "device_id", "metrica", "valor", "unidad", "valido"],
      ...readings.map((r) => [r.recorded_at, devName(r.device_id), r.device_id, r.metric, String(r.value), r.unit ?? "", anomalies.has(r.id) ? "no" : "si"])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "evidencias-dispositivos.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold">Registro de origen ({readings.length})</h3>
        <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" />Descargar CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-muted-foreground"><th className="py-1 pr-3">Fecha y hora</th><th className="pr-3">Dispositivo</th><th className="pr-3">Métrica</th><th className="pr-3">Valor</th><th>Estado</th></tr></thead>
          <tbody>
            {readings.slice(0, 100).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1 pr-3">{new Date(r.recorded_at).toLocaleString()}</td>
                <td className="pr-3">{devName(r.device_id)}</td>
                <td className="pr-3">{r.metric}</td>
                <td className="pr-3">{Number(r.value).toLocaleString()} {r.unit ?? ""}</td>
                <td>{anomalies.has(r.id) ? <Badge variant="destructive">atípico</Badge> : <Badge variant="outline">válido</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AiTab({ sector, data }: { sector: Sector; data: PanelData }) {
  const { valid, anomalies } = useMemo(() => analyze(data.readings), [data.readings]);
  if (data.readings.length === 0) return <EmptyState data={data} />;
  const sorted = [...valid].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const half = Math.floor(sorted.length / 2);
  const avg = (xs: IotReading[]) => xs.reduce((s, r) => s + Number(r.value), 0) / (xs.length || 1);
  const first = avg(sorted.slice(0, half)), second = avg(sorted.slice(half));
  const trend = half > 0 && first !== 0 ? ((second - first) / Math.abs(first)) * 100 : null;
  const tips: string[] = [];
  if (data.ide.problems.length) tips.push(`Corrige ${data.ide.problems.length} error(es) de compilación en el IDE antes de certificar.`);
  if (data.ide.tests.some((t) => !t.ok)) tips.push("Hay pruebas fallidas en el IDE: revisa la lógica del sensor.");
  if (anomalies.size) tips.push(`${anomalies.size} lectura(s) atípica(s): revisa la calibración del sensor en GPIO${data.cfg.pin ?? "—"}.`);
  if (trend !== null) tips.push(`Tendencia de ${data.cfg.metric}: ${trend >= 0 ? "+" : ""}${trend.toFixed(1)} % entre la primera y la segunda mitad de las lecturas.`);
  if (!tips.length) tips.push("Los datos del IDE son consistentes; puedes generar la huella del lote en Certificación.");
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-2">Análisis de los datos del IDE</h3>
      <p className="text-sm text-muted-foreground">{valid.length} lecturas válidas de {data.cfg.metric} ({data.cfg.unit}) · sector {SECTORS[sector].es}.</p>
      <ul className="mt-3 space-y-2 text-sm">{tips.map((t) => <li key={t} className="p-3 rounded-md bg-accent/50">💡 {t}</li>)}</ul>
    </Card>
  );
}

function ConfigTab({ sector, data }: { sector: Sector; data: PanelData }) {
  const { cfg, ide } = data;
  const rows: [string, string][] = [
    ["Dispositivo (DEVICE)", cfg.device ?? "— sin configurar —"],
    ["Clave API (KEY)", cfg.hasKey ? "configurada" : "— sin configurar —"],
    ["Métrica (METRIC)", cfg.metric ?? "—"],
    ["Unidad (UNIT)", cfg.unit ?? "—"],
    ["Intervalo de envío (INTERVAL)", cfg.interval ? `${cfg.interval} s` : "—"],
    ["Pin del sensor", cfg.pin != null ? `GPIO${cfg.pin}` : "—"],
    ["Red Wi-Fi (SSID)", cfg.ssid ?? "—"],
    ["Destino (URL)", cfg.url ?? "—"],
    ["Archivos del proyecto", String(Object.keys(ide.files).length)],
    ["Última subida a la placa", ide.uploadedAt ? new Date(ide.uploadedAt).toLocaleString() : "—"],
  ];
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-1">Configuración leída del IDE · {SECTORS[sector].es}</h3>
      <p className="text-xs text-muted-foreground mb-3">Para cambiar estos valores edita <code>/main.py</code> en la pestaña IDE.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {rows.map(([k, v]) => (
          <div key={k} className="p-3 rounded-md border">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="text-sm mt-1 font-mono break-all">{v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AlertsTab({ data }: { data: PanelData }) {
  const { anomalies } = useMemo(() => analyze(data.readings), [data.readings]);
  const alerts: string[] = [];
  if (!data.cfg.device) alerts.push("El IDE no tiene un ID de dispositivo válido.");
  if (data.cfg.device && !data.cfg.hasKey) alerts.push("El IDE no tiene la clave API del dispositivo.");
  data.ide.problems.forEach((p) => alerts.push(`Error de compilación: ${p.file}${p.line ? `:${p.line}` : ""} — ${p.msg}`));
  data.ide.tests.filter((t) => !t.ok).forEach((t) => alerts.push(`Prueba fallida: ${t.name} (${t.file})`));
  data.devices.filter((d) => !isOnline(d)).forEach((d) => alerts.push(`Sensor fuera de línea: ${d.name}`));
  if (data.cfg.device && data.devices.length === 0 && !data.loading) alerts.push("El dispositivo del IDE no está registrado en este proyecto.");
  if (anomalies.size) alerts.push(`${anomalies.size} valor(es) atípico(s) en ${data.cfg.metric}.`);
  if (data.readings.length > 0) alerts.push("Certificación pendiente: genera la huella del lote en Certificación.");
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Alertas del IDE y del dispositivo ({alerts.length})</h3>
      {alerts.length === 0 ? <p className="text-sm text-muted-foreground">Sin alertas activas.</p> : (
        <ul className="text-sm space-y-2">{alerts.map((a, i) => <li key={i} className="flex gap-2"><span>🚩</span>{a}</li>)}</ul>
      )}
    </Card>
  );
}

function RolesTab({ data }: { data: PanelData }) {
  const { cfg, ide, devices, readings } = data;
  const roles = [
    { name: "Desarrollador (IDE)", desc: `${Object.keys(ide.files).length} archivos · ${ide.tests.filter((t) => t.ok).length}/${ide.tests.length} pruebas correctas` },
    { name: "Dispositivo emisor", desc: cfg.device ? `${devices[0]?.name ?? "no registrado"} · ID ${cfg.device.slice(0, 8)}…` : "Sin dispositivo en el IDE" },
    { name: "Validador automático", desc: `Revisa ${readings.length} lecturas de ${cfg.metric ?? "—"}` },
    { name: "Propietario del proyecto", desc: "Genera la huella y emite los certificados desde la billetera" },
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

type IotDevice = {
  id: string;
  name: string;
  device_type: string;
  status: "online" | "offline";
  last_seen_at: string | null;
  created_at: string;
};

type IotReading = {
  id: number;
  device_id: string;
  metric: string;
  value: number;
  unit: string | null;
  recorded_at: string;
};

function StandardsTab({ data }: { data: PanelData }) {
  const { cfg, ide, readings } = data;
  const checks: [string, boolean][] = [
    ["Firmware sin errores de compilación (IDE)", Object.keys(ide.files).length > 0 && ide.problems.length === 0],
    ["Pruebas automáticas superadas (IDE)", ide.tests.length > 0 && ide.tests.every((t) => t.ok)],
    ["Dispositivo identificado y con clave API", !!cfg.device && cfg.hasKey],
    ["Datos medidos con fecha y hora de origen", readings.length > 0],
    ["Métrica y unidad declaradas", !!cfg.metric && !!cfg.unit],
  ];
  const standards = ["ISO 14064", "Gold Standard", "Verra (VCS)"];
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Cumplimiento con los datos del IDE</h3>
      <ul className="text-sm space-y-2">
        {checks.map(([k, ok]) => (
          <li key={k} className="flex items-center gap-2">
            {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}{k}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 mt-4">{standards.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
      <p className="text-xs text-muted-foreground mt-3">Estos requisitos de medición, reporte y verificación son la base que piden estos estándares; la verificación externa la hace un organismo acreditado.</p>
    </Card>
  );
}
