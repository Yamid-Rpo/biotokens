import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plug, Unplug, Play, Square, RotateCcw, CheckCircle2, Upload, Download, FilePlus, Trash2,
  Package, FlaskConical, Bug, TerminalSquare, FileCode2, HardDrive, Cpu,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { registerDevice } from "@/lib/iot.functions";
import { buildDeviceName, type Sector } from "@/lib/sectors";
import { parseIdeConfig } from "@/lib/ide-store";
import { buildMainPy } from "@/lib/esp32-flash";
import type { MpySession as Session, TestResult } from "@/lib/mpy-session";
import { updateIde, readIde } from "@/lib/ide-store";

type FileMap = Record<string, string>;

const LIBS = [
  { name: "urequests", desc: "Cliente HTTP (envío de lecturas)" },
  { name: "umqtt.simple", desc: "MQTT para brokers IoT" },
  { name: "ssd1306", desc: "Pantalla OLED I2C" },
  { name: "dht", desc: "Sensor de temperatura/humedad DHT (incluido en el firmware)" },
  { name: "logging", desc: "Registro de eventos" },
  { name: "datetime", desc: "Fechas y horas" },
];

function defaultFiles(metric: string, unit: string): FileMap {
  return {
    "/main.py": buildMainPy({ ssid: "TU_WIFI", pass: "TU_CLAVE", url: "https://biotokens.lovable.app/api/public/iot-readings", device: "PEGAR_DEVICE_ID", key: "PEGAR_API_KEY", metric, unit }),
    "/lib/sensor.py": `# Lógica del sensor: convierte la lectura ADC en la unidad del proyecto
def to_percent(raw, max_raw=4095):
    return round(100 - (raw / max_raw) * 100, 2)

def valid(value, lo=0, hi=100):
    return lo <= value <= hi
`,
    "/tests/test_sensor.py": `import sys
sys.path.append('/lib')
from sensor import to_percent, valid

def test_extremos():
    assert to_percent(0) == 100
    assert to_percent(4095) == 0

def test_rango():
    assert valid(50)
    assert not valid(150)
`,
  };
}

// Sesiones USB activas por proyecto; sobreviven al desmontaje de la pestaña IDE.
const LIVE_SESSIONS = new Map<string, Session>();

