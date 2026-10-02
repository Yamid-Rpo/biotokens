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
  esp32: { id: "esp32", label: "ESP32 clásico (Xtensa LX6)", chipMatch: /^ESP32(?!-)/, firmware: "/firmware/micropython-esp32.bin", address: 0x1000, adcPin: 34, nativeUsb: false, note: "Sensor en GPIO34." },
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
    await sleep(2500); // arranque de MicroPython
    await send("\r\x03\x03");
    await sleep(300);
    await send("\x01"); // raw REPL
    await sleep(300);
    if (!out.includes("raw REPL")) throw new Error("La placa no respondió. ¿Está MicroPython instalado?");
    log("Subiendo programa main.py…");
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
