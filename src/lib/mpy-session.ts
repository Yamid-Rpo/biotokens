// Browser-only persistent MicroPython serial session (Web Serial + raw REPL).
// Used by the embedded IDE: run code, check syntax with the board's own
// compiler, manage files, install libraries with mip and run tests.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SerialPort = any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ExecResult = { out: string; err: string };

export class MpySession {
  private port: SerialPort;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buf = "";
  private active = false;
  private pump: Promise<void> | null = null;
  private busy = false;
  private enc = new TextEncoder();
  private dec = new TextDecoder();
  /** Live console sink (everything the board prints outside managed exec). */
  onData: (s: string) => void = () => {};
  private capturing = false;

  constructor(port: SerialPort) { this.port = port; }

  static async request(): Promise<MpySession> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serial = (navigator as any).serial;
    if (!serial) throw new Error("Tu navegador no admite Web Serial. Usa Chrome o Edge en computador.");
    const port = await serial.requestPort();
    const s = new MpySession(port);
    await s.open();
    return s;
  }

  async open() {
    await this.port.open({ baudRate: 115200 });
    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();
    this.active = true;
    this.pump = (async () => {
      while (this.active && this.reader) {
        const { value, done } = await this.reader.read().catch(() => ({ value: undefined, done: true }));
        if (done) break;
        if (value) {
          const t = this.dec.decode(value, { stream: true });
          this.buf += t;
          if (!this.capturing) this.onData(t);
        }
      }
    })();
  }

  async close() {
    this.active = false;
    await this.reader?.cancel().catch(() => {});
    this.reader?.releaseLock();
    this.writer?.releaseLock();
    await this.pump;
    await this.port.close().catch(() => {});
  }

  async write(s: string) {
    if (!this.writer) throw new Error("Placa no conectada.");
    await this.writer.write(this.enc.encode(s));
  }

  /** Ctrl-C: stops the running program. */
  async interrupt() { await this.write("\r\x03\x03"); }

  /** Soft reset (Ctrl-D in friendly REPL): restarts and runs main.py. */
  async softReset() { await this.write("\x02\r\x03\x03\x04"); }

  async hardReset() {
    try {
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await sleep(120);
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    } catch { await this.softReset(); }
  }

  private async waitFor(pred: () => boolean, ms: number) {
    const end = Date.now() + ms;
    while (!pred()) { if (Date.now() > end) return false; await sleep(30); }
    return true;
  }

  private async enterRaw() {
    for (let i = 0; i < 10; i++) {
      this.buf = "";
      await this.write("\r\x03\x03");
      await sleep(150);
      this.buf = "";
      await this.write("\x01");
      if (await this.waitFor(() => this.buf.includes("raw REPL; CTRL-B to exit\r\n>"), 1000)) return;
    }
    throw new Error("La placa no respondió. Instala MicroPython («Descargar e instalar en la placa») y pulsa EN/RST.");
  }

  /** Execute code in raw REPL and return stdout/stderr. */
  async exec(code: string, timeoutMs = 20000, stream?: (s: string) => void): Promise<ExecResult> {
    if (this.busy) throw new Error("La placa está ocupada con otra tarea.");
    this.busy = true;
    this.capturing = true;
    try {
      await this.enterRaw();
      this.buf = "";
      const data = this.enc.encode(code);
      for (let i = 0; i < data.length; i += 256) {
        await this.writer!.write(data.slice(i, i + 256));
        await sleep(10);
      }
      await this.write("\x04");
      if (!(await this.waitFor(() => this.buf.startsWith("OK") || this.buf.includes("OK"), 3000))) {
        throw new Error("La placa no aceptó el código.");
      }
      let sent = 0;
      const done = await this.waitFor(() => {
        if (stream) {
          const start = this.buf.indexOf("OK") + 2;
          const end = this.buf.indexOf("\x04", start);
          const chunk = this.buf.slice(start + sent, end < 0 ? undefined : end);
          if (chunk) { stream(chunk); sent += chunk.length; }
        }
        return (this.buf.match(/\x04/g) ?? []).length >= 2;
      }, timeoutMs);
      if (!done) {
        await this.interrupt();
        throw new Error("Tiempo de espera agotado (el programa sigue en ejecución y se detuvo).");
      }
      const body = this.buf.slice(this.buf.indexOf("OK") + 2);
      const [out, err] = body.split("\x04");
      return { out: out ?? "", err: err ?? "" };
    } finally {
      await this.write("\x02").catch(() => {});
      await sleep(50);
      this.capturing = false;
      this.busy = false;
    }
  }

  async listFiles(): Promise<{ path: string; size: number }[]> {
    const r = await this.exec(
      "import os,ujson\ndef w(d):\n r=[]\n for e in os.ilistdir(d):\n  p=(d.rstrip('/')+'/'+e[0])\n  if e[1]==0x4000: r+=w(p)\n  else: r.append([p,e[3] if len(e)>3 else 0])\n return r\nprint(ujson.dumps(w('/')))",
    );
    if (r.err) throw new Error(r.err.trim());
    return (JSON.parse(r.out.trim()) as [string, number][]).map(([path, size]) => ({ path, size }));
  }

  async readFile(path: string): Promise<string> {
    const r = await this.exec(`import ubinascii\nf=open(${JSON.stringify(path)},'rb')\nprint(ubinascii.b2a_base64(f.read()).decode())\nf.close()`);
    if (r.err) throw new Error(r.err.trim());
    const bin = atob(r.out.replace(/\s/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }

  async writeFile(path: string, content: string) {
    const bytes = new TextEncoder().encode(content);
    let b64 = "";
    for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);
    b64 = btoa(b64);
    const dirs = path.split("/").slice(1, -1);
    const lines = ["import os,ubinascii"];
    let acc = "";
    for (const d of dirs) { acc += "/" + d; lines.push(`try:\n os.mkdir(${JSON.stringify(acc)})\nexcept OSError:\n pass`); }
    lines.push(`f=open(${JSON.stringify(path)},'wb')`);
    for (let i = 0; i < b64.length; i += 512) lines.push(`f.write(ubinascii.a2b_base64(${JSON.stringify(b64.slice(i, i + 512))}))`);
    lines.push("f.close()", "print('W OK')");
    const r = await this.exec(lines.join("\n"), 30000);
    if (r.err || !r.out.includes("W OK")) throw new Error(r.err.trim() || "No se confirmó la escritura.");
  }

  async removeFile(path: string) {
    const r = await this.exec(`import os\nos.remove(${JSON.stringify(path)})`);
    if (r.err) throw new Error(r.err.trim());
  }

  /** Syntax check using the board's real MicroPython compiler (no execution). */
  async check(path: string, src: string): Promise<string | null> {
    const r = await this.exec(`compile(${JSON.stringify(src)},${JSON.stringify(path)},'exec')\nprint('SYNTAX OK')`);
    if (r.out.includes("SYNTAX OK")) return null;
    return r.err.trim() || "Error desconocido";
  }

  /** Install a library with mip (connects Wi-Fi first). */
  async installLib(name: string, ssid: string, pass: string, log: (s: string) => void) {
    const code = `import network,time
w=network.WLAN(network.STA_IF)
w.active(True)
if not w.isconnected():
    w.connect(${JSON.stringify(ssid)},${JSON.stringify(pass)})
    for _ in range(40):
        if w.isconnected(): break
        time.sleep(0.5)
if not w.isconnected():
    raise OSError('Wi-Fi no conectado')
import mip
mip.install(${JSON.stringify(name)})
print('MIP OK')`;
    const r = await this.exec(code, 90000, log);
    if (!r.out.includes("MIP OK")) throw new Error(r.err.trim() || "No se pudo instalar la librería.");
  }
}

