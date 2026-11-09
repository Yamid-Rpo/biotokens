// Shared, browser-only snapshot of the embedded IDE per project.
// The IDE workspace is the single source of truth for the panel tabs.
import { useSyncExternalStore } from "react";

export type IdeProblem = { file: string; line: number | null; msg: string };
export type IdeTest = { file: string; name: string; ok: boolean; ms: number; error?: string };

export type IdeConfig = {
  device: string | null;
  metric: string | null;
  unit: string | null;
  url: string | null;
  interval: number | null;
  pin: number | null;
  ssid: string | null;
  hasKey: boolean;
};

export type IdeSnapshot = {
  files: Record<string, string>;
  connected: boolean;
  problems: IdeProblem[];
  tests: IdeTest[];
  boardFiles: { path: string; size: number }[];
  compiledAt: string | null;
  uploadedAt: string | null;
  testedAt: string | null;
};

const EMPTY: IdeSnapshot = {
  files: {}, connected: false, problems: [], tests: [], boardFiles: [],
  compiledAt: null, uploadedAt: null, testedAt: null,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDERS = new Set(["", "PEGAR_DEVICE_ID", "PEGAR_API_KEY", "TU_WIFI", "TU_CLAVE"]);

function str(src: string, name: string): string | null {
  const m = src.match(new RegExp(`^\\s*${name}\\s*=\\s*(["'])(.*?)\\1`, "m"));
  if (!m) return null;
  return PLACEHOLDERS.has(m[2]) ? null : m[2];
}
function num(src: string, re: RegExp): number | null {
  const m = src.match(re);
  return m ? Number(m[1]) : null;
}

/** Reads the firmware variables from the IDE's main.py. */
export function parseIdeConfig(mainPy: string): IdeConfig {
  const device = str(mainPy, "DEVICE");
  return {
    device: device && UUID.test(device) ? device.toLowerCase() : null,
    metric: str(mainPy, "METRIC"),
    unit: str(mainPy, "UNIT"),
    url: str(mainPy, "URL"),
    interval: num(mainPy, /^\s*INTERVAL\s*=\s*(\d+)/m),
    pin: num(mainPy, /machine\.Pin\(\s*(\d+)/),
    ssid: str(mainPy, "SSID"),
    hasKey: !!str(mainPy, "KEY"),
  };
}

const state = new Map<string, IdeSnapshot>();
const listeners = new Set<() => void>();
const storeKey = (id: string) => `bt-ide-${id}`;
const metaKey = (id: string) => `bt-ide-meta-${id}`;

function load(projectId: string): IdeSnapshot {
  const cached = state.get(projectId);
  if (cached) return cached;
  let snap = EMPTY;
  if (typeof window !== "undefined") {
    try {
      const files = JSON.parse(localStorage.getItem(storeKey(projectId)) ?? "{}");
      const meta = JSON.parse(localStorage.getItem(metaKey(projectId)) ?? "{}");
      snap = { ...EMPTY, ...meta, files, connected: false };
    } catch { /* ignore */ }
  }
  state.set(projectId, snap);
  return snap;
}

export const readIde = load;

export function updateIde(projectId: string, patch: Partial<IdeSnapshot>) {
  const next = { ...load(projectId), ...patch };
  state.set(projectId, next);
  if (typeof window !== "undefined") {
    const { files, connected: _c, ...meta } = next;
    localStorage.setItem(storeKey(projectId), JSON.stringify(files));
    localStorage.setItem(metaKey(projectId), JSON.stringify(meta));
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useIdeSnapshot(projectId: string): IdeSnapshot {
  return useSyncExternalStore(subscribe, () => load(projectId), () => EMPTY);
}

export async function firmwareHash(files: Record<string, string>): Promise<string> {
  const text = JSON.stringify(Object.keys(files).sort().map((k) => [k, files[k]]));
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