export function EmbeddedIDE({ projectId, metric, unit, sector }: { projectId: string; metric: string; unit: string; sector: Sector }) {
  const storeKey = `bt-ide-${projectId}`;
  const [files, setFiles] = useState<FileMap>(() => defaultFiles(metric, unit));
  const [current, setCurrent] = useState("/main.py");
  const [session, setSessionState] = useState<Session | null>(() => LIVE_SESSIONS.get(projectId) ?? null);
  const setSession = (x: Session | null) => { if (x) LIVE_SESSIONS.set(projectId, x); else LIVE_SESSIONS.delete(projectId); setSessionState(x); };
  const [busy, setBusy] = useState<string | null>(null);
  const [consoleText, setConsoleText] = useState("");
  const [boardFiles, setBoardFiles] = useState<{ path: string; size: number }[]>([]);
  const [problems, setProblems] = useState<{ file: string; line: number | null; msg: string }[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [ssid, setSsid] = useState("");
  const [pass, setPass] = useState("");
  const [bottom, setBottom] = useState("console");
  const [flashPct, setFlashPct] = useState<number | null>(null);
  const register = useServerFn(registerDevice);
  const queryClient = useQueryClient();
  const consoleRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Restore workspace after hydration; the shared IDE store feeds every panel tab.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const snap = readIde(projectId);
    if (Object.keys(snap.files).length) setFiles(snap.files);
    else updateIde(projectId, { files });
    setProblems(snap.problems); setTests(snap.tests as TestResult[]);
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);
  useEffect(() => { if (restored) updateIde(projectId, { files }); }, [files, restored, projectId]);
  useEffect(() => { if (restored) updateIde(projectId, { problems, compiledAt: new Date().toISOString() }); }, [problems, restored, projectId]);
  useEffect(() => { if (restored && tests.length) updateIde(projectId, { tests, testedAt: new Date().toISOString() }); }, [tests, restored, projectId]);
  useEffect(() => { updateIde(projectId, { connected: !!session }); }, [session, projectId]);
  useEffect(() => { if (boardFiles.length) updateIde(projectId, { boardFiles }); }, [boardFiles, projectId]);
  useEffect(() => { consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight); }, [consoleText]);
  // La placa sigue conectada al cambiar de pestaña; solo «Desconectar» la libera.
  useEffect(() => {
    if (!session) return;
    session.onData = (t) => append(t.replace(/\r/g, ""));
    return () => { session.onData = () => {}; };
  }, [session]);

  const append = (s: string) => setConsoleText((t) => (t + s).slice(-40000));
  const code = files[current] ?? "";
  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const errLines = new Set(problems.filter((p) => p.file === current && p.line).map((p) => p.line!));

  async function run<T>(label: string, fn: (s: Session) => Promise<T>): Promise<T | undefined> {
    if (!session) { toast.error("Conecta la placa primero."); return; }
    setBusy(label);
    try { return await fn(session); }
    catch (e) { const m = (e as Error).message; append(`\n[error] ${m}\n`); toast.error(m); }
    finally { setBusy(null); }
  }

  async function connect() {
    try {
      const { MpySession } = await import("@/lib/mpy-session");
      const s = await MpySession.request();
      s.onData = (t) => append(t.replace(/\r/g, ""));
      setSession(s);
      append("[conectado] Placa conectada por USB.\n");
      const list = await s.listFiles().catch(() => []);
      setBoardFiles(list);
    } catch (e) { toast.error((e as Error).message); }
  }
  async function disconnect() { await session?.close(); setSession(null); append("[desconectado]\n"); }

  async function check(): Promise<boolean> {
    const { errorLine } = await import("@/lib/mpy-session");
    const res = await run("Compilando", async (s) => {
      const found: typeof problems = [];
      for (const [path, src] of Object.entries(files)) {
        if (!path.endsWith(".py")) continue;
        const err = await s.check(path, src);
        if (err) found.push({ file: path, line: errorLine(err, path), msg: err.split("\n").pop() ?? err });
      }
      return found;
    });
    if (!res) return false;
    setProblems(res);
    setBottom("problems");
    append(res.length ? `[compilar] ${res.length} error(es).\n` : "[compilar] Sin errores de sintaxis.\n");
    return res.length === 0;
  }

  async function uploadAll() {
    if (!(await check())) return;
    await run("Subiendo", async (s) => {
      for (const [path, src] of Object.entries(files)) { append(`[subir] ${path}…\n`); await s.writeFile(path, src); }
      setBoardFiles(await s.listFiles());
      updateIde(projectId, { uploadedAt: new Date().toISOString() });
      append("[subir] Proyecto subido. Pulsa «Reiniciar» para ejecutar main.py.\n");
      toast.success("Firmware subido a la placa");
    });
  }

  // Instala MicroPython + main.py y registra automáticamente ID y clave API en la placa.
  async function installFirmware() {
    const nav = navigator as Navigator & { serial?: any };
    if (!nav.serial) return toast.error("Tu navegador no permite el puerto USB. Usa Chrome o Edge en el computador.");
    if (!ssid.trim()) { setBottom("libs"); return toast.error("Escribe la red Wi-Fi (2,4 GHz) y su clave en «Librerías»."); }
    if (!confirm("Se borrará la placa, se instalará MicroPython y se registrará el dispositivo. ¿Continuar?")) return;
    if (session) { await session.close(); setSession(null); }
    setBottom("console"); setBusy("Instalando firmware");
    const log = (t: string) => append(`[firmware] ${t}\n`);
    try {
      const { flashMicroPython, uploadProgram, applyCredentials } = await import("@/lib/esp32-flash");
      const src = files["/main.py"] ?? "";
      const cfg = parseIdeConfig(src);
      const keyNow = /^KEY\s*=\s*"([^"]*)"/m.exec(src)?.[1] ?? "";
      let device = cfg.device ?? "", key = keyNow;
      if (!/^[0-9a-f-]{36}$/i.test(device) || !key || key.startsWith("PEGAR")) {
        log("Registrando el dispositivo…");
        const res = await register({ data: { project_id: projectId, name: buildDeviceName(sector, cfg.metric ?? metric, cfg.unit ?? unit), device_type: "esp32" } });
        device = res.device.id; key = res.apiKey;
        queryClient.invalidateQueries({ queryKey: ["iot-devices", projectId] });
        log(`Dispositivo registrado: ${res.device.name} (${device})`);
      } else log(`Usando el dispositivo ya registrado: ${device}`);
      log("Elige el puerto USB. Si no conecta, mantén pulsado BOOT.");
      let port = await nav.serial.requestPort();
      setFlashPct(0);
      const profile = await flashMicroPython(port, log, setFlashPct, "auto");
      setFlashPct(null);
      const main = applyCredentials(src, { ssid, pass, device, key, adcPin: profile.adcPin });
      setFiles((f) => ({ ...f, "/main.py": main }));
      if (profile.nativeUsb) {
        log("USB nativo: el puerto cambió. Vuelve a elegir el puerto de la placa.");
        toast.info("Vuelve a elegir el puerto USB de la placa.");
        port = await nav.serial.requestPort();
      }
      log(`Perfil: ${profile.label}. ${profile.note}`);
      await uploadProgram(port, main, log);
      updateIde(projectId, { uploadedAt: new Date().toISOString() });
      log("Listo: ID y clave API guardados en la placa. Primera lectura en ~1 minuto.");
      toast.success("Firmware instalado y dispositivo registrado.");
    } catch (e) {
      const m = (e as Error).message; log(`Error: ${m}`); toast.error(m);
    } finally { setBusy(null); setFlashPct(null); }
  }

  async function runCurrent() {
    const { errorLine } = await import("@/lib/mpy-session");
    setBottom("console");
    append(`\n[ejecutar] ${current}\n`);
    const r = await run("Ejecutando", (s) => s.exec(
      `import sys\nsys.path.append('/lib')\nexec(compile(${JSON.stringify(code)},${JSON.stringify(current)},'exec'))`,
      120000, (c) => append(c.replace(/\r/g, "")),
    ));
    if (!r) return;
    if (r.err) {
      append(r.err.replace(/\r/g, ""));
      setProblems([{ file: current, line: errorLine(r.err, current), msg: r.err.trim().split("\n").pop() ?? "" }]);
    } else append("[ejecutar] Terminado.\n");
  }

  async function runTests() {
    const { buildTestRunner, parseTestReport } = await import("@/lib/mpy-session");
    const testFiles = Object.entries(files).filter(([p]) => /\/tests\/test_.*\.py$/.test(p)).map(([path, src]) => ({ path, src }));
    if (!testFiles.length) return toast.error("Crea archivos en /tests/test_*.py");
    for (const [p, src] of Object.entries(files)) if (p.startsWith("/lib/")) await run("Preparando", (s) => s.writeFile(p, src));
    const r = await run("Probando", (s) => s.exec(buildTestRunner(testFiles), 120000));
    if (!r) return;
    const res = parseTestReport(r.out);
    setTests(res);
    setBottom("tests");
    const ok = res.filter((t) => t.ok).length;
    append(`[pruebas] ${ok}/${res.length} correctas.\n${r.err}`);
  }

  async function installLib(name: string) {
    if (!ssid) return toast.error("Escribe la red Wi-Fi para descargar librerías.");
    setBottom("console");
    append(`[librería] Instalando ${name}…\n`);
    await run("Instalando", async (s) => {
      await s.installLib(name, ssid, pass, (c) => append(c.replace(/\r/g, "")));
      setBoardFiles(await s.listFiles());
      toast.success(`${name} instalada`);
    });
  }

  async function openFromBoard(path: string) {
    const src = await run("Leyendo", (s) => s.readFile(path));
    if (src === undefined) return;
    setFiles((f) => ({ ...f, [path]: src }));
    setCurrent(path);
  }

  function newFile() {
    const name = prompt("Ruta del archivo (ej.: /lib/oled.py o /tests/test_red.py)");
    if (!name) return;
    const path = name.startsWith("/") ? name : `/${name}`;
    setFiles((f) => ({ ...f, [path]: f[path] ?? "" }));
    setCurrent(path);
  }
  function deleteFile(path: string) {
    if (!confirm(`¿Eliminar ${path} del espacio de trabajo?`)) return;
    setFiles((f) => { const n = { ...f }; delete n[path]; return n; });
    if (current === path) setCurrent(Object.keys(files).find((p) => p !== path) ?? "");
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const t = e.currentTarget; const s = t.selectionStart;
      const v = code.slice(0, s) + "    " + code.slice(t.selectionEnd);
      setFiles((f) => ({ ...f, [current]: v }));
      requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 4; });
    } else if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); uploadAll(); }
    else if (e.key === "F5") { e.preventDefault(); runCurrent(); }
  }

  const tree = Object.keys(files).sort();
  const dis = !session || !!busy;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2 mr-auto"><FileCode2 className="h-5 w-5" /> IDE embebido · MicroPython</h2>
        {session ? <Badge>Placa conectada</Badge> : <Badge variant="secondary">Sin placa</Badge>}
        {busy && <Badge variant="outline">{busy}…</Badge>}
        {session
          ? <Button size="sm" variant="outline" onClick={disconnect}><Unplug className="h-4 w-4 mr-1" />Desconectar</Button>
          : <Button size="sm" onClick={connect}><Plug className="h-4 w-4 mr-1" />Conectar placa</Button>}
      </div>

      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Acciones del IDE">
        <Button size="sm" disabled={!!busy} onClick={installFirmware} title="Instala MicroPython y main.py, y registra el ID y la clave API"><Cpu className="h-4 w-4 mr-1" />Instalar firmware y registrar placa</Button>
        {flashPct !== null && <Badge variant="outline">Grabando {flashPct}%</Badge>}
        <Button size="sm" variant="secondary" disabled={dis} onClick={check}><CheckCircle2 className="h-4 w-4 mr-1" />Compilar</Button>
        <Button size="sm" variant="secondary" disabled={dis} onClick={uploadAll} title="Ctrl+S"><Upload className="h-4 w-4 mr-1" />Subir a la placa</Button>
        <Button size="sm" variant="secondary" disabled={dis} onClick={runCurrent} title="F5"><Play className="h-4 w-4 mr-1" />Ejecutar / depurar</Button>
        <Button size="sm" variant="secondary" disabled={!session} onClick={() => session?.interrupt()}><Square className="h-4 w-4 mr-1" />Detener</Button>
        <Button size="sm" variant="secondary" disabled={dis} onClick={() => session?.softReset()}><RotateCcw className="h-4 w-4 mr-1" />Reiniciar</Button>
        <Button size="sm" variant="secondary" disabled={dis} onClick={runTests}><FlaskConical className="h-4 w-4 mr-1" />Ejecutar pruebas</Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3 text-sm">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Proyecto</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={newFile} aria-label="Nuevo archivo"><FilePlus className="h-4 w-4" /></Button>
            </div>
            <ul className="space-y-0.5">
              {tree.map((p) => (
                <li key={p} className="flex items-center group">
                  <button onClick={() => setCurrent(p)} className={`flex-1 truncate text-left rounded px-2 py-1 font-mono text-xs ${p === current ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}>
                    {problems.some((x) => x.file === p) ? "⚠ " : ""}{p}
                  </button>
                  <button onClick={() => deleteFile(p)} aria-label={`Eliminar ${p}`} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" />En la placa</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={dis} onClick={() => run("Leyendo", async (s) => setBoardFiles(await s.listFiles()))}>Actualizar</Button>
            </div>
            {boardFiles.length === 0 ? <p className="text-xs text-muted-foreground">Conecta la placa para ver sus archivos.</p> : (
              <ul className="space-y-0.5 max-h-40 overflow-auto">
                {boardFiles.map((f) => (
                  <li key={f.path} className="flex items-center gap-1">
                    <button disabled={dis} onClick={() => openFromBoard(f.path)} className="flex-1 truncate text-left rounded px-2 py-0.5 font-mono text-xs hover:bg-muted"><Download className="inline h-3 w-3 mr-1" />{f.path}</button>
                    <span className="text-[10px] text-muted-foreground">{f.size}B</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex rounded-md border bg-muted/30 font-mono text-xs h-[380px] overflow-hidden">
            <div ref={gutterRef} aria-hidden className="select-none overflow-hidden py-2 px-2 text-right text-muted-foreground border-r bg-muted/50">
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className={`leading-5 ${errLines.has(i + 1) ? "text-destructive font-bold" : ""}`}>{errLines.has(i + 1) ? "●" : i + 1}</div>
              ))}
            </div>
            <textarea
              aria-label={`Editor de ${current}`}
              spellCheck={false}
              value={code}
              onChange={(e) => setFiles((f) => ({ ...f, [current]: e.target.value }))}
              onScroll={(e) => { if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop; }}
              onKeyDown={onKey}
              className="flex-1 resize-none bg-transparent p-2 leading-5 outline-none whitespace-pre overflow-auto"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{current} · {lineCount} líneas · Tab = sangría · Ctrl+S = subir · F5 = ejecutar</p>
        </div>
      </div>

      <Tabs value={bottom} onValueChange={setBottom}>
        <TabsList>
          <TabsTrigger value="console"><TerminalSquare className="h-3.5 w-3.5 mr-1" />Consola / REPL</TabsTrigger>
          <TabsTrigger value="problems"><Bug className="h-3.5 w-3.5 mr-1" />Problemas ({problems.length})</TabsTrigger>
          <TabsTrigger value="tests"><FlaskConical className="h-3.5 w-3.5 mr-1" />Pruebas</TabsTrigger>
          <TabsTrigger value="libs"><Package className="h-3.5 w-3.5 mr-1" />Librerías</TabsTrigger>
        </TabsList>
        <TabsContent value="console" className="space-y-2">
          <pre ref={consoleRef} className="h-48 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap">{consoleText || "La salida de la placa aparecerá aquí."}</pre>
        </TabsContent>
        <TabsContent value="problems">
          {problems.length === 0 ? <p className="text-sm text-muted-foreground">Sin problemas. Pulsa «Compilar» para revisar con el compilador de la placa.</p> : (
            <ul className="space-y-1 text-sm">
              {problems.map((p, i) => (
                <li key={i}><button className="text-left hover:underline" onClick={() => setCurrent(p.file)}>🚩 <span className="font-mono">{p.file}{p.line ? `:${p.line}` : ""}</span> — {p.msg}</button></li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="tests">
          {tests.length === 0 ? <p className="text-sm text-muted-foreground">Las funciones <code>test_*</code> en <code>/tests/test_*.py</code> se ejecutan en la placa.</p> : (
            <table className="w-full text-sm">
              <tbody>
                {tests.map((t, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1 pr-2">{t.ok ? "✅" : "❌"}</td>
                    <td className="pr-2 font-mono text-xs">{t.file}</td>
                    <td className="pr-2">{t.name}</td>
                    <td className="pr-2 text-xs text-muted-foreground">{t.ms} ms</td>
                    <td className="text-xs text-destructive">{t.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>
        <TabsContent value="libs" className="space-y-3">
          <p className="text-sm text-muted-foreground">Las librerías se descargan con <code>mip</code> directamente en la placa, que necesita conectarse a tu Wi-Fi de 2,4 GHz.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="Red Wi-Fi (2,4 GHz)" aria-label="Red Wi-Fi" />
            <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Clave del Wi-Fi" aria-label="Clave del Wi-Fi" />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {LIBS.map((l) => (
              <li key={l.name} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span><span className="font-mono">{l.name}</span><br /><span className="text-xs text-muted-foreground">{l.desc}</span></span>
                <Button size="sm" variant="outline" disabled={dis} onClick={() => installLib(l.name)}>Instalar</Button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
