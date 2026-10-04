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
import { registerDevice, listDevices, revokeDevice, listDeviceReadings } from "@/lib/iot.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/proyectos/$id/panel")({
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
          <TabsTrigger value="devices"><Cpu className="h-3.5 w-3.5 mr-1" />Dispositivos ESP32</TabsTrigger>
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
        <TabsContent value="devices" className="mt-6"><DevicesTab projectId={project.id} sector={sector} /></TabsContent>
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

function DevicesTab({ projectId, sector }: { projectId: string; sector: Sector }) {
  const queryClient = useQueryClient();
  const fetchDevices = useServerFn(listDevices);
  const fetchReadings = useServerFn(listDeviceReadings);
  const register = useServerFn(registerDevice);
  const revoke = useServerFn(revokeDevice);

  const devicesQ = useQuery({
    queryKey: ["iot-devices", projectId],
    queryFn: () => fetchDevices({ data: { project_id: projectId } }),
    refetchInterval: 15000,
  });
  const readingsQ = useQuery({
    queryKey: ["iot-readings", projectId],
    queryFn: () => fetchReadings({ data: { project_id: projectId, limit: 50 } }),
    refetchInterval: 15000,
  });

  const devices: IotDevice[] = devicesQ.data?.devices ?? [];
  const readings: IotReading[] = readingsQ.data?.readings ?? [];

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<{ apiKey: string; deviceId: string } | null>(null);

  // --- Instalación por cable USB ---
  const [ssid, setSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [selDevice, setSelDevice] = useState("");
  const [devKey, setDevKey] = useState("");
  const sensorCredentials = SENSOR_CREDENTIALS_BY_SECTOR[sector];
  const [metric, setMetric] = useState(sensorCredentials.metric);
  const [unit, setUnit] = useState(sensorCredentials.unit);
  const [flashing, setFlashing] = useState(false);
  const [serialLog, setSerialLog] = useState<string[]>([]);

  const effDeviceId = selDevice || newKey?.deviceId || devices[0]?.id || "";
  const effApiKey = devKey || newKey?.apiKey || "";

  const provPayload = () => ({
    ssid,
    pass: wifiPass,
    url: `${window.location.origin}/api/public/iot-readings`,
    device: effDeviceId,
    key: effApiKey,
    metric,
    unit,
  });

  const validCreds = () => {
    if (!ssid.trim()) return "Escribe el nombre de tu red Wi-Fi (2,4 GHz).";
    if (!effDeviceId) return "Registra o selecciona un dispositivo.";
    if (!effApiKey) return "Pega la clave API del dispositivo.";
    return null;
  };

  // Descarga el firmware con las credenciales ya escritas dentro.
  const downloadFirmware = async () => {
    const err = validCreds();
    if (err) return toast.error(err);
    try {
      const tpl = await fetch("/firmware/biotokens-esp32.ino").then((r) => r.text());
      const p = provPayload();
      const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const filled = tpl
        .replace(/DEFAULT_WIFI_SSID = "[^"]*"/, `DEFAULT_WIFI_SSID = "${esc(p.ssid)}"`)
        .replace(/DEFAULT_WIFI_PASS = "[^"]*"/, `DEFAULT_WIFI_PASS = "${esc(p.pass)}"`)
        .replace(/DEFAULT_API_URL   = "[^"]*"/, `DEFAULT_API_URL   = "${esc(p.url)}"`)
        .replace(/DEFAULT_DEVICE_ID = "[^"]*"/, `DEFAULT_DEVICE_ID = "${esc(p.device)}"`)
        .replace(/DEFAULT_API_KEY   = "[^"]*"/, `DEFAULT_API_KEY   = "${esc(p.key)}"`)
        .replace(/DEFAULT_METRIC    = "[^"]*"/, `DEFAULT_METRIC    = "${esc(p.metric)}"`)
        .replace(/DEFAULT_UNIT      = "[^"]*"/, `DEFAULT_UNIT      = "${esc(p.unit)}"`);
      const url = URL.createObjectURL(new Blob([filled], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "biotokens-esp32.ino";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Firmware descargado con tus credenciales incluidas.");
    } catch {
      toast.error("No se pudo preparar el firmware.");
    }
  };

  // Envía las credenciales a la placa por el cable de datos (Web Serial).
  const sendOverUsb = async () => {
    const err = validCreds();
    if (err) return toast.error(err);
    const nav = navigator as Navigator & { serial?: any };
    if (!nav.serial) {
      return toast.error("Tu navegador no permite el puerto USB. Usa Chrome o Edge en el computador.");
    }
    setFlashing(true);
    setSerialLog([]);
    let port: any;
    try {
      port = await nav.serial.requestPort();
      await port.open({ baudRate: 115200 });
      const writer = port.writable.getWriter();
      const enc = new TextEncoder();
      await writer.write(enc.encode("PING\n"));
      await writer.write(enc.encode(`PROV ${JSON.stringify(provPayload())}\n`));
      writer.releaseLock();

      const reader = port.readable.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let ok = false;
      const deadline = Date.now() + 12000;
      while (Date.now() < deadline) {
        const timeout = new Promise<{ value?: Uint8Array; done: boolean }>((res) =>
          setTimeout(() => res({ done: true }), Math.max(200, deadline - Date.now())),
        );
        const { value, done } = await Promise.race([reader.read(), timeout]);
        if (value) {
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          if (lines.length) setSerialLog((l) => [...l, ...lines.map((s) => s.trim()).filter(Boolean)].slice(-12));
          if (lines.some((l) => l.includes("PROV OK"))) { ok = true; break; }
        }
        if (done) break;
      }
      try { await reader.cancel(); } catch { /* ignore */ }
      reader.releaseLock();
      await port.close();

      if (ok) {
        toast.success("Credenciales guardadas en la placa. Ya puede conectarse al Wi-Fi y enviar datos.");
      } else {
        toast.error("La placa no confirmó. Asegúrate de haber subido el firmware Bio Tokens y vuelve a intentar.");
      }
    } catch (e) {
      toast.error((e as Error).message || "No se pudo abrir el puerto USB.");
      try { await port?.close(); } catch { /* ignore */ }
    } finally {
      setFlashing(false);
    }
  };

  // Instala MicroPython + el programa Bio Tokens directamente desde el navegador (sin Arduino).
  const [flashPct, setFlashPct] = useState<number | null>(null);
  const [board, setBoard] = useState<"auto" | "esp32" | "esp32s2" | "esp32s3" | "esp32c3">("auto");
  const installWithoutArduino = async (programOnly: boolean) => {
    const err = validCreds();
    if (err) return toast.error(err);
    const nav = navigator as Navigator & { serial?: any };
    if (!nav.serial) return toast.error("Tu navegador no permite el puerto USB. Usa Chrome o Edge en el computador.");
    setFlashing(true);
    setSerialLog([]);
    const log = (s: string) => setSerialLog((l) => [...l, s].slice(-14));
    try {
      const port = await nav.serial.requestPort();
      const { flashMicroPython, uploadProgram, buildMainPy, BOARD_PROFILES } = await import("@/lib/esp32-flash");
      let profile = board === "auto" ? BOARD_PROFILES.esp32 : BOARD_PROFILES[board];
      if (!programOnly) {
        log("Si no conecta, mantén pulsado el botón BOOT de la placa.");
        setFlashPct(0);
        profile = await flashMicroPython(port, log, setFlashPct, board);
        if (profile.nativeUsb) {
          setBoard(profile.id);
          log("Esta placa usa USB nativo: el puerto cambia tras grabar.");
          toast.success("MicroPython grabado. Pulsa «Solo actualizar programa y credenciales» y elige el puerto de nuevo.");
          return;
        }
      } else if (board === "auto") {
        log("Modelo automático: se asume ESP32 clásico. Elige el modelo si usas S2, S3 o C3.");
      }
      log(`Perfil: ${profile.label}. ${profile.note}`);
      await uploadProgram(port, buildMainPy(provPayload(), profile.adcPin), log);
      toast.success("Firmware instalado. La placa enviará su primera lectura en un minuto.");
    } catch (e) {
      toast.error((e as Error).message || "No se pudo instalar el firmware.");
      log(`Error: ${(e as Error).message}`);
    } finally {
      setFlashing(false);
      setFlashPct(null);
    }
  };

  const verifyConnection = async () => {
    const [d, r] = await Promise.all([devicesQ.refetch(), readingsQ.refetch()]);
    const list: IotDevice[] = d.data?.devices ?? [];
    const online = list.filter((x) => x.status === "online").length;
    const total = (r.data?.readings ?? []).length;
    if (online > 0 || total > 0) {
      toast.success(`Conexión verificada: ${online} dispositivo(s) en línea · ${total} lectura(s) recibidas.`);
    } else {
      toast.error("Aún no llegan datos de la placa. Revisa Wi-Fi 2,4 GHz, credenciales y alimentación.");
    }
  };


  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await register({ data: { project_id: projectId, name: name.trim(), device_type: "esp32" } });
      setNewKey({ apiKey: res.apiKey, deviceId: res.device.id });
      setName("");
      toast.success("Dispositivo registrado. Copia la clave API: solo se muestra una vez.");
      queryClient.invalidateQueries({ queryKey: ["iot-devices", projectId] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async (deviceId: string) => {
    try {
      await revoke({ data: { device_id: deviceId } });
      toast.success("Dispositivo eliminado");
      queryClient.invalidateQueries({ queryKey: ["iot-devices", projectId] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const endpoint = `${window.location.origin}/api/public/iot-readings`;

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Cpu className="h-4 w-4" /> Conectar hardware ESP32</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Registra tu placa ESP32, carga el firmware y las lecturas aparecerán aquí para la verificar los datos de tu proyecto.
        </p>
        <ol className="text-sm space-y-1.5 list-decimal list-inside text-muted-foreground mb-4">
          <li>Registra el dispositivo, crea un nombre y guarda su <strong>ID</strong> y <strong>clave API</strong> (el <strong>ID</strong>&nbsp;y clave API&nbsp;se muestran una sola vez).</li>
          <li>Escribe tus datos de Wi-Fi abajo y descarga el firmware: se descarga con las credenciales ya escritas.</li>
          <li>Conecta la placa al computador con el cable de datos y súbela desde Arduino IDE / PlatformIO (núcleo ESP32) o usa la función:&nbsp;Instalar sin Arduino (MicroPython)&nbsp;puedes dejar&nbsp;detectar automáticamente&nbsp;o elegir tu modelo. Si eliges uno y la placa conectada es otra, te avisa antes de grabar.</li>
          <li>Si el firmware ya está en la placa, usa <strong>Enviar credenciales por cable USB</strong> y quedan guardadas al instante. En&nbsp;Instalar sin Arduino (MicroPython)&nbsp;se debe realizar un paso más para placas S2, S3 y C3: cuando termine de grabar MicroPython, pulsa Solo actualizar programa y credenciales vuelve a elegir el puerto y elige un modelo S2, S3, o C3 antes de pulsar el botón, la función&nbsp;detectar automáticamente&nbsp;no funciona en este paso. En la clásica todo se hace de una vez.</li>
          <li>El dispositivo enviará lecturas por HTTPS y pasará a estado <Badge variant="default" className="mx-1">online</Badge>.</li>
        </ol>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Upload className="h-4 w-4" /> Instalar credenciales en la placa</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Conecta la placa al computador con el cable de datos. Escribe los datos una sola vez: los dejamos escritos
          dentro del firmware que descargues y también podemos enviarlos directamente por el cable.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ssid">Red Wi-Fi (2,4 GHz)</Label>
            <Input id="ssid" value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="MiRedWiFi" />
          </div>
          <div>
            <Label htmlFor="wpass">Clave del Wi-Fi</Label>
            <Input id="wpass" type="password" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <Label htmlFor="devsel">Dispositivo</Label>
            <select
              id="devsel"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={effDeviceId}
              onChange={(e) => setSelDevice(e.target.value)}
            >
              {devices.length === 0 && <option value="">— registra un dispositivo —</option>}
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="apikey">Clave API del dispositivo</Label>
            <Input
              id="apikey"
              value={effApiKey}
              onChange={(e) => setDevKey(e.target.value)}
              placeholder="btk_…"
            />
          </div>
          <div>
            <Label htmlFor="metric">Métrica que envía el sensor</Label>
            <Input id="metric" value={metric} onChange={(e) => setMetric(e.target.value)} placeholder={sensorCredentials.metric} />
          </div>
          <div>
            <Label htmlFor="unit">Unidad</Label>
            <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={sensorCredentials.unit} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button type="button" onClick={downloadFirmware}>
            <Download className="h-4 w-4" /> Descargar firmware con credenciales
          </Button>
          <Button type="button" variant="outline" onClick={sendOverUsb} disabled={flashing}>
            <Cpu className="h-4 w-4" /> {flashing ? "Enviando…" : "Enviar credenciales por cable USB"}
          </Button>
          <Button type="button" variant="outline" onClick={verifyConnection}>
            <CheckCircle2 className="h-4 w-4" /> Verificar conexión
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          El envío por cable funciona en Chrome o Edge de computador y requiere que el firmware Bio Tokens ya esté
          cargado en la placa. Las credenciales quedan guardadas en la memoria del ESP32 y sobreviven al reinicio.
        </p>
        <div className="mt-5 rounded-md border p-4">
          <h4 className="font-semibold">Instalar sin Arduino (MicroPython)</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Para placas ESP32 que no usan Arduino: conecta la placa por cable y la instalamos desde aquí. Se graba
            MicroPython oficial y el programa Bio Tokens con tus credenciales. Al instalar MicroPython se borra todo lo que tenga la placa.
          </p>
          <div className="mt-3 max-w-sm">
            <Label htmlFor="board">Modelo de placa</Label>
            <select
              id="board"
              value={board}
              onChange={(e) => setBoard(e.target.value as typeof board)}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="auto">Detectar automáticamente</option>
              <option value="esp32">ESP32 clásico (sensor en GPIO34)</option>
              <option value="esp32s2">ESP32-S2 (sensor en GPIO1)</option>
              <option value="esp32s3">ESP32-S3 (sensor en GPIO1)</option>
              <option value="esp32c3">ESP32-C3 (sensor en GPIO2)</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button type="button" onClick={() => installWithoutArduino(false)} disabled={flashing}>
              <Cpu className="h-4 w-4" />
              {flashPct !== null ? `Grabando… ${flashPct}%` : flashing ? "Instalando…" : "Descargar e instalar en la placa"}
            </Button>
            <Button type="button" variant="outline" onClick={() => installWithoutArduino(true)} disabled={flashing}>
              Solo actualizar programa y credenciales
            </Button>
          </div>
        </div>
        {serialLog.length > 0 && (
          <pre className="text-xs p-3 mt-3 rounded-md bg-muted overflow-x-auto">{serialLog.join("\n")}</pre>
        )}
      </Card>



      <Card className="p-5">
        <h3 className="font-semibold mb-3">Registrar dispositivo</h3>
        <form onSubmit={onRegister} className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-48">
            <Label htmlFor="dev-name">Nombre del dispositivo</Label>
            <Input id="dev-name" required placeholder="Ej.: ESP32 humedad sector A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Registrando…" : "Registrar"}</Button>
        </form>
        {newKey && (
          <div className="mt-4 p-3 rounded-md border border-primary/40 bg-primary/5 text-sm space-y-2">
            <p className="font-medium flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Guarda esta clave ahora — no volverá a mostrarse.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs break-all">Device ID: {newKey.deviceId}</code>
              <Button type="button" variant="ghost" size="sm" onClick={() => copy(newKey.deviceId, "Device ID")}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs break-all">API Key: {newKey.apiKey}</code>
              <Button type="button" variant="ghost" size="sm" onClick={() => copy(newKey.apiKey, "API Key")}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Dispositivos registrados ({devices.length})</h3>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay dispositivos. Registra el primero arriba.</p>
        ) : (
          <div className="grid gap-2">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-md border gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  {d.status === "online" ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{d.id}</div>
                    <div className="text-xs text-muted-foreground">
                      Última conexión: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "nunca"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === "online" ? "default" : "secondary"}>{d.status}</Badge>
                  <Button type="button" variant="ghost" size="sm" aria-label={`Eliminar ${d.name}`} onClick={() => onRevoke(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-2">Endpoint de ingesta</h3>
        <p className="text-xs text-muted-foreground mb-2">
          POST JSON con cabeceras <code>X-Device-Id</code> y <code>X-Api-Key</code>:
        </p>
        <pre className="text-xs p-3 rounded-md bg-muted overflow-x-auto">{`POST ${endpoint}
Content-Type: application/json
X-Device-Id: <DEVICE_ID>
X-Api-Key: <API_KEY>

{ "metric": "soil_moisture", "value": 42.5, "unit": "percent" }`}</pre>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Últimas lecturas ({readings.length})</h3>
        {readings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin lecturas todavía. Cuando el ESP32 envíe datos aparecerán aquí con su timestamp de origen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-4">Métrica</th>
                  <th className="py-2 pr-4">Valor</th>
                  <th className="py-2 pr-4">Dispositivo</th>
                  <th className="py-2">Registro de origen</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{r.metric}</td>
                    <td className="py-2 pr-4">{r.value.toLocaleString()} {r.unit ?? ""}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.device_id.slice(0, 8)}…</td>
                    <td className="py-2 text-xs text-muted-foreground">{new Date(r.recorded_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
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
