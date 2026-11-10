// Browser-only: installs MicroPython + the Bio Tokens program on an ESP32
// over Web Serial (no Arduino IDE). esptool-js is loaded dynamically.

export type ProvConfig = {
  ssid: string; pass: string; url: string; device: string; key: string; metric: string; unit: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SerialPort = any;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type BoardId = "esp32" | "esp32s2" | "esp32s3" | "esp32c3";
export type BoardProfile = {
  id: BoardId; label: string; chipMatch: RegExp; firmware: string; address: number; adcPin: number; nativeUsb: boolean; note: string;
};

// Perfiles compatibles: binario oficial de MicroPython v1.28.0, dirección de grabado y pin ADC del sensor.
export const BOARD_PROFILES: Record<BoardId, BoardProfile> = {
  esp32: { id: "esp32", label: "ESP32 clásico (Xtensa LX6)", chipMatch: /^ESP32(?![-\s]?(S2|S3|C3|C6|H2|P4)\b)/, firmware: "/firmware/micropython-esp32.bin", address: 0x1000, adcPin: 34, nativeUsb: false, note: "Sensor en GPIO34." },
  esp32s2: { id: "esp32s2", label: "ESP32-S2 (USB nativo)", chipMatch: /ESP32-S2/, firmware: "/firmware/micropython-esp32-s2.bin", address: 0x1000, adcPin: 1, nativeUsb: true, note: "Sensor en GPIO1." },
  esp32s3: { id: "esp32s3", label: "ESP32-S3 (Xtensa LX7)", chipMatch: /ESP32-S3/, firmware: "/firmware/micropython-esp32-s3.bin", address: 0x0, adcPin: 1, nativeUsb: true, note: "Sensor en GPIO1." },
  esp32c3: { id: "esp32c3", label: "ESP32-C3 (RISC-V)", chipMatch: /ESP32-C3/, firmware: "/firmware/micropython-esp32-c3.bin", address: 0x0, adcPin: 2, nativeUsb: true, note: "Sensor en GPIO2." },
};

export function detectProfile(chip: string): BoardProfile | null {
  return Object.values(BOARD_PROFILES).find((p) => p.chipMatch.test(chip)) ?? null;
}

export function buildMainPy(c: ProvConfig, adcPin = 34): string {
  const s = (v: string) => JSON.stringify(v);
  return `# Bio Tokens - programa MicroPython para ESP32 (sin Arduino)
import network, time, machine, ujson
try:
    import urequests as requests
except ImportError:
    import requests
SSID=${s(c.ssid)}
PASS=${s(c.pass)}
URL=${s(c.url)}
DEVICE=${s(c.device)}
KEY=${s(c.key)}
METRIC=${s(c.metric)}
UNIT=${s(c.unit)}
INTERVAL=60
adc=machine.ADC(machine.Pin(${adcPin}))
adc.atten(machine.ADC.ATTN_11DB)
wlan=network.WLAN(network.STA_IF)
wlan.active(True)
def connect():
    if wlan.isconnected(): return True
    wlan.connect(SSID,PASS)
    for _ in range(40):
        if wlan.isconnected(): break
        time.sleep(0.5)
    print('Wi-Fi:', 'OK' if wlan.isconnected() else 'FALLO')
    return wlan.isconnected()
def read():
    return round(100-(adc.read()/4095)*100,2)
print('BIOTOKENS-ESP32 MICROPYTHON LISTO')
while True:
    try:
        if connect():
            body=ujson.dumps({'metric':METRIC,'value':read(),'unit':UNIT})
            r=requests.post(URL,data=body,headers={'Content-Type':'application/json','X-Device-Id':DEVICE,'X-Api-Key':KEY})
            print('POST', r.status_code, r.text)
            r.close()
    except Exception as e:
        print('Error:', e)
    time.sleep(INTERVAL)
`;
}

export async function flashMicroPython(
  port: SerialPort, log: (s: string) => void, progress: (p: number) => void, wanted: BoardId | "auto" = "auto",
): Promise<BoardProfile> {
  const { ESPLoader, Transport } = await import("esptool-js");
  const transport = new Transport(port, false);
  const loader = new ESPLoader({
    transport,
    baudrate: 460800,
    terminal: { clean() {}, writeLine: (d: string) => log(d), write: () => {} },
  });
  try {
    const chip = await loader.main();
    log(`Chip detectado: ${chip}`);
    const profile = detectProfile(chip);
    if (!profile) throw new Error(`Modelo no compatible: ${chip}. Compatibles: ESP32, S2, S3 y C3.`);
    if (wanted !== "auto" && wanted !== profile.id) {
      throw new Error(`Elegiste ${BOARD_PROFILES[wanted].label}, pero la placa es ${profile.label}.`);
    }
    log(`Perfil: ${profile.label}. Descargando MicroPython oficial…`);
    const bin = new Uint8Array(await (await fetch(profile.firmware)).arrayBuffer());
    await loader.writeFlash({
      fileArray: [{ data: bin, address: profile.address }],
      flashMode: "keep", flashFreq: "keep", flashSize: "keep",
      eraseAll: true, compress: true,
      reportProgress: (_i: number, written: number, total: number) => progress(Math.round((written / total) * 100)),
    } as any);
    log("MicroPython grabado. Reiniciando placa…");
    await loader.after();
    return profile;
  } finally {
    await transport.disconnect().catch(() => {});
  }
}

// Detecta el modelo de la placa sin grabar nada (para "solo actualizar programa").
export async function detectBoard(port: SerialPort, log: (s: string) => void): Promise<BoardProfile> {
  const { ESPLoader, Transport } = await import("esptool-js");
  const transport = new Transport(port, false);
  const loader = new ESPLoader({
    transport,
    baudrate: 460800,
    terminal: { clean() {}, writeLine: (d: string) => log(d), write: () => {} },
  });
  try {
    const chip = await loader.main();
    log(`Chip detectado: ${chip}`);
    const profile = detectProfile(chip);
    if (!profile) throw new Error(`Modelo no compatible: ${chip}. Compatibles: ESP32, S2, S3 y C3.`);
    return profile;
  } finally {
    await transport.disconnect().catch(() => {});
  }
}

export async function uploadProgram(port: SerialPort, code: string, log: (s: string) => void) {
  await port.open({ baudRate: 115200 });
  const writer = port.writable!.getWriter();
  const reader = port.readable!.getReader();
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let out = "";
  let active = true;
  const pump = (async () => {
    while (active) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) break;
      if (value) out += dec.decode(value);
    }
  })();
  const send = async (s: string) => { await writer.write(enc.encode(s)); await sleep(30); };
  try {
    // Liberar las líneas de reinicio (si DTR/RTS quedan activas la placa
    // se queda en reset o en modo descarga) y hacer un reinicio limpio.
    try {
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await sleep(100);
      await port.setSignals({ dataTerminalReady: false, requestToSend: true }); // EN bajo
      await sleep(120);
      await port.setSignals({ dataTerminalReady: false, requestToSend: false }); // arranque normal
    } catch { /* algunos adaptadores no admiten señales */ }
    log("Esperando a que MicroPython arranque (el primer arranque crea el sistema de archivos y puede tardar)…");
    await sleep(1500);
    // Reintentar hasta 30 s: el primer arranque tras borrar la placa tarda más.
    const until = Date.now() + 30000;
    let ok = false;
    let tries = 0;
    while (Date.now() < until) {
      tries++;
      await send("\r\x03\x03"); // interrumpir cualquier programa
      await sleep(250);
      await send("\x01"); // raw REPL
      const t = Date.now() + 900;
      while (Date.now() < t && !out.includes("raw REPL")) await sleep(50);
      if (out.includes("raw REPL")) { ok = true; break; }
      if (tries % 5 === 0) log(`Aún esperando respuesta de la placa… (${Math.round((until - Date.now()) / 1000)} s)`);
    }
    if (!ok) {
      const tail = out.replace(/[^\x20-\x7e\n]/g, "").trim().slice(-200);
      if (tail) log(`Salida de la placa: ${tail}`);
      throw new Error(
        "La placa no respondió. Pulsa una vez el botón EN/RST de la placa y luego «Solo actualizar programa y credenciales».",
      );
    }
    log("MicroPython respondió. Subiendo programa main.py…");
    const lines = ["f=open('main.py','w')"];
    for (let i = 0; i < code.length; i += 200) lines.push(`f.write(${JSON.stringify(code.slice(i, i + 200))})`);
    lines.push("f.close()", "print('UPLOAD OK')");
    for (const l of lines) {
      for (let i = 0; i < l.length; i += 128) await send(l.slice(i, i + 128));
      await send("\n");
    }
    out = "";
    await send("\x04");
    const deadline = Date.now() + 8000;
    while (!out.includes("UPLOAD OK") && Date.now() < deadline) await sleep(100);
    if (!out.includes("UPLOAD OK")) throw new Error("No se confirmó la escritura del programa.");
    log("Programa guardado. Reiniciando la placa…");
    await send("import machine\nmachine.reset()\n\x04");
    await sleep(300);
  } finally {
    active = false;
    await reader.cancel().catch(() => {});
    reader.releaseLock();
    writer.releaseLock();
    await pump;
    await port.close().catch(() => {});
  }
}