/** Board-side test runner: runs every test_* function, prints a JSON report. */
export function buildTestRunner(files: { path: string; src: string }[]): string {
  const parts = files.map((f) => `_run(${JSON.stringify(f.path)}, ${JSON.stringify(f.src)})`);
  return `import ujson,time
_R=[]
def _run(path, src):
    g={'__name__':'__test__'}
    try:
        exec(src, g)
    except Exception as e:
        _R.append([path,'<carga>',False,repr(e),0]); return
    for k in sorted(g):
        if k.startswith('test_') and callable(g[k]):
            t=time.ticks_ms()
            try:
                g[k](); _R.append([path,k,True,'',time.ticks_diff(time.ticks_ms(),t)])
            except Exception as e:
                _R.append([path,k,False,repr(e),time.ticks_diff(time.ticks_ms(),t)])
${parts.join("\n")}
print('TESTS:'+ujson.dumps(_R))`;
}

export type TestResult = { file: string; name: string; ok: boolean; error: string; ms: number };
export function parseTestReport(out: string): TestResult[] {
  const m = out.match(/TESTS:(\[.*\])/);
  if (!m) return [];
  return (JSON.parse(m[1]) as [string, string, boolean, string, number][]).map(([file, name, ok, error, ms]) => ({ file, name, ok, error, ms }));
}

/** Extract "line N" from a MicroPython traceback for the given file. */
export function errorLine(err: string, path: string): number | null {
  const re = new RegExp(`File "${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}", line (\\d+)`, "g");
  let last: number | null = null;
  for (const m of err.matchAll(re)) last = Number(m[1]);
  return last;
}