// Pide a la placa (con MicroPython) que busque redes Wi-Fi cercanas.
export type WifiNetwork = { ssid: string; rssi: number; band24: boolean };
export async function scanWifi(port: SerialPort, log: (s: string) => void): Promise<WifiNetwork[]> {
  await port.open({ baudRate: 115200 });
  const writer = port.writable!.getWriter();
  const reader = port.readable!.getReader();
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let out = "";
  let active = true;
  const pump = (async () => {
    while (active) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) break;
      if (value) out += dec.decode(value);
    }
  })();
  const send = async (s: string) => { await writer.write(enc.encode(s)); await sleep(30); };
  try {
    const until = Date.now() + 15000;
    let ok = false;
    while (Date.now() < until) {
      await send("\r\x03\x03");
      await sleep(250);
      await send("\x01");
      const t = Date.now() + 900;
      while (Date.now() < t && !out.includes("raw REPL")) await sleep(50);
      if (out.includes("raw REPL")) { ok = true; break; }
    }
    if (!ok) throw new Error("La placa no respondió. Instala primero MicroPython («Descargar e instalar en la placa») y pulsa EN/RST.");
    log("Buscando redes Wi-Fi con la placa…");
    out = "";
    await send("import network,ujson\nw=network.WLAN(network.STA_IF)\nw.active(True)\nprint('SCAN:'+ujson.dumps([[n[0].decode('utf-8','ignore'),n[3],n[2]] for n in w.scan()]))\n\x04");
    const deadline = Date.now() + 15000;
    let m: RegExpMatchArray | null = null;
    while (Date.now() < deadline && !(m = out.match(/SCAN:(\[.*\])/))) await sleep(100);
    if (!m) throw new Error("La placa no devolvió redes Wi-Fi.");
    const raw = JSON.parse(m[1]) as [string, number, number][];
    const best = new Map<string, WifiNetwork>();
    for (const [ssid, rssi, ch] of raw) {
      if (!ssid) continue;
      const prev = best.get(ssid);
      if (!prev || rssi > prev.rssi) best.set(ssid, { ssid, rssi, band24: ch >= 1 && ch <= 14 });
    }
    await send("\x02"); // salir del raw REPL
    return [...best.values()].sort((a, b) => b.rssi - a.rssi);
  } finally {
    active = false;
    await reader.cancel().catch(() => {});
    reader.releaseLock();
    writer.releaseLock();
    await pump;
    await port.close().catch(() => {});
  }
}

// Escribe credenciales en un main.py existente (conserva el resto del código del IDE).
export function applyCredentials(
  src: string,
  c: Partial<{ ssid: string; pass: string; device: string; key: string; adcPin: number }>,
): string {
  let out = src;
  const set = (name: string, v: string | undefined) => {
    if (v === undefined) return;
    const re = new RegExp(`^${name}\\s*=.*$`, "m");
    const line = `${name}=${JSON.stringify(v)}`;
    out = re.test(out) ? out.replace(re, () => line) : `${line}\n${out}`;
  };
  set("SSID", c.ssid); set("PASS", c.pass); set("DEVICE", c.device); set("KEY", c.key);
  if (c.adcPin !== undefined) out = out.replace(/machine\.ADC\(machine\.Pin\(\d+\)\)/, `machine.ADC(machine.Pin(${c.adcPin}))`);
  return out;
}
